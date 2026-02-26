const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function ensureDir(dir) {
	fs.mkdirSync(dir, {recursive: true});
}

function copyFile(sourceRelPath, targetRelPath) {
	const source = path.join(rootDir, sourceRelPath);
	const target = path.join(rootDir, targetRelPath);

	if (!fs.existsSync(source)) {
		throw new Error(`Required file not found: ${sourceRelPath}`);
	}

	ensureDir(path.dirname(target));
	fs.copyFileSync(source, target);
	console.log(`Copied ${sourceRelPath} -> ${targetRelPath}`);
}

function main() {
	copyFile('node_modules/systray2/traybin/tray_windows_release.exe', 'traybin/tray_windows_release.exe');
	copyFile('node_modules/node-notifier/vendor/snoreToast/snoretoast-x64.exe', 'notifier/snoretoast-x64.exe');
	copyFile('node_modules/node-notifier/vendor/notifu/notifu64.exe', 'notifier/notifu64.exe');
}

try {
	main();
	console.log('Post-package runtime assets prepared.');
} catch (error) {
	console.error(`Post-package failed: ${error.message}`);
	process.exit(1);
}
