import * as https from 'https';
import { IQuotaProvider, quota_snapshot, model_quota_info } from '../../utils/types';
import { ConfigManager } from '../../config';

export class OpenAIProvider implements IQuotaProvider {
    readonly provider_name = 'OpenAI Codex';

    private config: ConfigManager;
    private update_callback?: (snapshot: quota_snapshot) => void;
    private error_callback?: (error: Error) => void;
    private polling_timer?: NodeJS.Timeout;

    constructor(config: ConfigManager) {
        this.config = config;
    }

    private request<T>(path: string): Promise<T> {
        return new Promise((resolve, reject) => {
            const apiKey = this.config.openaiApiKey;
            if (!apiKey) {
                return reject(new Error('OpenAI API Key not configured'));
            }

            const options: https.RequestOptions = {
                hostname: 'api.openai.com',
                port: 443,
                path,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 8000, // 8 second timeout for external API
            };

            const req = https.request(options, res => {
                let body = '';
                res.on('data', chunk => (body += chunk));
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        let errorMessage = `OpenAI API Error: ${res.statusCode}`;
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
                        reject(new Error('Invalid JSON response from OpenAI API'));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout to OpenAI API'));
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

        // For external APIs, enforce a minimum 5-minute polling interval to prevent rate limits
        const safeInterval = Math.max(interval_ms, 300000);
        this.polling_timer = setInterval(() => this.fetch_quota(), safeInterval);
    }

    stop_polling() {
        if (this.polling_timer) {
            clearInterval(this.polling_timer);
            this.polling_timer = undefined;
        }
    }

    async fetch_quota() {
        if (!this.config.openaiApiKey) {
            // Don't error, just don't poll if not configured
            return;
        }

        try {
            // OpenAI's billing/usage HTTP API is largely deprecated for user quotas. 
            // So we ping the models list endpoint just to confirm the key is valid and the API is reachable.
            // Currently, creating a real remaining percentage for standard accounts is impossible without scraping.
            // We will treat "success" as nominal 100% quota if the key checks out. 
            // If they get a 429 Insufficient Quota error when actually running their IDE, it falls back to the extension logic anyway.

            await this.request<any>('/v1/models');

            const snapshot = this.build_pseudo_snapshot();

            if (this.update_callback) {
                this.update_callback(snapshot);
            }
        } catch (error: any) {
            console.error('OpenAI Quota fetch error:', error.message);
            if (this.error_callback) {
                this.error_callback(error);
            }
        }
    }

    private build_pseudo_snapshot(): quota_snapshot {
        // Since pure API keys (unlike IDE subscriptions) are fundamentally pay-as-you-go, 
        // "Quota" is basically just "Do I have an active billing account with funds?"
        // We return a synthetic "Good" status if the API handshake succeeds.

        const models: model_quota_info[] = [
            {
                label: 'Codex / GPT-4',
                model_id: 'gpt-4-openai',
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
