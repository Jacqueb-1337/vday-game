import * as THREE from 'three';
import { scene } from '../main.js'; // Import scene from main.js
import { getLayerIndex } from './textureLayers.js'; // Import getLayerIndex function
const path = require('path'); // Import path module
const fs = require('fs'); // Import fs module

export let tilemap = [];
export const tiles = [];
const textureLoader = new THREE.TextureLoader();

// Determine the correct path for tilemap.json
const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
export const tilemapPath = path.join(nw.__dirname, 'tilemap.json');

// Log the full path of tilemap.json
console.log(`Loading tilemap from: ${tilemapPath}`);

// Load Tilemap JSON (with cache-busting)
export function loadTilemap() {
    return fetch(`${tilemapPath}?v=${new Date().getTime()}`)
        .then(res => res.json())
        .then(data => {
            tilemap = data.tiles;
            console.log("Loaded tilemap:", JSON.stringify(tilemap, null, 2));
            createTilemap();
        });
}

// Create a Grid of Tiles
const loadTileTexture = (path) => {
    const texture = textureLoader.load(path, (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        tex.needsUpdate = true;
    });
    return texture;
};

export function createTilemap() {
    const minX = Math.min(...tilemap.map(t => t.x));
    const maxX = Math.max(...tilemap.map(t => t.x));
    const minY = Math.min(...tilemap.map(t => t.y));
    const maxY = Math.max(...tilemap.map(t => t.y));

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            let geometry = new THREE.PlaneGeometry(1, 1);
            let tileData = tilemap.find(t => t.x === x && t.y === y);
            let material;

            if (tileData && tileData.type) {
                const texturePath = `src/assets/tiles/${tileData.type}.png`;
                const texture = loadTileTexture(texturePath);
                material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true, // Allow transparency for overlay textures
                    opacity: 1.0, // Set opacity to fully opaque
                    blending: THREE.NormalBlending // Use normal blending mode
                });

                // Handle subtype for underlying texture
                if (tileData.subtype) {
                    const subtypePath = `src/assets/tiles/${tileData.subtype}.png`;
                    const subtypeTexture = loadTileTexture(subtypePath);
                    const subtypeMaterial = new THREE.MeshBasicMaterial({
                        map: subtypeTexture,
                        transparent: false, // Ensure the material is not transparent
                        opacity: 1.0, // Set opacity to fully opaque
                        blending: THREE.NormalBlending // Use normal blending mode
                    });

                    let subtypeTile = new THREE.Mesh(geometry, subtypeMaterial);
                    subtypeTile.position.set(x, y, getLayerIndex(tileData.subtype)); // Set z position based on subtype layer
                    scene.add(subtypeTile);
                } else {
                    // Default to grassgeneric.png if no subtype is specified
                    const defaultSubtypePath = 'src/assets/tiles/grassgeneric.png';
                    const defaultSubtypeTexture = loadTileTexture(defaultSubtypePath);
                    const defaultSubtypeMaterial = new THREE.MeshBasicMaterial({
                        map: defaultSubtypeTexture,
                        transparent: false, // Ensure the material is not transparent
                        opacity: 1.0, // Set opacity to fully opaque
                        blending: THREE.NormalBlending // Use normal blending mode
                    });

                    let defaultSubtypeTile = new THREE.Mesh(geometry, defaultSubtypeMaterial);
                    defaultSubtypeTile.position.set(x, y, getLayerIndex('grassgeneric')); // Set z position based on default subtype layer
                    scene.add(defaultSubtypeTile);
                }
            } else {
                // Default to grassgeneric.png and sprinkle in grassweeds.png
                const texturePath = Math.random() < 0.1 ? 'src/assets/tiles/grassweeds.png' : 'src/assets/tiles/grassgeneric.png';
                const texture = loadTileTexture(texturePath);
                material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: false, // Ensure the material is not transparent
                    opacity: 1.0, // Set opacity to fully opaque
                    blending: THREE.NormalBlending // Use normal blending mode
                });
            }

            let tile = new THREE.Mesh(geometry, material);
            tile.position.set(x, y, tileData?.type ? getLayerIndex(tileData.type) : 0); // Set the layer index based on texture type
            tile.userData = { ...tileData }; // Preserve all attributes
            scene.add(tile);
            tiles.push(tile);
        }
    }
}

// Update Tilemap Array
export function updateTilemap() {
    tilemap = tiles.map(tile => ({
        x: tile.position.x,
        y: tile.position.y,
        ...tile.userData // Preserve all attributes
    }));
    console.log("Updated tilemap:", JSON.stringify(tilemap, null, 2));
}

// Save Updated Tilemap (Uses NW.js methods to update JSON file)
export function saveTilemap() {
    console.log(`Saving tilemap to: ${tilemapPath}`);
    console.log('Tilemap before saving:', JSON.stringify(tilemap, null, 2));
    try {
        fs.writeFileSync(tilemapPath, JSON.stringify({ tiles: tilemap }, null, 2));
        console.log('Tilemap saved successfully');
        console.log('Tilemap after saving:', JSON.stringify(tilemap, null, 2));
        // No longer reload the tilemap to prevent NW.js caching issues
    } catch (error) {
        console.error('Error saving tilemap:', error);
    }
}
