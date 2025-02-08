export interface Tile {
    id: number;
    walkable: boolean;
    sprite: string; // Path to the tile sprite
}

export interface Character {
    id: number;
    name: string;
    sprite: string; // Path to the character sprite
    position: { x: number; y: number }; // Character position in the world
}

export interface GameConfig {
    title: string;
    width: number;
    height: number;
    tileSize: number; // Size of each tile in pixels
    initialScene: string; // Name of the initial scene to load
}