#!/bin/bash

echo "========================================"
echo "       Willowmere Installer Builder"
echo "========================================"
echo

# Check if NW.js is set up
if [ ! -d "nwjs" ]; then
    echo "ERROR: NW.js not found!"
    echo "Please run setup script first:"
    echo "  Windows: setup-prod.bat"
    echo "  Linux/macOS: ./setup-prod.sh"
    exit 1
fi

# Create dist directory
mkdir -p dist build

# Parse arguments
BUILD_TARGET="$1"

show_help() {
    echo "Usage: $0 [target]"
    echo
    echo "Targets:"
    echo "  windows  - Build Windows installer (requires Inno Setup)"
    echo "  macos    - Build macOS app bundle and DMG"
    echo "  linux    - Build Linux DEB and tarball"
    echo "  all      - Build for all platforms"
    echo "  help     - Show this help"
    echo
    echo "Examples:"
    echo "  $0 windows"
    echo "  $0 all"
}

build_windows() {
    echo "Building Windows installer..."
    if [ -f "build-installer.bat" ]; then
        if command -v cmd.exe >/dev/null 2>&1; then
            cmd.exe /c build-installer.bat
        else
            echo "Windows build requires Windows or WSL with cmd.exe access"
            return 1
        fi
    else
        echo "Windows build script not found"
        return 1
    fi
}

build_macos() {
    echo "Building macOS package..."
    if [ -f "build-installer-macos.sh" ]; then
        chmod +x build-installer-macos.sh
        ./build-installer-macos.sh
    else
        echo "macOS build script not found"
        return 1
    fi
}

build_linux() {
    echo "Building Linux package..."
    if [ -f "build-installer-linux.sh" ]; then
        chmod +x build-installer-linux.sh
        ./build-installer-linux.sh
    else
        echo "Linux build script not found"
        return 1
    fi
}

case "$BUILD_TARGET" in
    "windows")
        build_windows
        ;;
    "macos")
        build_macos
        ;;
    "linux")
        build_linux
        ;;    "all")
        echo "Building for all platforms..."
        echo
        chmod +x build-all-platforms.sh
        ./build-all-platforms.sh
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    "")
        echo "No target specified. Building for current platform..."
        
        # Detect platform
        case "$(uname -s)" in
            Darwin)
                build_macos
                ;;
            Linux)
                build_linux
                ;;
            CYGWIN*|MINGW*|MSYS*)
                build_windows
                ;;
            *)
                echo "Unknown platform. Please specify target manually."
                show_help
                exit 1
                ;;
        esac
        ;;
    *)
        echo "Unknown target: $BUILD_TARGET"
        show_help
        exit 1
        ;;
esac

echo
echo "========================================"
echo "           Build Complete!"
echo "========================================"
echo
echo "Check the dist/ directory for installer files."
echo "All installers preserve source code for easy modding!"
echo
