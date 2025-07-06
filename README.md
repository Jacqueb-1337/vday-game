# Willowmere

A magical 2D game with 3D movement capabilities, similar to Stardew Valley's top-down perspective, built with Three.js and NW.js. Explore the enchanting world of Willowmere, collect fireflies, and discover its secrets.

## 🚀 Quick Start

### First Time Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd willowmere
   ```

2. **Run the setup script**
   
   **Windows:**
   ```cmd
   setup.bat
   ```
   
   **Linux/macOS:**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
   
   **Or use Makefile:**
   ```bash
   make setup
   ```
   
   The setup will ask you to choose between:
   - **Production**: Smaller download, optimized for end users
   - **Development**: Includes DevTools for debugging

3. **Start the game**
   
   **Windows:** Double-click `launch.bat`
   
   **Linux/macOS:** Run `./launch.sh`
   
   **Or:** `make run`

### Quick Setup Options

**Development Version (with DevTools):**
- Windows: `setup-dev.bat`
- Linux/macOS: `./setup-dev.sh`
- Makefile: `make setup-dev`

**Production Version (optimized + builds installers):**
- Windows: `setup-prod.bat`
- Linux/macOS: `./setup-prod.sh`
- Makefile: `make setup-prod`

> **Note:** Production setup automatically builds installers for distribution after downloading NW.js.

## 🛠️ Development

### Dev Mode Features

Press `` ` `` (backtick) in-game to toggle dev mode:

- **Tile Editing**: Right-click to edit tile properties
- **World Expansion**: Add new areas to the map
- **Object Placement**: Place buildings and objects with PNG overlays
- **Walkability Tool**: Toggle tile walkability in expansion mode
- **Visual Grid**: See tile boundaries and coordinates

### Key Controls

- **WASD**: Move player
- **E**: Collect fireflies
- **F5**: Refresh/reload map (preserves overlays)
- **`` ` ``**: Toggle dev mode
- **Mouse**: Dev mode interactions

### Map Refresh

Press **F5** to refresh the map without restarting the game. This:
- Reloads all tiles from tilemap.json
- Preserves object overlays and dev mode state
- Maintains building placements and NPC positions

## 🎮 Game Features

### Dynamic Z-Index System
- Player appears behind objects when approaching from north
- Player appears in front when approaching from south  
- Applies to: tall grass, trees, houses, buildings, fences, NPCs
- Automatic layering based on position

### Object & Building System
- PNG-based object overlays
- Persistent placement (saves to objectmap.json)
- Real-time preview with origin markers
- Scroll-to-resize functionality
- Undo/redo support

### Dev Mode Tools
- **Expansion Mode**: Create, erase, or edit walkability
- **Tile Properties**: Edit tile types and walkability
- **Object Placement**: Visual object browser and placement
- **Undo/Redo**: Full history for all operations

## 📁 Project Structure

```
willowmere/
├── src/                    # Source code
│   ├── components/         # Game components
│   ├── assets/            # Game assets (textures, sprites)
│   ├── DevModeManager.js  # Dev mode functionality
│   ├── BuildingManager.js # Object/building system
│   └── ...
├── nwjs/                  # NW.js runtime (auto-downloaded)
├── scripts/               # Build and setup scripts
├── tilemap.json          # Map tile data
├── objectmap.json        # Placed objects data
├── package.json          # Project configuration
└── index.html            # Main entry point
```

## 🔧 Scripts Reference

| Command | Description |
|---------|-------------|
| `setup.bat` / `setup.sh` | Interactive setup (choose dev/prod) |
| `setup-dev.bat` / `setup-dev.sh` | Install development NW.js |
| `setup-prod.bat` / `setup-prod.sh` | Install production NW.js + build installers |
| `build-installers.bat` / `build-installers.sh` | Build installers (after setup) |
| `launch.bat` / `launch.sh` | Start game (auto-generated after setup) |
| `make setup` | Interactive setup using Makefile |
| `make setup-dev` | Development setup using Makefile |
| `make setup-prod` | Production setup + build installers using Makefile |
| `make build` | Build installers using Makefile |
| `make run` | Start game using Makefile |
| `make clean` | Remove NW.js installation |

## 🌟 Features

- **Dynamic Z-Index**: Proper depth sorting for 2D sprites in 3D space
- **Dev Mode**: Complete level editor with visual tools
- **Object System**: PNG-based buildings with persistent placement
- **Walkability Editing**: Visual walkability toggle tool
- **Map Expansion**: Add new areas dynamically
- **NPC System**: Collision detection and depth sorting
- **Atmospheric Elements**: Fireflies and particle effects

## 🎯 Game Architecture

- **Engine**: Three.js for 3D rendering
- **Runtime**: NW.js for desktop deployment
- **Build Tool**: Custom setup system with automatic NW.js download
- **Rendering**: 2D sprites in 3D space with proper depth sorting
- **Camera**: Top-down perspective with slight angle for depth

## 📦 Building Installers

Willowmere supports building native installers for all major platforms while keeping the game fully moddable.

### Prerequisites

1. **Setup the game first:**
   ```bash
   # Windows
   setup-prod.bat
   
   # Linux/macOS  
   ./setup-prod.sh
   ```

2. **Platform-specific requirements:**
   - **Windows**: [Inno Setup 6](https://jrsoftware.org/isinfo.php)
   - **macOS**: Xcode command line tools (`xcode-select --install`)
   - **Linux**: `dpkg-deb` (usually pre-installed)

### Building Installers

**Automatic (Recommended):**
```bash
# Windows - Sets up production NW.js and builds installers
setup-prod.bat

# Linux/macOS - Sets up production NW.js and builds installers
./setup-prod.sh

# Using Makefile
make setup-prod
```

**Manual (after setup):**
```bash
# Windows
build-installers.bat

# Linux/macOS
./build-installers.sh

# Using Makefile
make build
```

**Build for specific platform:**
```bash
# Windows only
build-installers.bat windows

# macOS only (on macOS)
./build-installers.sh macos

# Linux only (on Linux)
./build-installers.sh linux

# All platforms (where supported)
./build-installers.sh all
```

### Installer Features

- **Windows**: `.exe` installer with Inno Setup
  - Installs to `Program Files\jacqueb\Willowmere\`
  - Renames `nw.exe` to `Willowmere.exe`
  - Creates desktop shortcut and start menu entries
  - File associations for save files

- **macOS**: `.app` bundle and `.dmg`
  - Creates `Willowmere.app` 
  - Option to install to `/Applications/jacqueb/`
  - All files accessible in app bundle for modding

- **Linux**: `.deb` package and `.tar.gz`
  - Installs to `/opt/jacqueb/willowmere/`
  - Creates desktop entry and command-line access
  - Symlink to `/usr/local/bin/willowmere`

### Modding-Friendly Design

All installers preserve the complete source code structure:
- Game assets in accessible directories
- JSON configuration files editable
- JavaScript source code available
- Clear modding documentation included

## 🚨 Troubleshooting

### Setup Issues
- Ensure you have Node.js installed
- Check internet connection for NW.js download
- Run `npm run clean` and try setup again

### Game Won't Start
- Make sure setup completed successfully
- Check that `nwjs/` directory exists and contains files
- Try running setup again

### Dev Mode Not Working
- Toggle with backtick key (`` ` ``)
- Check console for error messages
- Try refreshing with F5

## 📝 License

MIT License - see LICENSE file for details.
