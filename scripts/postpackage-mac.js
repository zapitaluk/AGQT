const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
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

function copyDirectory(sourceRelPath, targetRelPath) {
    const source = path.join(rootDir, sourceRelPath);
    const target = path.join(rootDir, targetRelPath);

    if (!fs.existsSync(source)) {
        throw new Error(`Required directory not found: ${sourceRelPath}`);
    }

    ensureDir(target);
    const items = fs.readdirSync(source);

    for (const item of items) {
        const sourceItem = path.join(source, item);
        const targetItem = path.join(target, item);

        if (fs.statSync(sourceItem).isDirectory()) {
            copyDirectory(path.join(sourceRelPath, item), path.join(targetRelPath, item));
        } else {
            fs.copyFileSync(sourceItem, targetItem);
        }
    }
    console.log(`Copied directory ${sourceRelPath} -> ${targetRelPath}`);
}

function main() {
    // Copy the correct architecture binary to the generic name
    // pkg creates -arm64 and -x64 suffixed binaries; the LaunchAgent & startup script reference the unsuffixed name
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
    const suffixed = `antigravity-quota-mac-${arch}`;
    const generic = 'antigravity-quota-mac';

    if (fs.existsSync(path.join(rootDir, suffixed))) {
        fs.copyFileSync(path.join(rootDir, suffixed), path.join(rootDir, generic));
        fs.chmodSync(path.join(rootDir, generic), 0o755);
        console.log(`Copied ${suffixed} -> ${generic} (for current architecture: ${arch})`);
    } else {
        console.log(`Warning: ${suffixed} not found. Skipping generic binary copy.`);
    }

    // Copy traybin executable for darwin
    copyFile('node_modules/systray2/traybin/tray_darwin_release', 'traybin/tray_darwin_release');

    // Ensure notifier directory exists
    ensureDir(path.join(rootDir, 'notifier'));

    // terminal-notifier is an .app directory, so we need to copy the whole thing
    const terminalNotifierApp = 'node_modules/node-notifier/vendor/mac.noindex/terminal-notifier.app';
    if (fs.existsSync(path.join(rootDir, terminalNotifierApp))) {
        copyDirectory(terminalNotifierApp, 'notifier/terminal-notifier.app');
    } else {
        console.log(`Warning: ${terminalNotifierApp} not found. Notifications may not work.`);
    }
}

try {
    main();
    console.log('Post-package (macOS) runtime assets prepared.');
} catch (error) {
    console.error(`Post-package (macOS) failed: ${error.message}`);
    process.exit(1);
}
