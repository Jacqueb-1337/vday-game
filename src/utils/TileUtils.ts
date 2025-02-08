export function isWalkable(tile: string): boolean {
    const walkableTiles = ['grass', 'path', 'water']; // Example walkable tiles
    return walkableTiles.includes(tile);
}

export function loadTiles(tileData: string[]): string[] {
    // Load tiles from provided data
    return tileData.map(tile => tile.trim());
}

export function getTileAt(x: number, y: number, tileMap: string[][]): string {
    if (y < 0 || y >= tileMap.length || x < 0 || x >= tileMap[y].length) {
        throw new Error('Coordinates out of bounds');
    }
    return tileMap[y][x];
}