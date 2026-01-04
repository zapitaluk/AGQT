/**
 * System Tray Manager
 */

import SysTray, {MenuItem, ClickEvent} from 'systray2';
import notifier from 'node-notifier';
import {exec} from 'child_process';
import {quota_snapshot} from './utils/types';
import {ConfigManager} from './config';

// Base64 encoded simple icons (16x16 ICO format)
// Green checkmark icon
const ICON_GREEN = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/ugAAfroAAH66AACBuwEAgLsCBYC7BASAuwIAgLsAAH+6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/ugAAgLoDAHu4AwAAAAAAI4UQFI6+NhmSvz0Gj74xAIC6AwCBuwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgLsCAHu4AwAAAAAAnc1lBq7ZjDy15p6D0uq9U7TlnQaVwUQAf7oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgLsAAIO7AwB7uAMAAAAAAJ/OaAat2Ytcz+m6r9Xuwejs2p2q1oQGlMBCAH+6AAAAAAAAAAAAAAAAAAAAAAAAAAAAgbsCAHu4AwAAAAAAnc1mB63ZjFzO6Lmt1e7C5+vs1J+q1oQGlMBCAH+6AAAAAAAAAAAAAAAAAAAAAAAAAAAAgLsBAHu4AwAAAAAAotBuBq7Zjjm857GR3e/K1uvr1J+q1oQGlMBCAH+6AAAAAAAAAAAAAAAAAAAAAAB/ugAAgLsCAHu4AwAAAAAArNeFB7Tkmhm54Z5c2O3Fpu3t1p+q1oQGlMBCAH+6AAAAAAAAAAAAAAAAf7oAAIO7AgCBuwMAfLgDAAAAAAC24pwHtOSaGbbfmzm94Z5V4e7Mp+3t1p+q1oQGlMBCAH+6AAAAAAB/ugAAhLwEAIG7AwB7uAMAAAAAALfimwaz5JgGsOGTGbLglDm236FVwOWood7uzJut1oYGlMBCAH+6AAB9uQIAgbsDAH66AwB6uAMAAAAAALjimwa25ZsGAAAAAK/fkQCz4ZY5veKlWb/jpFOx2YsGk78/AH+6AAB/ugAAf7oCAH66AgB6uAIAAAAAALjimwa25ZsGAAAAAK7ejgAAAAAAtOKYBrThmQaw2Y0Gj74wAIC6AAAAAAAAAAAAAAAAAAAAAAAAAAC34ZoGteWaBgAAAACu3o4AAAAAAK3ciwCx35MGsNiLAJC+MgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8AAP//AAD//wAA4AcAAMADAADAAQAAwAAAAMAAAADAAAAAwAAAAMAAAADBgAAA44MAAOfDAAD//wAA//8AAA==';

// Yellow warning icon
const ICON_YELLOW = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC/nwAAv58AAL+fAAC/nwAAwKAAAMGgAQDAoAEAwJ8AAL+fAAC/nwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvp4AAL6eAQDEngEAu50BAMWiBQzPqhQXzqkTCsejBwC+ngEAvZ4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvZ4BAL2eAQC3mgEAAAAAANGrFyrbrSM22KsgDsylDwC+ngEAvZ4AAAAAAAAAAAAAAAAAAAAAAAAAAL+fAAC/nwIAu5wCALWYAgAAAAAAz6kVK9ywKGfhtDZO1q0fCs2lDQC+ngEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvJwCALaZAgAAAAAAzagSKt2xKoHkuEB+5rgzN9WsGgTLowoAfr0AAAAAAAAAAAAAAAAAAAAAAMC/AAC/nwIAupsCAAAAAADQqhQr3bEqgeW6RLbpvEeN5rgzN9WsGgTLowoAfr0AAAAAAAAAAAAAAAAAAAC/nwAAv58CALucAgAAAAAAz6gSKt2xKoDluUK15blCjeW3MTXUqxgEyqIIAH69AAAAAAAAAAAAAAAAAL+fAAC/nwIAu5wCAAAAAACj0G4GrdmOOduuJHbkuECC5bdBTeS2LxTTqhUDyaEGAH69AAAAAAAAAAAAAAAAAMCfAgC7nAIAAAAAANGrFirdrSpH37IudOS4QG3ltj8x4rQrD9GoEQPJoAUAfr0AAAAAAAAAAAAAALafAAC/nwIAu5wCAAAAAADMphEr3bEqR9+xLm7ktj1n5LQ6LuCzKA3QqA8EyZ8EAH69AAAAAAAAAAAAL6AAAL+fAgC8nQIAAAAAAMusFCrdrCpG3rAsbOK0NmHjszQs3rElDc6mDATInwQAfr0AAAAAAL+fAAC/nwIAu5wCAAAAAACQvjAq3awpRdywK2XhszJX4bEvKtywIwvNpQoDx50DAH69AAC/nwAAv58CALmcAgAAAAAA06wXKtyrJkTbryld37ErUd6uKCjbriALzKQIAsadAgB+vQAAvZ4AALO5AAC/nwEAtpkBAAAAAADVrRoq2aohQ9mtI1PcrCUy2qsfCcqjBQLFnAEAgr0AAI6MAAAAAAAAAAAAAAAAAAAAAADQqhcq2KkfQ9ipHzbYqRwIyaIDAcOaAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8AAP//AADgBwAAwAMAAMABAADAAAAAyAAAAP4AAAD+AAAA/AAAAP4AAAD/AQAA/4EAAP/BAAD//wAA//8AAA==';

