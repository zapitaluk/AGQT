/**
 * Antigravity Quota Tray - type definitions
 */

export interface model_config {
	label: string;
	model_or_alias: {
		model: string;
	};
	quota_info?: {
		remaining_fraction?: number;
		reset_time: string;
	};
	supports_images?: boolean;
	is_recommended?: boolean;
	allowed_tiers?: string[];
}

export interface prompt_credits_info {
	available: number;
	monthly: number;
	used_percentage: number;
	remaining_percentage: number;
}

export interface model_quota_info {
	label: string;
	model_id: string;
	remaining_fraction?: number;
	remaining_percentage?: number;
	is_exhausted: boolean;
	reset_time: Date;
	time_until_reset: number;
	time_until_reset_formatted: string;
}

export interface quota_snapshot {
	timestamp: Date;
	prompt_credits?: prompt_credits_info;
	models: model_quota_info[];
}

export interface IQuotaProvider {
	readonly provider_name: string;
	on_update(callback: (snapshot: quota_snapshot) => void): void;
	on_error(callback: (error: Error) => void): void;
	start_polling(interval_ms: number): void;
	stop_polling(): void;
	fetch_quota(): Promise<void>;
}

export enum quota_level {
	Normal = 'normal',
	Warning = 'warning',
	Critical = 'critical',
	Depleted = 'depleted',
}

export interface config_options {
	pollingInterval: number;
	pinnedModels: string[];
	lowQuotaThreshold: number;
	showNotifications: boolean;
	openaiApiKey?: string;
	anthropicApiKey?: string;
}

export interface process_info {
	extension_port: number;
	connect_port: number;
	csrf_token: string;
}

// Server Response Types
export interface server_user_status_response {
	userStatus: {
		name: string;
		email: string;
		planStatus?: {
			planInfo: {
				teamsTier: string;
				planName: string;
				monthlyPromptCredits: number;
				monthlyFlowCredits: number;
			};
			availablePromptCredits: number;
			availableFlowCredits: number;
		};
		cascadeModelConfigData?: {
			clientModelConfigs: any[];
		};
	};
}
