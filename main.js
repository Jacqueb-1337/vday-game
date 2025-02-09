import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { spawnFireflies, manageFireflies, fireflyCount } from './src/fireflies.js';
import { spawnRedFireflies, manageRedFireflies, redFireflyCount } from './src/redFireflies.js'; // Import red fireflies
import { devMode } from './src/devMode.js';
import { camera, updateCameraAspect } from './src/camera.js'; // Import camera and updateCameraAspect
import { moveDirection, velocity, maxSpeed, acceleration, deceleration } from './src/controls.js'; // Import controls
import { renderer, bloomLayer, composer, bloomPass, renderScene, setupRenderPass } from './src/render.js'; // Import rendering and bloom setup
import { loadTilemap, createTilemap, updateTilemap, saveTilemap, tilemap, tiles, tilemapPath } from './src/tilemap.js'; // Import tilemap logic and tilemapPath
import { drawDevModeMarkers } from './src/devModeMarkers.js'; // Import dev mode markers

// Remove Node requires so we're purely in an ESM environment
const fs = require('fs');
const path = require('path');

// Core Three.js Setup
export const scene = new THREE.Scene();
setupRenderPass(scene); // Setup render pass with the scene

// Log the full path of tilemap.json
console.log(`Loading tilemap from: ${tilemapPath}`);

// Load Tilemap JSON (with cache-busting)
loadTilemap().then(() => {
    spawnFireflies(tilemap, scene, bloomPass); // Ensure fireflies are spawned after tilemap is loaded
    manageFireflies(tilemap, scene, bloomPass); // Ensure fireflies are managed after tilemap is loaded
    spawnRedFireflies(tilemap, scene, bloomPass); // Ensure red fireflies are spawned after tilemap is loaded
    manageRedFireflies(tilemap, scene, bloomPass); // Ensure red fireflies are managed after tilemap is loaded
});

// Set Player Initial Position to the Nearest Walkable Tile to the Starting Coordinates
export function setPlayerInitialPosition(startX, startY) {
    let closestTile = null;
    let closestDistance = Infinity;

    tiles.forEach(tile => {
        if (tile.userData.walkable) {
            const distance = Math.hypot(tile.position.x - startX, tile.position.y - startY);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestTile = tile;
            }
        }
    });

    if (closestTile) {
        player.position.set(closestTile.position.x, closestTile.position.y, 1); // Set z position to 1
        hitbox.position.set(closestTile.position.x, closestTile.position.y, 1); // Set z position to 1
    } else {
        console.error('No walkable tile found for initial player position');
    }
}

// Player Setup
const textureLoader = new THREE.TextureLoader();
const loadTexture = (path) => {
    const texture = textureLoader.load(path);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
};

const playerTextures = {
    east: [
        loadTexture('src/assets/characters/player/player_east_1.png'), // Idle frame
        loadTexture('src/assets/characters/player/player_east_2.png'),
        loadTexture('src/assets/characters/player/player_east_3.png')
    ],
    west: [
        loadTexture('src/assets/characters/player/player_west_1.png'), // Idle frame
        loadTexture('src/assets/characters/player/player_west_2.png'),
        loadTexture('src/assets/characters/player/player_west_3.png')
    ],
    north: [
        loadTexture('src/assets/characters/player/player_north_1.png'), // Idle frame
        loadTexture('src/assets/characters/player/player_north_2.png'),
        loadTexture('src/assets/characters/player/player_north_3.png')
    ],
    south: [
        loadTexture('src/assets/characters/player/player_south_1.png'), // Idle frame
        loadTexture('src/assets/characters/player/player_south_2.png'),
        loadTexture('src/assets/characters/player/player_south_3.png')
    ]
};

let playerDirection = 'south';
let playerFrame = 1;
let playerFrameTime = 0;

export let playerGeometry = new THREE.PlaneGeometry(1, 1);
export let playerMaterial = new THREE.MeshBasicMaterial({ map: playerTextures[playerDirection][playerFrame], transparent: true });
export let player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.z = 1; // Ensure player is above the tiles
player.layers.set(2); // Set player layer index to 2
scene.add(player);

