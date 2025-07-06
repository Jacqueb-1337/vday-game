#!/bin/bash

echo "========================================"
echo "    Building Willowmere Linux Package"
echo "========================================"
echo

# Configuration
APP_NAME="willowmere"
DISPLAY_NAME="Willowmere"
VERSION="1.0.0"
MAINTAINER="jacqueb"

# Check if NW.js is set up
if [ ! -f "nwjs/nw" ]; then
    echo "ERROR: NW.js not found!"
    echo "Please run ./setup-prod.sh first to download NW.js"
    exit 1
fi

# Create build directory
BUILD_DIR="build/linux"
PACKAGE_DIR="$BUILD_DIR/package"
mkdir -p "$PACKAGE_DIR"

echo "Creating application directory structure..."

# Create directory structure
APP_DIR="/opt/jacqueb/$APP_NAME"
mkdir -p "$PACKAGE_DIR$APP_DIR"

# Copy NW.js runtime
echo "Copying NW.js runtime..."
cp -R nwjs/* "$PACKAGE_DIR$APP_DIR/"

# Rename nw executable to our app name
mv "$PACKAGE_DIR$APP_DIR/nw" "$PACKAGE_DIR$APP_DIR/$APP_NAME"

# Copy game files
echo "Copying game files..."
cp -R src "$PACKAGE_DIR$APP_DIR/"
cp index.html main.js style.css package.json "$PACKAGE_DIR$APP_DIR/"
cp tilemap.json objectmap.json npcs.json dialogue.json "$PACKAGE_DIR$APP_DIR/"
cp README.md "$PACKAGE_DIR$APP_DIR/"

# Create desktop entry directory
mkdir -p "$PACKAGE_DIR/usr/share/applications"
mkdir -p "$PACKAGE_DIR/usr/share/pixmaps"
mkdir -p "$PACKAGE_DIR/usr/local/bin"

# Create desktop entry
cat > "$PACKAGE_DIR/usr/share/applications/$APP_NAME.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=$DISPLAY_NAME
Comment=A magical 2D game with 3D movement capabilities
Exec=/opt/jacqueb/$APP_NAME/$APP_NAME
Icon=$APP_NAME
Terminal=false
Categories=Game;
StartupNotify=true
EOF

# Copy icon (if exists)
if [ -f "src/assets/icon.png" ]; then
    cp "src/assets/icon.png" "$PACKAGE_DIR/usr/share/pixmaps/$APP_NAME.png"
fi

# Create symlink for easy command-line access
mkdir -p "$PACKAGE_DIR/usr/local/bin"
ln -sf "/opt/jacqueb/$APP_NAME/$APP_NAME" "$PACKAGE_DIR/usr/local/bin/$APP_NAME"

# Create modding info file
cat > "$PACKAGE_DIR$APP_DIR/MODDING.txt" << EOF
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
1. Make your changes to the files in /opt/jacqueb/$APP_NAME/
2. Run: $APP_NAME

For more information, see README.md
Happy modding!
EOF

# Make executable
chmod +x "$PACKAGE_DIR$APP_DIR/$APP_NAME"

# Create install script
INSTALL_SCRIPT="$BUILD_DIR/install.sh"
cat > "$INSTALL_SCRIPT" << EOF
#!/bin/bash

echo "Installing Willowmere..."

# Check if running as root
if [ "\$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Copy files
cp -R package/* /

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database /usr/share/applications
fi

# Update icon cache
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache /usr/share/pixmaps
fi

echo "Willowmere installed successfully!"
echo "Launch from applications menu or run: $APP_NAME"
echo "Game files located at: /opt/jacqueb/$APP_NAME/"
EOF

chmod +x "$INSTALL_SCRIPT"

# Create uninstall script
UNINSTALL_SCRIPT="$BUILD_DIR/uninstall.sh"
cat > "$UNINSTALL_SCRIPT" << EOF
#!/bin/bash

echo "Uninstalling Willowmere..."

# Check if running as root
if [ "\$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Remove files
rm -rf "/opt/jacqueb/$APP_NAME"
rm -f "/usr/share/applications/$APP_NAME.desktop"
rm -f "/usr/share/pixmaps/$APP_NAME.png"
rm -f "/usr/local/bin/$APP_NAME"

# Remove jacqueb directory if empty
rmdir "/opt/jacqueb" 2>/dev/null || true

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database /usr/share/applications
fi

echo "Willowmere uninstalled successfully!"
EOF

chmod +x "$UNINSTALL_SCRIPT"

# Create DEB package (if dpkg-deb is available)
if command -v dpkg-deb >/dev/null 2>&1; then
    echo "Creating DEB package..."
    
    DEB_DIR="$BUILD_DIR/deb"
    mkdir -p "$DEB_DIR/DEBIAN"
    
    # Copy package files
    cp -R "$PACKAGE_DIR"/* "$DEB_DIR/"
    
    # Create control file
    cat > "$DEB_DIR/DEBIAN/control" << EOF
Package: $APP_NAME
Version: $VERSION
Section: games
Priority: optional
Architecture: amd64
Maintainer: $MAINTAINER
Description: Willowmere - A magical 2D game
 A magical 2D game with 3D movement capabilities, similar to Stardew Valley's
 top-down perspective. Built with Three.js and NW.js.
 .
 This package includes all source files for easy modding.
EOF
    
    # Build DEB
    dpkg-deb --build "$DEB_DIR" "dist/$APP_NAME-$VERSION.deb"
    echo "DEB package created: dist/$APP_NAME-$VERSION.deb"
fi

# Create tarball
echo "Creating tarball..."
cd "$BUILD_DIR"
tar -czf "../../dist/$APP_NAME-$VERSION-linux.tar.gz" package/ install.sh uninstall.sh
cd - > /dev/null

echo
echo "========================================"
echo "    Linux Package Built Successfully!"
echo "========================================"
echo
echo "Files created:"
echo "  - dist/$APP_NAME-$VERSION-linux.tar.gz"
if [ -f "dist/$APP_NAME-$VERSION.deb" ]; then
    echo "  - dist/$APP_NAME-$VERSION.deb"
fi
echo
echo "Installation:"
echo "  DEB: sudo dpkg -i dist/$APP_NAME-$VERSION.deb"
echo "  TAR: Extract and run sudo ./install.sh"
echo "  Manual: Copy package/* to / as root"
echo
echo "Game will be installed to: /opt/jacqueb/$APP_NAME/"
echo "All source files accessible for modding"
echo
