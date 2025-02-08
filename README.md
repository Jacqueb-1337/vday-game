# Cozy Adventure Game

## Overview
Cozy Adventure Game is a painterly 32x32 tile-based adventure game built using Three.js. The game features a linear story progression and includes a developer mode for defining walkable tiles.

## Features
- **Tile-based World**: Explore a beautifully crafted 32x32 tile world.
- **Orthographic Camera**: Experience the game from a unique perspective with an orthographic camera setup.
- **Linear Story Progression**: Follow an engaging storyline as you progress through the game.
- **Developer Mode**: Easily define walkable tiles for custom game design.

## Project Structure
```
cozy-adventure-game
├── src
│   ├── assets
│   │   ├── tiles
│   │   └── characters
│   ├── components
│   │   ├── Camera.ts
│   │   ├── Game.ts
│   │   └── DeveloperMode.ts
│   ├── scenes
│   │   └── MainScene.ts
│   ├── shaders
│   ├── utils
│   │   └── TileUtils.ts
│   ├── index.ts
│   └── types
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/cozy-adventure-game.git
   ```
2. Navigate to the project directory:
   ```
   cd cozy-adventure-game
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Usage
To start the game, run:
```
npm start
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.