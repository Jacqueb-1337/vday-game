#!/bin/bash

echo "========================================"
echo "       Quick Installer Build"
echo "========================================"
echo

# Check if NW.js is already set up
if [ ! -d "nwjs" ]; then
    echo "ERROR: NW.js not found!"
    echo "Please run one of these first:"
    echo "  ./setup-dev.sh  - Development version"
    echo "  ./setup-prod.sh - Production version (recommended)"
    echo
    exit 1
fi

echo "Building installers..."
chmod +x build-installers.sh
./build-installers.sh

echo
echo "Build complete! Check dist/ directory for installer files."
