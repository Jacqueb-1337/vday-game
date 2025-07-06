# Willowmere Makefile
# Simple commands for setting up and running the game

# Default target
.PHONY: help setup setup-dev setup-prod run build clean build

help:
	@echo "Willowmere - Available commands:"
	@echo "  make setup      - Interactive setup (choose dev/prod)"
	@echo "  make setup-dev  - Setup development version"
	@echo "  make setup-prod - Setup production version + build installers" 
	@echo "  make run        - Run the game (after setup)"
	@echo "  make build      - Build installers (after setup)"
	@echo "  make clean      - Remove NW.js installation"
	@echo "  make help       - Show this help"

# Detect platform
UNAME_S := $(shell uname -s 2>/dev/null || echo Windows)

# Setup targets
setup:
ifeq ($(UNAME_S),Windows)
	@cmd /c setup.bat
else
	@chmod +x setup.sh && ./setup.sh
endif

setup-dev:
ifeq ($(UNAME_S),Windows)
	@cmd /c setup-dev.bat
else
	@chmod +x setup-dev.sh && ./setup-dev.sh
endif

setup-prod:
ifeq ($(UNAME_S),Windows)
	@cmd /c setup-prod.bat
else
	@chmod +x setup-prod.sh && ./setup-prod.sh
endif

# Run the game
run:
ifeq ($(UNAME_S),Windows)
	@if exist nwjs\nw.exe (nwjs\nw.exe .) else (echo ERROR: NW.js not found. Run 'make setup' first.)
else
	@if [ -d "nwjs" ]; then \
		if [ -f "launch.sh" ]; then ./launch.sh; \
		else echo "ERROR: launch.sh not found. Run 'make setup' first."; fi; \
	else echo "ERROR: NW.js not found. Run 'make setup' first."; fi
endif

# Build installers
build:
ifeq ($(UNAME_S),Windows)
	@cmd /c build-installers.bat
else
	@chmod +x build-installers.sh && ./build-installers.sh
endif

# Clean installation
clean:
ifeq ($(UNAME_S),Windows)
	@if exist nwjs rmdir /s /q nwjs
	@if exist launch.bat del launch.bat
	@echo NW.js installation cleaned.
else
	@rm -rf nwjs launch.sh
	@echo "NW.js installation cleaned."
endif
