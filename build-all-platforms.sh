#!/bin/bash

echo "========================================"
echo "   Building for ALL Platforms"
echo "========================================"
echo

# NW.js version
NWJS_VERSION="v0.82.0"

# Create directories
mkdir -p dist build

echo "Downloading NW.js for all platforms..."
echo

# Define platform mappings
PLATFORMS=("win-x64" "win-ia32" "linux-x64" "linux-ia32" "osx-x64" "osx-arm64")

for PLATFORM in "${PLATFORMS[@]}"; do
    echo "Downloading NW.js for $PLATFORM..."
    
    # Determine file extension
    EXTENSION="zip"
    if [[ "$PLATFORM" == linux-* ]]; then
        EXTENSION="tar.gz"
    fi
    
    # Production build filename
    FILENAME="nwjs-${NWJS_VERSION}-${PLATFORM}"
    URL="https://dl.nwjs.io/${NWJS_VERSION}/${FILENAME}.${EXTENSION}"
    DOWNLOAD_FILE="build/${FILENAME}.${EXTENSION}"
    
    # Download if not already exists
    if [ ! -f "$DOWNLOAD_FILE" ]; then
        echo "  Downloading ${FILENAME}.${EXTENSION}..."
        if command -v curl >/dev/null 2>&1; then
            curl -L -o "$DOWNLOAD_FILE" "$URL"
        elif command -v wget >/dev/null 2>&1; then
            wget -O "$DOWNLOAD_FILE" "$URL"
        else
            echo "  ERROR: Neither curl nor wget found"
            continue
        fi
        
        if [ ! -f "$DOWNLOAD_FILE" ]; then
            echo "  ERROR: Failed to download $FILENAME"
        else
            echo "  Downloaded successfully"
        fi
    else
        echo "  Already downloaded"
    fi
    echo
done

echo "Building packages for all platforms..."
echo

# Build packages for each platform
for PLATFORM in "${PLATFORMS[@]}"; do
    case "$PLATFORM" in
        win-*)
            build_windows "$PLATFORM"
            ;;
        linux-*)
            build_linux "$PLATFORM"
            ;;
        osx-*)
            build_macos "$PLATFORM"
            ;;
    esac
done

echo
echo "========================================"
echo "    All Platform Builds Complete!"
echo "========================================"
echo
echo "Built packages:"
ls -1 dist/Willowmere-v1.0.0-* 2>/dev/null || echo "No packages found"
echo
echo "All packages are portable and include:"
echo "  - Complete game with NW.js runtime"
echo "  - All source files for modding"
echo "  - Installation instructions"
echo "  - Launch scripts"
echo

