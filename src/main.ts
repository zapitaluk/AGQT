/**
 * Antigravity Quota Tray - Main Entry Point
 */

import {ProcessFinder} from './core/process_finder';
import {QuotaManager} from './core/quota_manager';
import {ConfigManager} from './config';
import {TrayManager} from './tray';
import {logger} from './utils/logger';

const LOG_CAT = 'Main';

async function main() {
	console.log('Antigravity Quota Tray v1.0.0');
	console.log('=============================\n');

	// Initialize components
	const config = new ConfigManager();
	const processFinder = new ProcessFinder();
	const quotaManager = new QuotaManager();
	const trayManager = new TrayManager(config);

	// Start tray (shows "waiting for data")
	await trayManager.start(() => {
		logger.info(LOG_CAT, 'Manual refresh requested');
		quotaManager.fetch_quota();
	});

	// Detect Antigravity process
	logger.info(LOG_CAT, 'Detecting Antigravity process...');

	let processInfo = await processFinder.detect_process_info(3);

	if (!processInfo) {
		console.error('\nCould not find Antigravity process. Make sure Windsurf is running.');
		console.log('Retrying in 30 seconds...\n');

		// Keep retrying in background
		const retryInterval = setInterval(async () => {
			processInfo = await processFinder.detect_process_info(1);
			if (processInfo) {
				clearInterval(retryInterval);
				startPolling(processInfo);
			}
		}, 30000);

		return;
	}

	startPolling(processInfo);

	function startPolling(info: {connect_port: number; csrf_token: string}) {
		logger.info(LOG_CAT, `Connected to Antigravity on port ${info.connect_port}`);
		console.log(`Connected to Antigravity on port ${info.connect_port}\n`);

		// Initialize quota manager
		quotaManager.init(info.connect_port, info.csrf_token);

		// Set up callbacks
		quotaManager.on_update(snapshot => {
			logger.debug(LOG_CAT, `Quota update received: ${snapshot.models.length} models`);
			trayManager.update(snapshot);

			// Log summary to console
			const summary = snapshot.models
				.map(m => `${m.label}: ${(m.remaining_percentage ?? 100).toFixed(0)}%`)
				.join(', ');
			console.log(`[${new Date().toLocaleTimeString()}] ${summary}`);
		});

		quotaManager.on_error(error => {
			logger.error(LOG_CAT, `Quota fetch error: ${error.message}`);
		});

		// Start polling
		const interval = config.pollingInterval;
		logger.info(LOG_CAT, `Starting polling with interval: ${interval / 1000}s`);
		quotaManager.start_polling(interval);
	}

	// Handle graceful shutdown
	process.on('SIGINT', () => {
		console.log('\nShutting down...');
		quotaManager.stop_polling();
		trayManager.stop();
		process.exit(0);
	});

	process.on('SIGTERM', () => {
		quotaManager.stop_polling();
		trayManager.stop();
		process.exit(0);
	});
}

// Run
main().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