// Red X icon
const ICON_RED = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACuWQAAr1oAAK9aAACvWgAAsVsBALBbAQCwWwEAsVsAAK9aAACuWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACuWQAAr1oBAK1ZAQC3YQIKv2gOGMBpDg3AaAsAtV8CAK5ZAQCuWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACuWQEArVkBALtjBADFbRIh0HYiNshvFxDBaQ0AvWUEAK5ZAQCuWQAAAAAAAAAAAAAAAAAAAAAAAAAAAACuWQAAtF4CALxkBQDGbhIh0ncjVNl+L03LcxoLwWoOALxkBAC1XgEAAAAAAAAAAAAAAAAAAAAAAK5ZAACvWgIAu2MEAMJqDhDPdiJa238xa9+CMEfTeBsKwGoMAMFpDAC7YwMAAAAAAAAAAAAAAAAAAAAAAK9aAgC6YwMAw2oNENF3Il3dgzFs4oU0buCDMT/TeBsKxG0RAMZuEgDAaAoAAAAAAAAAAAAAAAAAAAAAALljAgDDaw4Q0ngkXt+DMmzlh0B55opDa+GEMz/WexwKxnAUAMlxFgDFbQ8AsVsAAAAAAAAAAAAAAAAAALhjAgDOdB8h238xbOKGN3npikVn6oxJc+iKRWLfgzE+1nscCshyFgDLcxgAxm0PALRdAQAAAAAAq1cAALpjAwDHcBQh3IA0bOWJQnnqi0Zq64xJfe2OSHPqjEdh34IxPtZ7HArJcxgAzHQaAMdvEQC1XgEAAAAAALpiAgDGbxIh338ybOWIQHnrjEdq7I1Jfe+QSnXukUpt64xHYd+CMT7VehsKynUZAM10GwDIcBMAuGACAK1ZALdjAgDKchYh4YMzbOeKRHnsjUhr7o9Kfe+RSXXxkktv7pBJbOuMR2HfgjE+1XobCst2GgDOdRwAynETALhgAQC4YAEAzXQaIdqAL2zoi0N564xGa+2PSX3wkUp18JJLb++RSm3sjUhh34IxPtV6GwrMdxwAz3YeAMtzFQC4YAIAuWECAM51HCHZfixs6ItDeeuMRmvtj0l97pFJcO+RSmzrjEdg3oEwPdR5GQnLdhsAz3YdAMtzFQC4YAEA4H8AAM92HiHXfips54pCeemLRGrsjkhr7Y9Ibu2PSGrqjEVe3IAvO9J3FgjLdRoAznQbAMpyFACxWwAA0bYAAM90GyHTeiVs5YhAeeiKQmnqi0Vr6oxGaeqLRWXoiUFb2n0rONB1FAjJcxgAzHMZAMdvEAC3mQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8AAP//AADgBwAAwAMAAIABAACAAAAAiAAAALgAAAC4AAAAuAAAALgAAAC8AQAAvgEAAP+HAAD//wAA//8AAA==';

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

	private buildMenu(status: TrayStatus, snapshot: quota_snapshot | null): {tooltip: string; items: MenuItem[]} {
		this.menuItems = [];

		if (snapshot && snapshot.models.length > 0) {
			// Add model items
			for (const model of snapshot.models) {
				const pct = model.remaining_percentage ?? 100;
				const bar = this.buildProgressBar(pct);
				const isPinned = this.config.pinnedModels.includes(model.model_id);

				const item: MenuItemWithAction = {
					title: `${isPinned ? '* ' : ''}${model.label}  ${bar}  ${pct.toFixed(0)}%`,
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
				this.menuItems.push({
					title: `Credits: ${pc.available.toLocaleString()} / ${pc.monthly.toLocaleString()}`,
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

		if (relevantModels.length === 0) {
			return 'green';
		}

		const minPct = Math.min(...relevantModels.map(m => m.remaining_percentage ?? 100));

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
