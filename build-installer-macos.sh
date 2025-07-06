#!/bin/bash

echo "========================================"
echo "    Building Willowmere macOS Package"
echo "========================================"
echo

# Configuration
APP_NAME="Willowmere"
BUNDLE_ID="com.jacqueb.willowmere"
VERSION="1.0.0"
INSTALL_DIR="/Applications/jacqueb"

# Check if NW.js is set up
if [ ! -d "nwjs/nwjs.app" ]; then
    echo "ERROR: NW.js not found!"
    echo "Please run ./setup-prod.sh first to download NW.js"
    exit 1
fi

# Create build directory
BUILD_DIR="build/macos"
mkdir -p "$BUILD_DIR"

echo "Creating application bundle..."

# Create the app bundle structure
APP_BUNDLE="$BUILD_DIR/$APP_NAME.app"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"
mkdir -p "$APP_BUNDLE/Contents/Frameworks"

# Copy NW.js framework
echo "Copying NW.js framework..."
cp -R nwjs/nwjs.app/Contents/Frameworks/* "$APP_BUNDLE/Contents/Frameworks/"

# Copy NW.js executable and rename it
cp nwjs/nwjs.app/Contents/MacOS/nwjs "$APP_BUNDLE/Contents/MacOS/$APP_NAME"

# Copy game files to Resources
echo "Copying game files..."
cp -R src "$APP_BUNDLE/Contents/Resources/"
cp index.html main.js style.css package.json "$APP_BUNDLE/Contents/Resources/"
cp tilemap.json objectmap.json npcs.json dialogue.json "$APP_BUNDLE/Contents/Resources/"
cp README.md "$APP_BUNDLE/Contents/Resources/"

# Create Info.plist
cat > "$APP_BUNDLE/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundleDisplayName</key>
    <string>$APP_NAME</string>
    <key>CFBundleIdentifier</key>
    <string>$BUNDLE_ID</string>
    <key>CFBundleVersion</key>
    <string>$VERSION</string>
    <key>CFBundleShortVersionString</key>
    <string>$VERSION</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleExecutable</key>
    <string>$APP_NAME</string>
    <key>CFBundleIconFile</key>
    <string>icon</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.14</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
</dict>
</plist>
EOF

# Make executable
chmod +x "$APP_BUNDLE/Contents/MacOS/$APP_NAME"

# Create modding info file
cat > "$APP_BUNDLE/Contents/Resources/MODDING.txt" << EOF
Willowmere - Modding Information

This game is designed to be easily moddable!

Key files you can modify:
- src/assets/ - All game textures and sprites
- tilemap.json - Map layout and tile data
- objectmap.json - Placed objects and buildings
- npcs.json - NPC data and positions
- dialogue.json - NPC dialogue
- src/*.js - Game logic and mechanics

To run your modded game:
1. Make your changes to the files in this Resources folder
2. Launch Willowmere.app

For more information, see README.md
Happy modding!
EOF

# Create installer script
INSTALLER_SCRIPT="$BUILD_DIR/install.sh"
cat > "$INSTALLER_SCRIPT" << EOF
#!/bin/bash

echo "Installing Willowmere..."

# Create jacqueb directory in Applications
sudo mkdir -p "$INSTALL_DIR"

# Copy app bundle
sudo cp -R "$APP_NAME.app" "$INSTALL_DIR/"

# Set permissions
sudo chown -R root:wheel "$INSTALL_DIR/$APP_NAME.app"
sudo chmod -R 755 "$INSTALL_DIR/$APP_NAME.app"

# Create symlink in Applications root for easy access
sudo ln -sf "$INSTALL_DIR/$APP_NAME.app" "/Applications/$APP_NAME.app"

echo "Willowmere installed successfully!"
echo "You can find it in Applications/$APP_NAME.app"
echo "All source files are kept in the app bundle for easy modding."
EOF

chmod +x "$INSTALLER_SCRIPT"

# Create DMG (if hdiutil is available)
if command -v hdiutil >/dev/null 2>&1; then
    echo "Creating DMG..."
    DMG_NAME="Willowmere-v$VERSION.dmg"
    
    # Create temporary DMG folder
    DMG_FOLDER="$BUILD_DIR/dmg"
    mkdir -p "$DMG_FOLDER"
    
    # Copy app and installer
    cp -R "$APP_BUNDLE" "$DMG_FOLDER/"
    cp "$INSTALLER_SCRIPT" "$DMG_FOLDER/"
    
    # Create README for DMG
    cat > "$DMG_FOLDER/README.txt" << EOF
Willowmere v$VERSION

Installation Options:

1. EASY: Drag Willowmere.app to Applications folder
2. SYSTEM: Run install.sh for system-wide installation

Modding:
All source files are accessible within the app bundle.
Right-click Willowmere.app -> Show Package Contents -> Contents/Resources

Happy gaming and modding!
EOF
    
    # Create DMG
    hdiutil create -volname "Willowmere v$VERSION" -srcfolder "$DMG_FOLDER" -ov -format UDZO "dist/$DMG_NAME"
    
    echo "DMG created: dist/$DMG_NAME"
fi

echo
echo "========================================"
echo "     macOS Package Built Successfully!"
echo "========================================"
echo
echo "Files created:"
echo "  - $APP_BUNDLE"
if [ -f "dist/Willowmere-v$VERSION.dmg" ]; then
    echo "  - dist/Willowmere-v$VERSION.dmg"
fi
echo
echo "Installation:"
echo "  - Drag Willowmere.app to Applications"
echo "  - All source files accessible for modding"
echo
