# Antigravity Quota Tray (AGQT)

A lightweight cross-platform system tray application that monitors your Anthropic Claude, OpenAI Codex, and Google Antigravity AI model quota usage in real-time.

![Windows](https://img.shields.io/badge/platform-Windows-blue)
![macOS](https://img.shields.io/badge/platform-macOS-lightgrey)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

## Features

- **System Tray Icon** - Color-coded status indicator:
  - Green: All models have >20% quota remaining
  - Yellow: Any model below 20% quota
  - Red: Any model exhausted (0%)

- **Multi-Provider Support** - Unifies tracking for multiple AI extensions:
  - Google Antigravity (Local process detection)
  - OpenAI Codex (Direct API polling)
  - Anthropic Claude (Direct API polling)

- **Right-Click Menu** - Shows all active providers and their available models with:
  - Visual progress bars
  - Remaining percentage
  - Time until quota reset

- **Pin Models** - Click any model to pin/unpin it for priority tracking. Pinned models appear in the master tray tooltip.

- **Desktop Notifications** - Alerts when quota gets low or is exhausted

- **Auto-Start** - Optional silent startup with Windows or macOS

- **Lightweight** - ~37MB standalone executable, minimal resource usage

## Screenshots

```
Right-click menu example:

[Google Antigravity]
* Gemini 1.5 Pro         ▓▓▓▓▓▓▓▓░░  75%
  Gemini Flash           ▓▓▓▓░░░░░░  40%
  Credits: 7,500 / 10,000 (75%)
-----------------------------------
[Anthropic Claude]
* Claude 3.5 Sonnet      ▓▓▓▓▓▓▓▓▓▓  100%
-----------------------------------
[OpenAI Codex]
  GPT-4o                 ▓▓▓▓▓▓▓▓▓▓  100%
-----------------------------------
Refresh All Now
Open Config (API Keys)
Exit
```

## Installation

### Prerequisites

- Windows 10/11 or macOS (10.15+)
- Google Antigravity installed and running
- [Node.js](https://nodejs.org/) v18+ (for building only)

### Quick Start (From Source)

#### Windows
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/antigravity-quota-tray.git
cd antigravity-quota-tray

# Install dependencies
npm install

# Build
npm run build

# Run
npm run start
```

#### macOS
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/antigravity-quota-tray.git
cd antigravity-quota-tray

# Install dependencies
npm install

# Build
npm run build

# Run (requires sudo for pgrep/lsof on some systems depending on Antigravity install)
npm run start
```

### Build Standalone Executable

#### Windows
```bash
# Package as .exe
npm run package
```

This creates:
- `antigravity-quota.exe` - Main application (~37MB)
- `traybin/tray_windows_release.exe` - Required system tray helper binary
- `notifier/snoretoast-x64.exe` - Notification helper (Windows toast)
- `notifier/notifu64.exe` - Notification helper fallback
- `config.json` - Configuration file

#### macOS
```bash
# Package as macOS executable
npm run package-mac
```

This creates:
- `antigravity-quota-mac` - Main application (~40MB)
- `traybin/tray_darwin_release` - Required system tray helper binary
- `notifier/terminal-notifier.app` - macOS notification helper
- `config.json` - Configuration file

*Note: For both platforms, `npm run package` automatically prepares `traybin/` and `notifier/` via `scripts/postpackage.js`.*

## Usage

1. **Start Antigravity** - The app needs Antigravity running to detect the language server.
2. **Run the app**:
   - **Windows:** Double-click `antigravity-quota.exe` or run `npm start`
   - **macOS:** Double-click the `antigravity-quota-mac` executable, or set up the LaunchAgent (see below).
3. **Check the system tray (Menu Bar on macOS)** - Look for the colored icon in your taskbar/menu bar.
4. **Right-click (or click on macOS)** - View all models and their quota status.
5. **Click a model** - Pin/unpin it for priority tracking.

### Auto-Start (Silent Background)

#### Windows
To run automatically at login without a command window:

1. Use the included VBS launcher:
   ```
   antigravity-quota-silent.vbs
   ```

2. Run the setup script to add to Windows Startup:
   ```powershell
   powershell -ExecutionPolicy Bypass -File create-startup-shortcut.ps1
   ```

3. The app will now start silently when you log in

To remove from startup, delete:
```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Antigravity Quota.lnk
```

#### macOS
To run automatically at login as a background LaunchAgent:

1. Run the setup bash script in the project directory:
   ```bash
   ./create-startup-shortcut-mac.sh
   ```

2. The script will create `~/Library/LaunchAgents/com.antigravity.quota.plist` and the app will now start silently.

To remove from startup later, run:
```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.antigravity.quota.plist
rm ~/Library/LaunchAgents/com.antigravity.quota.plist
```

## Configuration

Edit `config.json` to customize behavior or add API Keys. Click "Open Config (API Keys)" in the tray menu to open it quickly.

```json
{
  "pollingInterval": 120,
  "pinnedModels": [],
  "lowQuotaThreshold": 20,
  "showNotifications": true,
  "openaiApiKey": "sk-...",
  "anthropicApiKey": "sk-ant-..."
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pollingInterval` | number | 120 | Seconds between quota updates (min: 30) |
| `pinnedModels` | string[] | [] | Model IDs to prioritize in status and tooltip |
| `lowQuotaThreshold` | number | 20 | Percentage to trigger low quota warning |
| `showNotifications` | boolean | true | Show desktop notifications |
| `openaiApiKey` | string | "" | Your OpenAI API key starting with `sk-` |
| `anthropicApiKey` | string | "" | Your Anthropic API key starting with `sk-ant-` |

> **Note**: Anthropic and OpenAI extensions do not expose their local billing quotas on disk. To monitor their usage, you must generate API keys on their respective billing dashboards and paste them into this file. This application sends requests directly to official APIs.

## How It Works

The application:

1. **Detects Antigravity Process** - Finds `language_server_windows_x64.exe` running on your system
2. **Extracts Connection Info** - Reads the CSRF token and port from process arguments
3. **Polls Quota API** - Makes HTTPS requests to the local language server endpoint
4. **Parses Response** - Extracts per-model quota information
5. **Updates Tray** - Refreshes the icon and menu based on quota status

### API Endpoint

```
POST https://127.0.0.1:{port}/exa.language_server_pb.LanguageServerService/GetUserStatus
```

## Project Structure

```
antigravity-quota-tray/
├── src/
│   ├── main.ts                 # Entry point
│   ├── tray.ts                 # System tray management
│   ├── config.ts               # JSON config manager
│   ├── core/
│   │   ├── quota_manager.ts    # API polling and parsing
│   │   ├── process_finder.ts   # Windsurf process detection
│   │   └── platform_strategies.ts  # OS-specific commands
│   └── utils/
│       ├── types.ts            # TypeScript interfaces
│       └── logger.ts           # Console logging
├── config.json                 # User configuration
├── package.json
├── tsconfig.json
├── antigravity-quota-silent.vbs      # Silent launcher (Windows)
├── create-startup-shortcut.ps1       # Startup setup script (Windows)
├── create-startup-shortcut-mac.sh    # Startup setup script (macOS)
├── scripts/
│   ├── postpackage.js          # Windows packaging script
│   └── postpackage-mac.js      # macOS packaging script
└── traybin/                    # Generated external tray tools
```

## Development

```bash
# Install dependencies
npm install

# Build and run
npm run dev

# Build only
npm run build

# Run built version
npm run start

# Package to executable
npm run package
```

## Troubleshooting

### "Could not find Antigravity process"

- Make sure Antigravity is running
- The app will retry every 30 seconds automatically

### No tray icon appears

- Check if the app is running in Task Manager
- Try running from command line to see error messages
- Ensure `traybin/tray_windows_release.exe` exists alongside the executable (auto-created by `npm run package`)

### Notifications not working

- Ensure `notifier/snoretoast-x64.exe` and `notifier/notifu64.exe` exist alongside the executable
- Check that `showNotifications` is `true` in config.json

### Packaging fails with "EPERM ... unlink antigravity-quota.exe"

- Close any running `antigravity-quota.exe` process
- Run `npm run package` again

### Packaging macOS target fails with "spawn UNKNOWN" on Windows

- This is a known issue with the `pkg` library when cross-compiling binaries for macOS from a Windows host using newer Node.js versions.
- To build the macOS executable, clone the repository on a macOS machine and run `npm run package-mac` there.

### Quota not updating

- Verify Antigravity is connected to its servers
- Check the console output for API errors
- Try clicking "Refresh Now" in the tray menu

## Related Projects

- [AntigravityQuota](https://github.com/anthropics/claude-code) - VS Code extension version (original)

## License

MIT License - See [LICENSE](LICENSE) for details.

## Acknowledgments

- Built for monitoring Google Antigravity quota usage
- Uses [systray2](https://github.com/felixhao28/node-systray) for system tray functionality
- Uses [node-notifier](https://github.com/mikaelbr/node-notifier) for desktop notifications
