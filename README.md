# Antigravity Quota Tray (AGQT)

A lightweight Windows system tray application that monitors your Google Antigravity AI model quota usage in real-time.

![Windows](https://img.shields.io/badge/platform-Windows-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

## Features

- **System Tray Icon** - Color-coded status indicator:
  - Green: All models have >20% quota remaining
  - Yellow: Any model below 20% quota
  - Red: Any model exhausted (0%)

- **Right-Click Menu** - Shows all available models with:
  - Visual progress bars
  - Remaining percentage
  - Time until quota reset

- **Pin Models** - Click any model to pin/unpin it for priority tracking

- **Desktop Notifications** - Alerts when quota gets low or is exhausted

- **Auto-Start** - Optional silent startup with Windows

- **Lightweight** - ~37MB standalone executable, minimal resource usage

## Screenshots

```
Right-click menu example:

* Claude Sonnet 4.5      ▓▓▓▓▓▓▓▓░░  75%
  Claude Opus 4.5        ▓▓▓▓░░░░░░  40%
  GPT-4                  ▓▓▓▓▓▓▓▓▓▓  100%
  -----------------------------------
  Credits: 7,500 / 10,000
  -----------------------------------
  Refresh Now
  Open Config
  Exit
```

## Installation

### Prerequisites

- Windows 10/11
- Google Antigravity installed and running
- [Node.js](https://nodejs.org/) v18+ (for building only)

### Quick Start (From Source)

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

### Build Standalone Executable

```bash
# Package as .exe
npm run package

# Copy required notification helper
mkdir notifier
copy node_modules\node-notifier\vendor\snoreToast\snoretoast-x64.exe notifier\
```

This creates:
- `antigravity-quota.exe` - Main application (~37MB)
- `notifier/snoretoast-x64.exe` - Windows notification helper
- `config.json` - Configuration file

## Usage

1. **Start Antigravity** - The app needs Antigravity running to detect the language server
2. **Run the app** - Double-click `antigravity-quota.exe` or run `npm start`
3. **Check the system tray** - Look for the colored icon in your taskbar
4. **Right-click** - View all models and their quota status
5. **Click a model** - Pin/unpin it for priority tracking

### Auto-Start with Windows (Silent)

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

## Configuration

Edit `config.json` to customize behavior:

```json
{
  "pollingInterval": 120,
  "pinnedModels": [],
  "lowQuotaThreshold": 20,
  "showNotifications": true
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pollingInterval` | number | 120 | Seconds between quota updates (min: 30) |
| `pinnedModels` | string[] | [] | Model IDs to prioritize in status |
| `lowQuotaThreshold` | number | 20 | Percentage to trigger low quota warning |
| `showNotifications` | boolean | true | Show desktop notifications |

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
├── antigravity-quota-silent.vbs    # Silent launcher
└── create-startup-shortcut.ps1     # Startup setup script
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

### Notifications not working

- Ensure `notifier/snoretoast-x64.exe` exists alongside the executable
- Check that `showNotifications` is `true` in config.json

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
