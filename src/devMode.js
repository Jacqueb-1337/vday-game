import * as THREE from 'three';
import { updateTilemap, saveTilemap, tiles, tilemap, renderer, camera, scene } from '../main.js';

let _devMode = false; // Internal variable to hold the devMode state
let mousePosition = new THREE.Vector2(); // Global variable to store the latest mouse position

// Define a reactive devMode property on the window object
Object.defineProperty(window, 'devMode', {
    get() {
        return _devMode;
    },
    set(value) {
        _devMode = value;
        window.disableCollision = value; // Set disableCollision based on devMode
        console.log(`Dev Mode is now: ${_devMode}`);
    }
});

// Export devMode for use in other modules
export const devMode = window.devMode;

// Dev Mode - Right-Click to Toggle Walkable Tiles
document.addEventListener("contextmenu", (event) => {
    if (!window.devMode) return;
    event.preventDefault();
    if (window.devMode) {
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children);

        if (intersects.length > 0) {
            const hoveredTile = intersects[0].object;
            hoveredTile.userData.walkable = !hoveredTile.userData.walkable;
            hoveredTile.material.color.set(hoveredTile.userData.walkable ? 0x88cc88 : 0x444444); // Change color based on walkability
            updateTilemap();
            saveTilemap();
        }
    }
});

// Dev Mode - Left-Click to Add or Delete Tiles
let lastClickedTile = { x: null, y: null };
document.addEventListener("click", (event) => {
    if (!window.devMode) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    const worldPosition = new THREE.Vector3();
    raycaster.ray.at(0, worldPosition);

    if (intersects.length > 0) {
        // Delete the tile if it exists
        const hoveredTile = intersects[0].object;
        scene.remove(hoveredTile);
        const tileIndex = tiles.indexOf(hoveredTile);
        if (tileIndex > -1) {
            tiles.splice(tileIndex, 1);
        }
        const tilemapIndex = tilemap.findIndex(t => t.x === hoveredTile.position.x && t.y === hoveredTile.position.y);
        if (tilemapIndex > -1) {
            tilemap.splice(tilemapIndex, 1);
        }
        updateTilemap();
        saveTilemap();
    } else {
        // Add a new tile if it doesn't exist
        const x = Math.round(worldPosition.x);
        const y = Math.round(worldPosition.y);

        let existingTile = tilemap.find(t => t.x === x && t.y === y);
        let newTileData = existingTile ? { ...existingTile, walkable: true } : { x, y, walkable: true };

        if (!tiles.some(tile => tile.position.x === x && tile.position.y === y)) {
            let geometry = new THREE.PlaneGeometry(1, 1);
            let material = new THREE.MeshBasicMaterial({ color: 0x88cc88 });
            let tile = new THREE.Mesh(geometry, material);
            tile.position.set(x, y, 0);
            tile.userData = newTileData; // Preserve all attributes
            scene.add(tile);
            tiles.push(tile);
            tilemap.push(newTileData);
            updateTilemap();
            saveTilemap();
        }
    }

    // Prevent rapid duplicate tile creation
    lastClickedTile = { x: Math.round(worldPosition.x), y: Math.round(worldPosition.y) };
    setTimeout(() => {
        lastClickedTile = { x: null, y: null };
    }, 200);
});

// Dev Mode - Space Key to Change Tile Type
document.addEventListener("keydown", (event) => {
    if (!window.devMode || event.key !== " ") return;
    event.preventDefault();

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mousePosition, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const hoveredTile = intersects[0].object;
        const newType = prompt("Enter new type for the tile:", hoveredTile.userData.type || "");
        if (newType !== null) {
            hoveredTile.userData.type = newType;
            updateTilemap();
            saveTilemap();
        }
    }
});

// Highlight Tile on Hover in Dev Mode
document.addEventListener("mousemove", (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mousePosition.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mousePosition, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (window.devMode) {
        tiles.forEach(tile => {
            tile.material.color.set(tile.userData.walkable ? 0x00ff00 : 0xff0000); // Green for walkable, red for non-walkable
        });

        if (intersects.length > 0) {
            const hoveredTile = intersects[0].object;
            hoveredTile.material.color.setHex(0xaaaaaa); // Highlight color
        }
    } else {
        tiles.forEach(tile => {
            tile.material.color.set(tile.userData.walkable ? 0x333333 : 0x111111);
        });
    }
});
