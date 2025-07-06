#!/bin/bash

echo "========================================"
echo "          VDay Game Setup"
echo "========================================"
echo

# NW.js version to download
NWJS_VERSION="v0.82.0"

# Parse arguments
BUILD_TYPE="$1"
if [ -z "$BUILD_TYPE" ]; then
    echo "Which NW.js version do you want?"
    echo "  1) Production (smaller, faster)"
    echo "  2) Development (includes DevTools)"
    echo
    read -p "Enter choice (1-2): " choice
    if [ "$choice" = "2" ]; then
        BUILD_TYPE="dev"
    else
        BUILD_TYPE="prod"
    fi
fi

# Set flavor based on build type
if [ "$BUILD_TYPE" = "dev" ]; then
    FLAVOR="sdk"
    echo "Setting up NW.js Development version with DevTools..."
else
    FLAVOR="normal"
    echo "Setting up NW.js Production version..."
fi

# Detect platform and architecture
OS=$(uname -s)
ARCH=$(uname -m)

case "$OS" in
    Darwin)
        if [ "$ARCH" = "arm64" ]; then
            PLATFORM="osx-arm64"
        else
            PLATFORM="osx-x64"
        fi
        EXTENSION="zip"
        EXECUTABLE="nwjs.app/Contents/MacOS/nwjs"
        ;;
    Linux)
        if [ "$ARCH" = "x86_64" ]; then
            PLATFORM="linux-x64"
        else
            PLATFORM="linux-ia32"
        fi
        EXTENSION="tar.gz"
        EXECUTABLE="nw"
        ;;
    *)
        echo "ERROR: Unsupported platform: $OS"
        exit 1
        ;;
esac

# Set download info
FILENAME="nwjs-${FLAVOR}-${NWJS_VERSION}-${PLATFORM}"
URL="https://dl.nwjs.io/${NWJS_VERSION}/${FILENAME}.${EXTENSION}"
DOWNLOAD_FILE="${FILENAME}.${EXTENSION}"

echo
echo "Downloading: $FILENAME"
echo "Platform: $PLATFORM"
echo "URL: $URL"
echo

# Clean existing installation
if [ -d "nwjs" ]; then
    echo "Cleaning existing NW.js installation..."
    rm -rf nwjs
fi

# Download NW.js
echo "Downloading NW.js... (this may take a few minutes)"
if command -v curl >/dev/null 2>&1; then
    curl -L -o "$DOWNLOAD_FILE" "$URL"
elif command -v wget >/dev/null 2>&1; then
    wget -O "$DOWNLOAD_FILE" "$URL"
else
    echo "ERROR: Neither curl nor wget found. Please install one of them."
    exit 1
fi

if [ ! -f "$DOWNLOAD_FILE" ]; then
    echo "ERROR: Failed to download NW.js"
    echo "Please check your internet connection and try again."
    exit 1
fi

echo "Download completed! Extracting..."

# Extract archive
if [ "$EXTENSION" = "zip" ]; then
    if command -v unzip >/dev/null 2>&1; then
        unzip -q "$DOWNLOAD_FILE"
    else
        echo "ERROR: unzip not found. Please install unzip."
        exit 1
    fi
else
    tar -xzf "$DOWNLOAD_FILE"
fi

if [ ! -d "$FILENAME" ]; then
    echo "ERROR: Failed to extract NW.js"
    exit 1
fi

# Rename extracted folder to nwjs
mv "$FILENAME" nwjs

if [ ! -d "nwjs" ]; then
    echo "ERROR: Failed to rename extracted folder"
    exit 1
fi

# Make executable (if not macOS app bundle)
if [ "$OS" != "Darwin" ]; then
    chmod +x "nwjs/$EXECUTABLE"
fi

# Clean up download file
rm "$DOWNLOAD_FILE"

# Create launch script
cat > launch.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
./nwjs/EXECUTABLE_PLACEHOLDER .
EOF

# Replace placeholder with actual executable path
sed -i.bak "s|EXECUTABLE_PLACEHOLDER|$EXECUTABLE|g" launch.sh
rm launch.sh.bak 2>/dev/null || true
chmod +x launch.sh

echo
echo "========================================"
echo "          Setup Complete!"
echo "========================================"
echo
echo "Your game is ready to run!"
echo
echo "To start the game:"
echo "  - Run: ./launch.sh"
echo "  - Or run: ./nwjs/$EXECUTABLE ."
echo
echo "NW.js $FLAVOR $NWJS_VERSION installed successfully!"
echo "Location: $(pwd)/nwjs/"
echo