// Hitbox Setup
export let hitboxGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.1);
export let hitboxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: false, visible: false }); // Make hitbox invisible
export let hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
hitbox.position.z = 1; // Ensure hitbox is above the tiles
hitbox.layers.set(2); // Set hitbox layer index to 2
scene.add(hitbox);

// Firefly Collection System
let fireflies = [];
for (let i = 0; i < 5; i++) {
    let firefly = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
    firefly.position.set(Math.floor(Math.random() * 10 - 5), Math.floor(Math.random() * 10 - 5), 0);
    firefly.layers.enable(1); // Add firefly to bloomLayer
    scene.add(firefly);
    fireflies.push(firefly);
}

// Collect Fireflies
document.addEventListener("keydown", (event) => {
    if (event.key === "Alt") {
        fireflies.forEach((firefly, index) => {
            if (Math.abs(player.position.x - firefly.position.x) < 0.5 && Math.abs(player.position.y - firefly.position.y) < 0.5) {
                scene.remove(firefly);
                fireflies.splice(index, 1);
                fireflyCount++; // Increment fireflyCount
                console.log(`Collected firefly! Total: ${fireflyCount}`);
            }
        });
    }
});

// Gate Interaction (Unlocks Only If Enough Fireflies Are Collected)
document.addEventListener("keydown", (event) => {
    if (event.key === "Alt" && Math.abs(player.position.x - 4) < 0.5 && Math.abs(player.position.y - 4) < 0.5) {
        if (fireflyCount >= 5) {
            console.log("Gate unlocked!");
        } else {
            console.log("Collect more fireflies to unlock the gate.");
            console.log(`Fireflies needed: ${5 - fireflyCount}`);
            console.log(`Fireflies collected: ${fireflyCount}`);
        }
    }
});

// Adjust canvas size and camera aspect ratio on window resize
window.addEventListener('resize', () => {
    updateCameraAspect();
});

// Bounding box check
export function checkCollision(px, py, pw, ph, tx, ty, tw, th) {
    const tolerance = 0.02; // Slightly increased tolerance for collision
    const dx = Math.abs(px - tx);
    const dy = Math.abs(py - ty);
    return (dx < (pw / 2 + tw / 2 - tolerance)) && (dy < (ph / 2 + th / 2 - tolerance));
}

let prevDirection = 'south'; // Track the last movement direction
let prevMoveDirection = { x: 0, y: 0 }; // Track the last move direction

// Define textures that should behave this way
const dynamicZIndexTextures = ['tall_grass'];

