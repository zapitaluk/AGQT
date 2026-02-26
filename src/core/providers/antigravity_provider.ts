import * as https from 'https';
import { IQuotaProvider, quota_snapshot, model_quota_info, prompt_credits_info, server_user_status_response } from '../../utils/types';

export class AntigravityProvider implements IQuotaProvider {
    readonly provider_name = 'Google Antigravity';

    private port: number = 0;
    private csrf_token: string = '';

    private update_callback?: (snapshot: quota_snapshot) => void;
    private error_callback?: (error: Error) => void;
    private polling_timer?: NodeJS.Timeout;

    constructor() { }

    init(port: number, csrf_token: string) {
        this.port = port;
        this.csrf_token = csrf_token;
    }

    private request<T>(path: string, body: object): Promise<T> {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(body);
            const options: https.RequestOptions = {
                hostname: '127.0.0.1',
                port: this.port,
                path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                    'Connect-Protocol-Version': '1',
                    'X-Codeium-Csrf-Token': this.csrf_token,
                },
                rejectUnauthorized: false,
                timeout: 5000,
            };

            const req = https.request(options, res => {
                let body = '';
                res.on('data', chunk => (body += chunk));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body) as T);
                    } catch {
                        reject(new Error('Invalid JSON response from Antigravity local server'));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout to Antigravity local server'));
            });

            req.write(data);
            req.end();
        });
    }

    on_update(callback: (snapshot: quota_snapshot) => void) {
        this.update_callback = callback;
    }

    on_error(callback: (error: Error) => void) {
        this.error_callback = callback;
    }

    start_polling(interval_ms: number) {
        this.stop_polling();
        this.fetch_quota();
        this.polling_timer = setInterval(() => this.fetch_quota(), interval_ms);
    }

    stop_polling() {
        if (this.polling_timer) {
            clearInterval(this.polling_timer);
            this.polling_timer = undefined;
        }
    }

    async fetch_quota() {
        if (!this.port || !this.csrf_token) {
            if (this.error_callback) this.error_callback(new Error("Provider not initialized with port/token"));
            return;
        }

        try {
            const data = await this.request<server_user_status_response>(
                '/exa.language_server_pb.LanguageServerService/GetUserStatus',
                {
                    metadata: {
                        ideName: 'antigravity',
                        extensionName: 'antigravity',
                        locale: 'en',
                    },
                }
            );

            const snapshot = this.parse_response(data);

            if (this.update_callback) {
                this.update_callback(snapshot);
            }
        } catch (error: any) {
            console.error('Antigravity Quota fetch error:', error.message);
            if (this.error_callback) {
                this.error_callback(error);
            }
        }
    }

    private parse_response(data: server_user_status_response): quota_snapshot {
        const user_status = data.userStatus;
        const plan_info = user_status.planStatus?.planInfo;
        const available_credits = user_status.planStatus?.availablePromptCredits;

        let prompt_credits: prompt_credits_info | undefined;

        if (plan_info && available_credits !== undefined) {
            const monthly = Number(plan_info.monthlyPromptCredits);
            const available = Number(available_credits);
            if (monthly > 0) {
                prompt_credits = {
                    available,
                    monthly,
                    used_percentage: ((monthly - available) / monthly) * 100,
                    remaining_percentage: (available / monthly) * 100,
                };
            }
        }

        const raw_models = user_status.cascadeModelConfigData?.clientModelConfigs || [];
        const models: model_quota_info[] = raw_models
            .filter((m: any) => m.quotaInfo || m.quota_info)
            .map((m: any) => {
                // Support both camelCase and snake_case API responses
                const quota_info = m.quotaInfo || m.quota_info;
                const reset_time_str = quota_info.resetTime || quota_info.reset_time;
                const remaining_frac = quota_info.remainingFraction ?? quota_info.remaining_fraction;
                const reset_time = new Date(reset_time_str);
                const now = new Date();
                const diff = reset_time.getTime() - now.getTime();

                return {
                    label: m.label,
                    model_id: m.modelOrAlias?.model || m.model_or_alias?.model || 'unknown',
                    remaining_fraction: remaining_frac,
                    remaining_percentage: remaining_frac !== undefined ? remaining_frac * 100 : undefined,
                    is_exhausted: remaining_frac === 0,
                    reset_time: reset_time,
                    time_until_reset: diff,
                    time_until_reset_formatted: this.format_time(diff),
                };
            });

        return {
            timestamp: new Date(),
            prompt_credits,
            models,
        };
    }

    private format_time(ms: number): string {
        if (ms <= 0) return 'Ready';
        const mins = Math.ceil(ms / 60000);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ${mins % 60}m`;
    }
}
