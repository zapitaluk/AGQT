/**
 * Config Manager - reads/writes config.json
 */

import * as fs from 'fs';
import * as path from 'path';
import {config_options} from './utils/types';

const DEFAULT_CONFIG: config_options = {
	pollingInterval: 120,
	pinnedModels: [],
	lowQuotaThreshold: 20,
	showNotifications: true,
};

export class ConfigManager {
	private config_path: string;
	private config: config_options;

	constructor() {
		// Config file is in the same directory as the executable
		this.config_path = path.join(process.cwd(), 'config.json');
		this.config = this.load();
	}

	private load(): config_options {
		try {
			if (fs.existsSync(this.config_path)) {
				const data = fs.readFileSync(this.config_path, 'utf-8');
				const parsed = JSON.parse(data);
				return {...DEFAULT_CONFIG, ...parsed};
			}
		} catch (e: any) {
			console.error(`Failed to load config: ${e.message}`);
		}
		// Create default config if not exists
		this.save(DEFAULT_CONFIG);
		return {...DEFAULT_CONFIG};
	}

	private save(config: config_options) {
		try {
			fs.writeFileSync(this.config_path, JSON.stringify(config, null, 2), 'utf-8');
		} catch (e: any) {
			console.error(`Failed to save config: ${e.message}`);
		}
	}

	get(): config_options {
		return this.config;
	}

	get pollingInterval(): number {
		return Math.max(30, this.config.pollingInterval) * 1000; // Convert to ms, min 30s
	}

	get pinnedModels(): string[] {
		return this.config.pinnedModels;
	}

	get lowQuotaThreshold(): number {
		return this.config.lowQuotaThreshold;
	}

	get showNotifications(): boolean {
		return this.config.showNotifications;
	}

	setPinnedModels(models: string[]) {
		this.config.pinnedModels = models;
		this.save(this.config);
	}

	getConfigPath(): string {
		return this.config_path;
	}

	reload() {
		this.config = this.load();
	}
}
