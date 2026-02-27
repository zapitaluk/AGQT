/**
 * System Tray Manager
 */

import SysTray, { MenuItem, ClickEvent } from 'systray2';
import notifier from 'node-notifier';
import { exec } from 'child_process';
import { quota_snapshot } from './utils/types';
import { ConfigManager } from './config';
import * as fs from 'fs';
import * as path from 'path';

function resolveIconPath(filename: string): string | null {
	const candidates = [
		path.join(path.dirname(process.execPath), 'assets', filename),
		path.join(__dirname, '..', 'assets', filename),
	];

	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}

	return null;
}

function loadIcon(filename: string): string {
	const iconPath = resolveIconPath(filename);
	if (iconPath) {
		return fs.readFileSync(iconPath).toString('base64');
	}
	console.warn(`Icon file not found: ${filename}`);
	return '';
}

const ICON_GREEN = loadIcon('icon-green.ico');
const ICON_YELLOW = loadIcon('icon-yellow.ico');
const ICON_RED = loadIcon('icon-red.ico');

type TrayStatus = 'green' | 'yellow' | 'red' | 'gray';

interface MenuItemWithAction extends MenuItem {
	action?: () => void;
}

export class TrayManager {
	private tray: SysTray | null = null;
	private config: ConfigManager;
	private lastSnapshots: Map<string, quota_snapshot> = new Map();
	private notifiedModels: Set<string> = new Set();
	private onRefresh?: () => void;
	private menuItems: MenuItemWithAction[] = [];
	private updateDebounceTimer?: NodeJS.Timeout;
	private isUpdating: boolean = false;

	constructor(config: ConfigManager) {
		this.config = config;
	}

	async start(onRefresh: () => void) {
		this.onRefresh = onRefresh;
		await this.createTray('gray', new Map());
		console.log('System tray initialized');
	}

	private async createTray(status: TrayStatus, snapshots: Map<string, quota_snapshot>) {
		const menu = this.buildMenu(status, snapshots);

		this.tray = new SysTray({
			menu: {
				icon: this.getIcon(status),
				title: '',
				tooltip: menu.tooltip,
				items: menu.items
			},
			debug: false,
			copyDir: true,
		});

		await this.tray.ready();

		this.tray.onClick((action: ClickEvent) => {
			const item = this.menuItems[action.seq_id];
			if (item && item.action) {
				item.action();
			}
		});
	}

	private getStatusText(pct: number): string {
		if (pct === 0) return '[OUT]';
		if (pct < this.config.lowQuotaThreshold) return '[LOW]';
		return '';
	}

	private buildMenu(status: TrayStatus, snapshots: Map<string, quota_snapshot>): { tooltip: string; items: MenuItem[] } {
		this.menuItems = [];

		if (snapshots.size > 0) {
			// Aggregate UI from all Providers
			for (const [providerName, snapshot] of snapshots.entries()) {

				this.menuItems.push({
					title: `[${providerName}]`,
					tooltip: `Quota from ${providerName}`,
					enabled: false
				});

				if (snapshot.models.length === 0 && !snapshot.prompt_credits) {
					const isAg = providerName === 'Google Antigravity';
					this.menuItems.push({
						title: isAg ? `  Waiting for data...` : `  Not Configured (Add API Key)`,
						tooltip: isAg ? '' : 'Click "Open Config (API Keys)" below.',
						enabled: false
					});
				} else {
					for (const model of snapshot.models) {
						const pct = model.remaining_percentage ?? 100;
						const bar = this.buildProgressBar(pct);
						const isPinned = this.config.pinnedModels.includes(model.model_id);
						const statusText = this.getStatusText(pct);

						const item: MenuItemWithAction = {
							title: `${isPinned ? '* ' : '  '}${model.label}  ${bar}  ${pct.toFixed(0)}%${statusText ? ' ' + statusText : ''}`,
							tooltip: `Reset: ${model.time_until_reset_formatted}. Click to ${isPinned ? 'unpin' : 'pin'}.`,
							enabled: true,
							action: () => {
								const pinned = this.config.pinnedModels;
								if (pinned.includes(model.model_id)) {
									this.config.setPinnedModels(pinned.filter(m => m !== model.model_id));
								} else {
									this.config.setPinnedModels([...pinned, model.model_id]);
								}
								if (this.lastSnapshots.size > 0) {
									this.update(this.lastSnapshots);
								}
							}
						};
						this.menuItems.push(item);
					}
				}

				if (snapshot.prompt_credits) {
					const pc = snapshot.prompt_credits;
					const creditStatus = this.getStatusText(pc.remaining_percentage);
					this.menuItems.push({
						title: `  Credits: ${pc.available.toLocaleString()} / ${pc.monthly.toLocaleString()} (${pc.remaining_percentage.toFixed(0)}%)${creditStatus ? ' ' + creditStatus : ''}`,
						tooltip: `${pc.remaining_percentage.toFixed(1)}% remaining`,
						enabled: false
					});
				}

				this.menuItems.push({
					title: '-'.repeat(35),
					tooltip: '',
					enabled: false
				});
			}

		} else {
			this.menuItems.push({
				title: 'Waiting for provider data...',
				tooltip: 'Connecting to Providers',
				enabled: false
			});
			this.menuItems.push({
				title: '-'.repeat(35),
				tooltip: '',
				enabled: false
			});
		}

		// Action items
		this.menuItems.push({
			title: 'Refresh All Now',
			tooltip: 'Fetch latest quota data from all providers',
			enabled: true,
			action: () => {
				if (this.onRefresh) this.onRefresh();
			}
		});

		this.menuItems.push({
			title: 'Open Config (API Keys)',
			tooltip: 'Edit config.json to add or change Provider API Keys',
			enabled: true,
			action: () => {
				const configPath = this.config.getConfigPath();
				if (process.platform === 'win32') {
					exec(`notepad "${configPath}"`);
				} else if (process.platform === 'darwin') {
					exec(`open "${configPath}"`);
				} else {
					exec(`xdg-open "${configPath}"`);
				}
			}
		});

		this.menuItems.push({
			title: 'Exit',
			tooltip: 'Close the application',
			enabled: true,
			action: () => {
				this.stop();
				process.exit(0);
			}
		});

		let tooltip = 'Antigravity Quota';
		// Aggregate tooltip for all pinned models globally
		if (snapshots.size > 0 && this.config.pinnedModels.length > 0) {
			const allPinnedLabels: string[] = [];

			for (const [_, snap] of snapshots.entries()) {
				const pinnedInfo = snap.models
					.filter(m => this.config.pinnedModels.includes(m.model_id))
					.map(m => `${m.label}: ${(m.remaining_percentage ?? 100).toFixed(0)}%`);
				allPinnedLabels.push(...pinnedInfo);
			}

			if (allPinnedLabels.length > 0) {
				tooltip = allPinnedLabels.join(' | ');
			}
		}

		return {
			tooltip: tooltip.substring(0, 127), // Tray tooltips have max char limits on Windows usually ~128
			items: this.menuItems.map(({ action, ...item }) => item)
		};
	}

