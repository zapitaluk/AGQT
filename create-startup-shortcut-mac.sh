#!/bin/bash

# Configuration
APP_NAME="Antigravity Quota Tray"
APP_EXEC="antigravity-quota-mac" # Must match package payload name
PLIST_NAME="com.antigravity.quota"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/$PLIST_NAME.plist"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
EXEC_PATH="$APP_DIR/$APP_EXEC"

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCH_AGENTS_DIR"

if [ ! -f "$EXEC_PATH" ]; then
    echo "Error: Could not find the executable '$APP_EXEC' in $APP_DIR."
    echo "Please ensure you have built the application using 'npm run package-mac' first."
    exit 1
fi

# Make sure it's executable
chmod +x "$EXEC_PATH"

echo "Creating LaunchAgent at $PLIST_PATH..."

cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$PLIST_NAME</string>
    <key>ProgramArguments</key>
    <array>
        <string>$EXEC_PATH</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>WorkingDirectory</key>
    <string>$APP_DIR</string>
    <key>StandardOutPath</key>
    <string>/tmp/$PLIST_NAME.out</string>
    <key>StandardErrorPath</key>
    <string>/tmp/$PLIST_NAME.err</string>
</dict>
</plist>
EOF

# Load the agent immediately
launchctl load "$PLIST_PATH" 2>/dev/null || launchctl bootstrap gui/$(id -u) "$PLIST_PATH"

echo "Success! $APP_NAME has been added to macOS startup."
echo "You can check status with: launchctl list | grep $PLIST_NAME"
echo ""
echo "To remove from startup later, run:"
echo "launchctl bootout gui/\$(id -u) $PLIST_PATH"
echo "rm $PLIST_PATH"
