/**
 * Antigravity Quota Tray - Main Entry Point
 */

import { ProcessFinder } from './core/process_finder';
import { AntigravityProvider } from './core/providers/antigravity_provider';
import { AnthropicProvider } from './core/providers/anthropic_provider';
import { OpenAIProvider } from './core/providers/openai_provider';
import { QuotaAggregator } from './core/aggregator';
import { ConfigManager } from './config';
import { TrayManager } from './tray';
import { logger } from './utils/logger';

const LOG_CAT = 'Main';

async function main() {
	console.log('Antigravity Quota Tray v1.0.0');
	console.log('=============================\n');

	// Initialize components
	const config = new ConfigManager();
	const processFinder = new ProcessFinder();

	// Initialize Providers and Aggregator
	const aggregator = new QuotaAggregator();
	const antigravityProvider = new AntigravityProvider();
	const anthropicProvider = new AnthropicProvider(config);
	const openaiProvider = new OpenAIProvider(config);

	aggregator.addProvider(antigravityProvider);
	aggregator.addProvider(anthropicProvider);
	aggregator.addProvider(openaiProvider);

	const trayManager = new TrayManager(config);

	// Start tray (shows "waiting for data")
	await trayManager.start(() => {
		logger.info(LOG_CAT, 'Manual refresh requested');
		aggregator.forceRefreshAll();
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

	function startPolling(info: { connect_port: number; csrf_token: string }) {
		logger.info(LOG_CAT, `Connected to Antigravity on port ${info.connect_port}`);
		console.log(`Connected to Antigravity on port ${info.connect_port}\n`);

		// Initialize Antigravity specific requirements
		antigravityProvider.init(info.connect_port, info.csrf_token);

		// Set up callbacks on the aggregator
		aggregator.on_update(snapshots => {
			logger.debug(LOG_CAT, `Quota update received from aggregator`);
			trayManager.update(snapshots);

			// Log summary to console for Antigravity only just to keep terminal clean
			const agSnapshot = snapshots.get('Google Antigravity');
			if (agSnapshot) {
				const modelSummary = agSnapshot.models
					.map(m => `${m.label}: ${(m.remaining_percentage ?? 100).toFixed(0)}%`)
					.join(', ');

				let creditSummary = '';
				if (agSnapshot.prompt_credits) {
					const pc = agSnapshot.prompt_credits;
					creditSummary = ` | Credits: ${pc.available.toLocaleString()}/${pc.monthly.toLocaleString()} (${pc.remaining_percentage.toFixed(1)}%)`;
				}
				console.log(`[${new Date().toLocaleTimeString()}] AG: ${modelSummary}${creditSummary}`);
			}
		});

		aggregator.on_error((provider, error) => {
			logger.error(LOG_CAT, `[${provider}] Quota fetch error: ${error.message}`);
		});

		// Start polling
		const interval = config.pollingInterval;
		logger.info(LOG_CAT, `Starting multi-provider polling with interval: ${interval / 1000}s`);
		aggregator.startAll(interval);
	}

	// Handle graceful shutdown
	process.on('SIGINT', () => {
		console.log('\nShutting down...');
		aggregator.stopAll();
		trayManager.stop();
		process.exit(0);
	});

	process.on('SIGTERM', () => {
		aggregator.stopAll();
		trayManager.stop();
		process.exit(0);
	});
}

// Run
main().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