// Game Render Loop
function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();

    // Update player velocity based on move direction
    if (moveDirection.x !== 0) {
        if (prevMoveDirection.x !== moveDirection.x) {
            velocity.x = moveDirection.x * acceleration;
        } else {
            velocity.x += moveDirection.x * acceleration;
            if (velocity.x > maxSpeed) velocity.x = maxSpeed;
            if (velocity.x < -maxSpeed) velocity.x = -maxSpeed;
        }
    } else {
        if (velocity.x > 0) {
            velocity.x -= deceleration;
            if (velocity.x < 0) velocity.x = 0;
        } else if (velocity.x < 0) {
            velocity.x += deceleration;
            if (velocity.x > 0) velocity.x = 0;
        }
    }

    if (moveDirection.y !== 0) {
        if (prevMoveDirection.y !== moveDirection.y) {
            velocity.y = moveDirection.y * acceleration;
        } else {
            velocity.y += moveDirection.y * acceleration;
            if (velocity.y > maxSpeed) velocity.y = maxSpeed;
            if (velocity.y < -maxSpeed) velocity.y = -maxSpeed;
        }
    } else {
        if (velocity.y > 0) {
            velocity.y -= deceleration;
            if (velocity.y < 0) velocity.y = 0;
        } else if (velocity.y < 0) {
            velocity.y += deceleration;
            if (velocity.y > 0) velocity.y = 0;
        }
    }

    // Normalize velocity when moving diagonally
    if (moveDirection.x !== 0 && moveDirection.y !== 0) {
        const diagonalSpeed = maxSpeed / Math.sqrt(2);
        velocity.x = moveDirection.x * diagonalSpeed;
        velocity.y = moveDirection.y * diagonalSpeed;
    }

    // Calculate new player position
    let newX = player.position.x + velocity.x;
    let newY = player.position.y + velocity.y;

    // Check for collisions on each axis separately
    let canMoveX = true;
    let canMoveY = true;

    if (!window.disableCollision) {
        tiles.forEach(t => {
            if (!t.userData.walkable) {
                if (checkCollision(newX, player.position.y, hitbox.geometry.parameters.width, hitbox.geometry.parameters.height, t.position.x, t.position.y, 1, 1)) {
                    canMoveX = false;
                }
                if (checkCollision(player.position.x, newY, hitbox.geometry.parameters.width, hitbox.geometry.parameters.height, t.position.x, t.position.y, 1, 1)) {
                    canMoveY = false;
                }
            }
        });
    }

    // Update player position based on collision checks
    if (canMoveX) {
        player.position.x = newX;
        hitbox.position.x = newX;
    } else {
        velocity.x = 0;
    }

    if (canMoveY) {
        player.position.y = newY;
        hitbox.position.y = newY;
    } else {
        velocity.y = 0;
    }

    // Update camera position to follow the player
    camera.position.x = player.position.x;
    camera.position.y = player.position.y;
    camera.updateProjectionMatrix();

    // Update player's coordinates display
    document.getElementById('coords').innerText = `X: ${player.position.x.toFixed(2)}, Y: ${player.position.y.toFixed(2)}`;

    // Update walkability status display
    const isWalkable = tiles.some(t => checkCollision(player.position.x, player.position.y, hitbox.geometry.parameters.width, hitbox.geometry.parameters.height, t.position.x, t.position.y, 1, 1) && t.userData.walkable);
    document.getElementById('walkable').innerText = `Walkable: ${isWalkable ? 'Yes' : 'No'}`;

    // Toggle wireframe visibility based on dev mode
    hitbox.material.wireframe = window.devMode;

    // Update player texture based on direction and animation frame
    if (moveDirection.x > 0) playerDirection = 'east';
    else if (moveDirection.x < 0) playerDirection = 'west';
    else if (moveDirection.y > 0) playerDirection = 'north';
    else if (moveDirection.y < 0) playerDirection = 'south';

    // Reset animation frame if direction changes
    if (playerDirection !== prevDirection) {
        playerFrame = 1;
        playerFrameTime = 0;
        prevDirection = playerDirection;
    }

    if (moveDirection.x !== 0 || moveDirection.y !== 0) {
        playerFrameTime += 1;
        if (playerFrameTime > 10) { // Change frame every 10 render cycles
            playerFrameTime = 0;
            playerFrame = (playerFrame + 1) % playerTextures[playerDirection].length;
        }
    } else {
        playerFrame = 0; // Use frame 1 (idle frame) when not moving
    }

    player.material.map = playerTextures[playerDirection][playerFrame];
    player.material.needsUpdate = true;

    // Adjust z-index of tiles based on player's position relative to the nearest tile with specified textures
    const playerBottomY = player.position.y - 0.5; // Bottom of the player
    let nearestTile = null;
    let nearestDistance = Infinity;

    tiles.forEach(tile => {
        if (dynamicZIndexTextures.includes(tile.userData.type)) {
            const distance = Math.hypot(tile.position.x - player.position.x, tile.position.y - player.position.y);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestTile = tile;
            }
        }
    });

    if (nearestTile) {
        const halfwayPoint = nearestTile.position.y - 0.4; // Halfway point of the tile
        if (playerBottomY < halfwayPoint) {
            nearestTile.position.z = player.position.z - 1; // Tile is behind the player
        } else {
            nearestTile.position.z = player.position.z + 1; // Tile is in front of the player
        }
    }

    // Render the scene
    renderScene(scene);

    // Draw dev mode markers if dev mode is enabled
    if (window.devMode) {
        drawDevModeMarkers(scene, tiles);
    }

    // Update previous move direction
    prevMoveDirection.x = moveDirection.x;
    prevMoveDirection.y = moveDirection.y;
}
animate();
