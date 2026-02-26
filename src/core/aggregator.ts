import { IQuotaProvider, quota_snapshot } from '../utils/types';

export class QuotaAggregator {
    private providers: IQuotaProvider[] = [];
    private snapshots: Map<string, quota_snapshot> = new Map();

    private update_callback?: (snapshot_map: Map<string, quota_snapshot>) => void;
    private error_callback?: (provider_name: string, error: Error) => void;

    constructor() { }

    addProvider(provider: IQuotaProvider) {
        this.providers.push(provider);

        provider.on_update((snapshot) => {
            this.snapshots.set(provider.provider_name, snapshot);
            if (this.update_callback) {
                this.update_callback(this.snapshots);
            }
        });

        provider.on_error((error) => {
            if (this.error_callback) {
                this.error_callback(provider.provider_name, error);
            }
        });
    }

    startAll(interval_ms: number) {
        for (const p of this.providers) {
            p.start_polling(interval_ms);
        }
    }

    stopAll() {
        for (const p of this.providers) {
            p.stop_polling();
        }
    }

    on_update(callback: (snapshot_map: Map<string, quota_snapshot>) => void) {
        this.update_callback = callback;
    }

    on_error(callback: (provider_name: string, error: Error) => void) {
        this.error_callback = callback;
    }

    forceRefreshAll() {
        for (const p of this.providers) {
            p.fetch_quota();
        }
    }
}
