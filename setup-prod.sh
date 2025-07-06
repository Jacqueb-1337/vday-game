#!/bin/bash

echo "========================================"
echo "      Willowmere Production Setup"
echo "========================================"
echo
echo "This will:"
echo "  1. Download production NW.js"
echo "  2. Build installers for distribution"
echo

# Make setup script executable and run it
chmod +x setup.sh
./setup.sh prod

# Check if setup was successful
if [ $? -ne 0 ]; then
    echo
    echo "ERROR: NW.js setup failed. Cannot build installers."
    exit 1
fi

echo
echo "========================================"
echo "       Building Installers..."
echo "========================================"
echo

# Build installers
chmod +x build-installers.sh
./build-installers.sh

echo
echo "========================================"
echo "    Production Build Complete!"
echo "========================================"
echo
echo "Your game is ready for distribution!"
echo "Check the dist/ directory for installer files."
echo
