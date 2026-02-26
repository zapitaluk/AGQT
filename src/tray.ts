/**
 * System Tray Manager
 */

import SysTray, {MenuItem, ClickEvent} from 'systray2';
import notifier from 'node-notifier';
import {exec} from 'child_process';
import {quota_snapshot} from './utils/types';
import {ConfigManager} from './config';
import * as fs from 'fs';
import * as path from 'path';

// Load icons from files and convert to base64
function loadIcon(filename: string): string {
	const iconPath = path.join(__dirname, '..', 'assets', filename);
	if (fs.existsSync(iconPath)) {
		return fs.readFileSync(iconPath).toString('base64');
	}
	// Fallback to a minimal valid ICO if file not found
	console.warn(`Icon file not found: ${iconPath}`);
	return '';
}

const ICON_GREEN = loadIcon('icon-green.ico');
const ICON_YELLOW = loadIcon('icon-yellow.ico');
const ICON_RED = loadIcon('icon-red.ico');

type TrayStatus = 'green' | 'yellow' | 'red' | 'gray';

// Extended MenuItem with our click handler
interface MenuItemWithAction extends MenuItem {
	action?: () => void;
}

export class TrayManager {
	private tray: SysTray | null = null;
	private config: ConfigManager;
	private lastSnapshot: quota_snapshot | null = null;
	private notifiedModels: Set<string> = new Set();
	private onRefresh?: () => void;
	private menuItems: MenuItemWithAction[] = [];

	constructor(config: ConfigManager) {
		this.config = config;
	}

	async start(onRefresh: () => void) {
		this.onRefresh = onRefresh;
		await this.createTray('gray', null);
		console.log('System tray initialized');
	}

	private async createTray(status: TrayStatus, snapshot: quota_snapshot | null) {
		const menu = this.buildMenu(status, snapshot);

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
		return '';  // No indicator needed when OK
	}

	private buildMenu(status: TrayStatus, snapshot: quota_snapshot | null): {tooltip: string; items: MenuItem[]} {
		this.menuItems = [];

		if (snapshot && snapshot.models.length > 0) {
			// Add model items
			for (const model of snapshot.models) {
				const pct = model.remaining_percentage ?? 100;
				const bar = this.buildProgressBar(pct);
				const isPinned = this.config.pinnedModels.includes(model.model_id);
				const statusText = this.getStatusText(pct);

				const item: MenuItemWithAction = {
					title: `${isPinned ? '* ' : ''}${model.label}  ${bar}  ${pct.toFixed(0)}%${statusText ? ' ' + statusText : ''}`,
					tooltip: `Reset: ${model.time_until_reset_formatted}. Click to ${isPinned ? 'unpin' : 'pin'}.`,
					enabled: true,
					action: () => {
						const pinned = this.config.pinnedModels;
						if (pinned.includes(model.model_id)) {
							this.config.setPinnedModels(pinned.filter(m => m !== model.model_id));
						} else {
							this.config.setPinnedModels([...pinned, model.model_id]);
						}
						// Refresh menu to show updated pin status
						if (this.lastSnapshot) {
							this.update(this.lastSnapshot);
						}
					}
				};
				this.menuItems.push(item);
			}

			// Separator
			this.menuItems.push({
				title: '-'.repeat(35),
				tooltip: '',
				enabled: false
			});

			// Prompt credits if available
			if (snapshot.prompt_credits) {
				const pc = snapshot.prompt_credits;
				const creditStatus = this.getStatusText(pc.remaining_percentage);
				this.menuItems.push({
					title: `Credits: ${pc.available.toLocaleString()} / ${pc.monthly.toLocaleString()} (${pc.remaining_percentage.toFixed(0)}%)${creditStatus ? ' ' + creditStatus : ''}`,
					tooltip: `${pc.remaining_percentage.toFixed(1)}% remaining`,
					enabled: false
				});
				this.menuItems.push({
					title: '-'.repeat(35),
					tooltip: '',
					enabled: false
				});
			}
		} else {
			this.menuItems.push({
				title: 'Waiting for data...',
				tooltip: 'Connecting to Antigravity',
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
			title: 'Refresh Now',
			tooltip: 'Fetch latest quota data',
			enabled: true,
			action: () => {
				if (this.onRefresh) this.onRefresh();
			}
		});

		this.menuItems.push({
			title: 'Open Config',
			tooltip: 'Edit config.json',
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

		// Build tooltip showing pinned model status
		let tooltip = 'Antigravity Quota';
		if (snapshot && this.config.pinnedModels.length > 0) {
			const pinnedInfo = snapshot.models
				.filter(m => this.config.pinnedModels.includes(m.model_id))
				.map(m => `${m.label}: ${(m.remaining_percentage ?? 100).toFixed(0)}%`)
				.join(' | ');
			if (pinnedInfo) {
				tooltip = pinnedInfo;
			}
		}

		return {
			tooltip,
			items: this.menuItems.map(({action, ...item}) => item)
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

	private getStatus(snapshot: quota_snapshot): TrayStatus {
		const pinnedModels = this.config.pinnedModels;
		const relevantModels = pinnedModels.length > 0
			? snapshot.models.filter(m => pinnedModels.includes(m.model_id))
			: snapshot.models;

		// Start with model quotas
		let minPct = relevantModels.length > 0
			? Math.min(...relevantModels.map(m => m.remaining_percentage ?? 100))
			: 100;

		// Also consider prompt credits if available
		if (snapshot.prompt_credits) {
			minPct = Math.min(minPct, snapshot.prompt_credits.remaining_percentage);
		}

		if (minPct === 0) return 'red';
		if (minPct < this.config.lowQuotaThreshold) return 'yellow';
		return 'green';
	}

	async update(snapshot: quota_snapshot) {
		this.lastSnapshot = snapshot;
		const status = this.getStatus(snapshot);

		// Kill old tray and create new one with updated menu
		if (this.tray) {
			await this.tray.kill(false);
		}

		await this.createTray(status, snapshot);

		// Check for notifications
		if (this.config.showNotifications) {
			this.checkAndNotify(snapshot);
		}
	}

	private checkAndNotify(snapshot: quota_snapshot) {
		const threshold = this.config.lowQuotaThreshold;

		for (const model of snapshot.models) {
			const pct = model.remaining_percentage ?? 100;
			const key = `${model.model_id}-${model.reset_time.getTime()}`;

			if (this.notifiedModels.has(key)) {
				continue;
			}

			if (model.is_exhausted) {
				this.notify(`${model.label} Exhausted`, `Quota depleted. Resets in ${model.time_until_reset_formatted}`);
				this.notifiedModels.add(key);
			} else if (pct < threshold) {
				this.notify(`${model.label} Low Quota`, `Only ${pct.toFixed(0)}% remaining. Resets in ${model.time_until_reset_formatted}`);
				this.notifiedModels.add(key);
			}
		}

		// Clean up old notification keys
		const currentKeys = new Set(snapshot.models.map(m => `${m.model_id}-${m.reset_time.getTime()}`));
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