	private getIcon(status: TrayStatus): string {
		switch (status) {
			case 'green': return ICON_GREEN;
			case 'yellow': return ICON_YELLOW;
			case 'red': return ICON_RED;
			default: return ICON_GREEN;
		}
	}

	private buildProgressBar(percentage: number): string {
		const filled = Math.round(percentage / 10);
		const empty = 10 - filled;
		return '\u2593'.repeat(filled) + '\u2591'.repeat(empty);
	}

	private getStatus(snapshots: Map<string, quota_snapshot>): TrayStatus {
		if (snapshots.size === 0) return 'gray';

		const allModels = Array.from(snapshots.values()).flatMap(s => s.models);
		const pinnedModels = this.config.pinnedModels;
		const relevantModels = pinnedModels.length > 0
			? allModels.filter(m => pinnedModels.includes(m.model_id))
			: allModels;

		let minPct = relevantModels.length > 0
			? Math.min(...relevantModels.map(m => m.remaining_percentage ?? 100))
			: 100;

		for (const snap of snapshots.values()) {
			if (snap.prompt_credits) {
				minPct = Math.min(minPct, snap.prompt_credits.remaining_percentage);
			}
		}

		if (minPct === 0) return 'red';
		if (minPct < this.config.lowQuotaThreshold) return 'yellow';
		return 'green';
	}

	async update(snapshots: Map<string, quota_snapshot>) {
		this.lastSnapshots = snapshots;

		// Debounce rapid-fire updates (e.g. multiple providers firing within ms of each other)
		// to prevent spawning multiple tray_darwin_release processes
		if (this.updateDebounceTimer) {
			clearTimeout(this.updateDebounceTimer);
		}

		this.updateDebounceTimer = setTimeout(() => {
			this._doUpdate();
		}, 200);
	}

	private async _doUpdate() {
		if (this.isUpdating) return;
		this.isUpdating = true;

		try {
			const snapshots = this.lastSnapshots;
			const status = this.getStatus(snapshots);

			if (this.tray) {
				await this.tray.kill(false);
				this.tray = null;
			}

			await this.createTray(status, snapshots);

			if (this.config.showNotifications) {
				this.checkAndNotify(snapshots);
			}
		} finally {
			this.isUpdating = false;
		}
	}

	private checkAndNotify(snapshots: Map<string, quota_snapshot>) {
		const threshold = this.config.lowQuotaThreshold;
		const currentKeys = new Set<string>();

		for (const [provider, snapshot] of snapshots.entries()) {
			for (const model of snapshot.models) {
				const pct = model.remaining_percentage ?? 100;
				const key = `${model.model_id}-${model.reset_time.getTime()}`;
				currentKeys.add(key);

				if (this.notifiedModels.has(key)) {
					continue;
				}

				if (model.is_exhausted) {
					this.notify(`${provider} Exhausted`, `${model.label} quota depleted. Resets in ${model.time_until_reset_formatted}`);
					this.notifiedModels.add(key);
				} else if (pct < threshold) {
					this.notify(`${provider} Low Quota`, `${model.label} only ${pct.toFixed(0)}% remaining. Resets in ${model.time_until_reset_formatted}`);
					this.notifiedModels.add(key);
				}
			}
		}

		// Clean up old notification keys
		for (const key of this.notifiedModels) {
			if (!currentKeys.has(key)) {
				this.notifiedModels.delete(key);
			}
		}
	}

	private notify(title: string, message: string) {
		notifier.notify({
			title,
			message,
			sound: false,
			wait: false
		});
	}

	async stop() {
		if (this.tray) {
			await this.tray.kill(false);
			this.tray = null;
		}
	}
}
