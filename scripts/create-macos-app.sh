#!/bin/bash
set -e

# ============================================================
# create-macos-app.sh
# Packages AGQT into a proper .app bundle and .dmg installer
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APP_NAME="Antigravity Quota Tray"
APP_BUNDLE="${APP_NAME}.app"
APP_VERSION="1.0.0"
BUNDLE_ID="com.antigravity.quota"
DMG_NAME="AGQT-${APP_VERSION}-macOS"
BUILD_DIR="${PROJECT_DIR}/dist-app"

echo "=== Building ${APP_NAME} macOS Application ==="
echo ""

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    BINARY_NAME="antigravity-quota-mac-arm64"
else
    BINARY_NAME="antigravity-quota-mac-x64"
fi

BINARY_PATH="${PROJECT_DIR}/${BINARY_NAME}"
if [ ! -f "$BINARY_PATH" ]; then
    echo "Error: Binary '${BINARY_NAME}' not found."
    echo "Run 'npm run package-mac' first to build the executable."
    exit 1
fi

# Clean previous builds
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# ============================================================
# Step 1: Create .app bundle structure
# ============================================================
echo "[1/5] Creating .app bundle structure..."

APP_DIR="${BUILD_DIR}/${APP_BUNDLE}"
CONTENTS_DIR="${APP_DIR}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"
RESOURCES_DIR="${CONTENTS_DIR}/Resources"

mkdir -p "${MACOS_DIR}"
mkdir -p "${RESOURCES_DIR}"
mkdir -p "${MACOS_DIR}/traybin"
mkdir -p "${MACOS_DIR}/notifier"
mkdir -p "${MACOS_DIR}/assets"

# ============================================================
# Step 2: Copy binaries and runtime assets
# ============================================================
echo "[2/5] Copying binaries and runtime assets..."

# Main binary
cp "${BINARY_PATH}" "${MACOS_DIR}/antigravity-quota-mac"
chmod +x "${MACOS_DIR}/antigravity-quota-mac"

# Tray binary
if [ -f "${PROJECT_DIR}/traybin/tray_darwin_release" ]; then
    cp "${PROJECT_DIR}/traybin/tray_darwin_release" "${MACOS_DIR}/traybin/"
    chmod +x "${MACOS_DIR}/traybin/tray_darwin_release"
fi

# Notifier app
if [ -d "${PROJECT_DIR}/notifier/terminal-notifier.app" ]; then
    cp -R "${PROJECT_DIR}/notifier/terminal-notifier.app" "${MACOS_DIR}/notifier/"
fi

# Assets (tray icons)
cp "${PROJECT_DIR}/assets/"*.ico "${MACOS_DIR}/assets/" 2>/dev/null || true

# Default config
cp "${PROJECT_DIR}/config.json" "${MACOS_DIR}/config.json"

# ============================================================
# Step 3: Create launcher script
# ============================================================
echo "[3/5] Creating launcher script..."

# The launcher script sets the working directory to the MacOS folder
# so relative paths for config.json, traybin, notifier, and assets resolve correctly
cat > "${MACOS_DIR}/launch.sh" << 'LAUNCHER'
#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
exec "$DIR/antigravity-quota-mac"
LAUNCHER
chmod +x "${MACOS_DIR}/launch.sh"

# ============================================================
# Step 4: Generate .icns icon from green tray icon
# ============================================================
echo "[4/5] Generating application icon..."

# Create a simple app icon using sips (built into macOS)
ICONSET_DIR="${BUILD_DIR}/AppIcon.iconset"
mkdir -p "${ICONSET_DIR}"

# Generate iconset PNGs using standalone script
node "${SCRIPT_DIR}/generate-iconset.js" "${ICONSET_DIR}"

# Convert iconset to .icns
iconutil -c icns "${ICONSET_DIR}" -o "${RESOURCES_DIR}/AppIcon.icns" 2>/dev/null || {
    echo "  Warning: iconutil failed, using fallback icon method"
    # Fallback: just copy a PNG as the icon
    cp "${ICONSET_DIR}/icon_256x256.png" "${RESOURCES_DIR}/AppIcon.png"
}

# ============================================================
# Step 5: Create Info.plist
# ============================================================
echo "[5/5] Creating Info.plist..."

cat > "${CONTENTS_DIR}/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleDisplayName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleIdentifier</key>
    <string>${BUNDLE_ID}</string>
    <key>CFBundleVersion</key>
    <string>${APP_VERSION}</string>
    <key>CFBundleShortVersionString</key>
    <string>${APP_VERSION}</string>
    <key>CFBundleExecutable</key>
    <string>launch.sh</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSUIElement</key>
    <true/>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2025 Antigravity Quota Tray. MIT License.</string>
</dict>
</plist>
PLIST

echo ""
echo "=== .app bundle created at: ${APP_DIR} ==="
echo ""

# ============================================================
# Step 6: Create .dmg installer
# ============================================================
echo "Creating DMG installer..."

DMG_STAGING="${BUILD_DIR}/dmg-staging"
DMG_PATH="${PROJECT_DIR}/${DMG_NAME}.dmg"

rm -rf "${DMG_STAGING}"
rm -f "${DMG_PATH}"
mkdir -p "${DMG_STAGING}"

# Copy app bundle to staging
cp -R "${APP_DIR}" "${DMG_STAGING}/"

# Create a symbolic link to /Applications for drag-and-drop install
ln -s /Applications "${DMG_STAGING}/Applications"

# Create a simple README for the DMG
cat > "${DMG_STAGING}/README.txt" << README
Antigravity Quota Tray (AGQT) v${APP_VERSION}
==========================================

Installation:
  Drag "Antigravity Quota Tray.app" to the Applications folder.

First Run:
  1. Open the app from Applications (or Spotlight search "Antigravity")
  2. macOS may warn about an unidentified developer — right-click the app
     and choose "Open" to bypass Gatekeeper on first launch.
  3. The app will appear as an icon in your Menu Bar (top-right).
  4. Click the Menu Bar icon to view your AI quota status.

Configuration:
  Click "Open Config (API Keys)" in the tray menu to edit config.json.
  Add your OpenAI and Anthropic API keys there to enable multi-provider tracking.

Auto-Start at Login:
  The app includes a setup script. Open Terminal and run:
    /Applications/Antigravity\ Quota\ Tray.app/Contents/MacOS/antigravity-quota-mac

  Or use the create-startup-shortcut-mac.sh script from the source repository.

More Info:
  https://github.com/your-username/antigravity-quota-tray
README

# Build DMG
hdiutil create \
    -volname "${APP_NAME}" \
    -srcfolder "${DMG_STAGING}" \
    -ov \
    -format UDZO \
    "${DMG_PATH}"

echo ""
echo "============================================================"
echo "  SUCCESS!"
echo "  .app bundle: ${APP_DIR}"
echo "  .dmg installer: ${DMG_PATH}"
echo "  Size: $(du -sh "${DMG_PATH}" | cut -f1)"
echo "============================================================"
echo ""
echo "To test the .app bundle:"
echo "  open \"${APP_DIR}\""
echo ""
echo "To share: upload ${DMG_NAME}.dmg to your GitHub Releases."