build_windows() {
    local PLATFORM="$1"
    local BUILD_DIR="build/$PLATFORM"
    local PACKAGE_DIR="$BUILD_DIR/Willowmere"
    local NWJS_FILE="build/nwjs-${NWJS_VERSION}-${PLATFORM}.zip"
    
    echo "Building Windows package for $PLATFORM..."
    
    # Clean and create directories
    rm -rf "$PACKAGE_DIR"
    mkdir -p "$PACKAGE_DIR"
    
    # Extract NW.js
    if command -v unzip >/dev/null 2>&1; then
        unzip -q "$NWJS_FILE" -d "$BUILD_DIR/temp"
        mv "$BUILD_DIR/temp/nwjs-${NWJS_VERSION}-${PLATFORM}"/* "$PACKAGE_DIR/"
        rm -rf "$BUILD_DIR/temp"
    else
        echo "  WARNING: unzip not found, skipping Windows build for $PLATFORM"
        return
    fi
    
    # Copy game files
    copy_game_files "$PACKAGE_DIR"
    
    # Rename executable
    [ -f "$PACKAGE_DIR/nw.exe" ] && mv "$PACKAGE_DIR/nw.exe" "$PACKAGE_DIR/Willowmere.exe"
    
    # Create launch script
    cat > "$PACKAGE_DIR/Launch Willowmere.bat" << 'EOF'
@echo off
cd /d "%~dp0"
start "" "Willowmere.exe"
EOF
    
    # Create install instructions
    create_install_instructions "$PACKAGE_DIR" "Windows" "Launch Willowmere.bat or Willowmere.exe"
    
    # Create ZIP
    local ZIP_NAME="Willowmere-v1.0.0-${PLATFORM}-Portable.zip"
    rm -f "dist/$ZIP_NAME"
    
    if command -v zip >/dev/null 2>&1; then
        (cd "$BUILD_DIR" && zip -r "../../dist/$ZIP_NAME" Willowmere/ >/dev/null)
        echo "  Created: $ZIP_NAME"
    else
        echo "  WARNING: zip not found, cannot create $ZIP_NAME"
    fi
}

build_linux() {
    local PLATFORM="$1"
    local BUILD_DIR="build/$PLATFORM"
    local PACKAGE_DIR="$BUILD_DIR/Willowmere"
    local NWJS_FILE="build/nwjs-${NWJS_VERSION}-${PLATFORM}.tar.gz"
    
    echo "Building Linux package for $PLATFORM..."
    
    # Clean and create directories
    rm -rf "$PACKAGE_DIR"
    mkdir -p "$PACKAGE_DIR"
    
    # Extract NW.js
    tar -xzf "$NWJS_FILE" -C "$BUILD_DIR/temp" 2>/dev/null || mkdir -p "$BUILD_DIR/temp"
    mv "$BUILD_DIR/temp/nwjs-${NWJS_VERSION}-${PLATFORM}"/* "$PACKAGE_DIR/" 2>/dev/null || {
        echo "  WARNING: Failed to extract $PLATFORM package"
        return
    }
    rm -rf "$BUILD_DIR/temp"
    
    # Copy game files
    copy_game_files "$PACKAGE_DIR"
    
    # Rename executable and make it executable
    [ -f "$PACKAGE_DIR/nw" ] && mv "$PACKAGE_DIR/nw" "$PACKAGE_DIR/Willowmere"
    chmod +x "$PACKAGE_DIR/Willowmere" 2>/dev/null
    
    # Create launch script
    cat > "$PACKAGE_DIR/launch-willowmere.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
./Willowmere .
EOF
    chmod +x "$PACKAGE_DIR/launch-willowmere.sh"
    
    # Create install instructions
    create_install_instructions "$PACKAGE_DIR" "Linux" "./launch-willowmere.sh or ./Willowmere"
    
    # Create TAR.GZ
    local TAR_NAME="Willowmere-v1.0.0-${PLATFORM}-Portable.tar.gz"
    rm -f "dist/$TAR_NAME"
    (cd "$BUILD_DIR" && tar -czf "../../dist/$TAR_NAME" Willowmere/)
    echo "  Created: $TAR_NAME"
}

build_macos() {
    local PLATFORM="$1"
    local BUILD_DIR="build/$PLATFORM"
    local PACKAGE_DIR="$BUILD_DIR/Willowmere"
    local NWJS_FILE="build/nwjs-${NWJS_VERSION}-${PLATFORM}.zip"
    
    echo "Building macOS package for $PLATFORM..."
    
    # Clean and create directories
    rm -rf "$PACKAGE_DIR"
    mkdir -p "$PACKAGE_DIR"
    
    # Extract NW.js
    if command -v unzip >/dev/null 2>&1; then
        unzip -q "$NWJS_FILE" -d "$BUILD_DIR/temp"
        mv "$BUILD_DIR/temp/nwjs-${NWJS_VERSION}-${PLATFORM}"/* "$PACKAGE_DIR/"
        rm -rf "$BUILD_DIR/temp"
    else
        echo "  WARNING: unzip not found, skipping macOS build for $PLATFORM"
        return
    fi
    
    # Copy game files
    copy_game_files "$PACKAGE_DIR"
    
    # Create launch script
    cat > "$PACKAGE_DIR/launch-willowmere.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
./nwjs.app/Contents/MacOS/nwjs .
EOF
    chmod +x "$PACKAGE_DIR/launch-willowmere.sh"
    
    # Create install instructions
    create_install_instructions "$PACKAGE_DIR" "macOS" "./launch-willowmere.sh or open nwjs.app"
    
    # Create ZIP
    local ZIP_NAME="Willowmere-v1.0.0-${PLATFORM}-Portable.zip"
    rm -f "dist/$ZIP_NAME"
    
    if command -v zip >/dev/null 2>&1; then
        (cd "$BUILD_DIR" && zip -r "../../dist/$ZIP_NAME" Willowmere/ >/dev/null)
        echo "  Created: $ZIP_NAME"
    else
        echo "  WARNING: zip not found, cannot create $ZIP_NAME"
    fi
}

copy_game_files() {
    local TARGET_DIR="$1"
    
    # Copy game files
    cp -r src/ "$TARGET_DIR/"
    cp index.html "$TARGET_DIR/"
    cp main.js "$TARGET_DIR/"
    cp style.css "$TARGET_DIR/"
    cp package.json "$TARGET_DIR/"
    cp tilemap.json "$TARGET_DIR/"
    cp objectmap.json "$TARGET_DIR/"
    cp npcs.json "$TARGET_DIR/"
    cp dialogue.json "$TARGET_DIR/"
    cp README.md "$TARGET_DIR/"
    [ -f LICENSE ] && cp LICENSE "$TARGET_DIR/LICENSE.txt"
}

create_install_instructions() {
    local TARGET_DIR="$1"
    local OS_NAME="$2"
    local RUN_CMD="$3"
    
    cat > "$TARGET_DIR/INSTALL.txt" << EOF
Willowmere - Installation Instructions

This is a portable version of Willowmere for $OS_NAME.
No installation required!

To run the game:
- $RUN_CMD

The game is fully moddable - see README.md for details.
EOF

    cat > "$TARGET_DIR/MODDING.txt" << EOF
Willowmere - Modding Information

This game is designed to be easily moddable!

Key files you can modify:
- src/assets/ - All game textures and sprites
- tilemap.json - Map layout and tile data
- objectmap.json - Placed objects and buildings
- npcs.json - NPC data and positions
- dialogue.json - NPC dialogue
- src/*.js - Game logic and mechanics

Happy modding!
EOF
}
