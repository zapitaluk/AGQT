import * as https from 'https';
import { IQuotaProvider, quota_snapshot, model_quota_info } from '../../utils/types';
import { ConfigManager } from '../../config';

export class AnthropicProvider implements IQuotaProvider {
    readonly provider_name = 'Anthropic Claude';

    private config: ConfigManager;
    private update_callback?: (snapshot: quota_snapshot) => void;
    private error_callback?: (error: Error) => void;
    private polling_timer?: NodeJS.Timeout;

    constructor(config: ConfigManager) {
        this.config = config;
    }

    private request<T>(path: string): Promise<T> {
        return new Promise((resolve, reject) => {
            const apiKey = this.config.anthropicApiKey;
            if (!apiKey) {
                return reject(new Error('Anthropic API Key not configured'));
            }

            const options: https.RequestOptions = {
                hostname: 'api.anthropic.com',
                port: 443,
                path,
                method: 'GET',
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                timeout: 8000,
            };

            const req = https.request(options, res => {
                let body = '';
                res.on('data', chunk => (body += chunk));
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        let errorMessage = `Anthropic API Error: ${res.statusCode}`;
                        try {
                            const parsed = JSON.parse(body);
                            if (parsed.error && parsed.error.message) {
                                errorMessage += ` - ${parsed.error.message}`;
                            }
                        } catch {
                            // Ignored
                        }
                        return reject(new Error(errorMessage));
                    }

                    try {
                        resolve(JSON.parse(body) as T);
                    } catch {
                        reject(new Error('Invalid JSON response from Anthropic API'));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout to Anthropic API'));
            });

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

        const safeInterval = Math.max(interval_ms, 300000); // 5 mins
        this.polling_timer = setInterval(() => this.fetch_quota(), safeInterval);
    }

    stop_polling() {
        if (this.polling_timer) {
            clearInterval(this.polling_timer);
            this.polling_timer = undefined;
        }
    }

    async fetch_quota() {
        if (!this.config.anthropicApiKey) {
            if (this.update_callback) {
                this.update_callback({ timestamp: new Date(), models: [] });
            }
            return;
        }

        try {
            // Anthropic doesn't have a public billing/usage endpoint for standard keys without organization scope.
            // Similar to OpenAI, we hit a generic endpoint like models/workspaces to test authentication.
            await this.request<any>('/v1/models');

            const snapshot = this.build_pseudo_snapshot();

            if (this.update_callback) {
                this.update_callback(snapshot);
            }
        } catch (error: any) {
            console.error('Anthropic Quota fetch error:', error.message);
            if (this.error_callback) {
                this.error_callback(error);
            }
        }
    }

    private build_pseudo_snapshot(): quota_snapshot {
        const models: model_quota_info[] = [
            {
                label: 'Claude Sonnet/Opus',
                model_id: 'claude-3-anthropic',
                remaining_fraction: 1.0,
                remaining_percentage: 100,
                is_exhausted: false,
                reset_time: new Date(),
                time_until_reset: 0,
                time_until_reset_formatted: 'Pay-As-You-Go',
            }
        ];

        return {
            timestamp: new Date(),
            models,
        };
    }
}
