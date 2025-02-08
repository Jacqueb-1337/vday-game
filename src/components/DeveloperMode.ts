class DeveloperMode {
    private walkableTiles: Set<string>;

    constructor() {
        this.walkableTiles = new Set();
    }

    enable() {
        // Logic to enable developer mode
        console.log("Developer mode enabled");
    }

    disable() {
        // Logic to disable developer mode
        console.log("Developer mode disabled");
    }

    setWalkableTiles(tiles: string[]) {
        this.walkableTiles.clear();
        tiles.forEach(tile => this.walkableTiles.add(tile));
        console.log("Walkable tiles set:", this.walkableTiles);
    }

    isTileWalkable(tile: string): boolean {
        return this.walkableTiles.has(tile);
    }
}

export default DeveloperMode;