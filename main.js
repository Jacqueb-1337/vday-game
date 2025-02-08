// Remove Node requires so we're purely in an ESM environment
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { spawnFireflies, manageFireflies, fireflyCount } from './src/fireflies.js';
import { devMode } from './src/devMode.js';

// Remove Node requires so we're purely in an ESM environment
const fs = require('fs');
const path = require('path');


// Core Three.js Setup
export const scene = new THREE.Scene();
export const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
camera.position.z = 10;  // Ensure camera is positioned correctly
export const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("gameCanvas") });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Bloom Layer
const bloomLayer = new THREE.Layers();
bloomLayer.set(1);

// Post-processing setup
export const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

export const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.4, 0.85);
composer.addPass(bloomPass);

// Background Color Fix
renderer.setClearColor(0x222222); // Change to a visible background color

// Tilemap & Dev Mode
export let tilemap = [];

// Determine the correct path for tilemap.json
const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
export const tilemapPath = path.join(nw.__dirname, 'tilemap.json');

// Log the full path of tilemap.json
console.log(`Loading tilemap from: ${tilemapPath}`);

// Load Tilemap JSON (with cache-busting)
export function loadTilemap() {
    fetch(`${tilemapPath}?v=${new Date().getTime()}`)
        .then(res => res.json())
        .then(data => {
            tilemap = data.tiles;
            console.log("Loaded tilemap:", JSON.stringify(tilemap, null, 2));
            createTilemap();
            spawnFireflies(tilemap, scene, bloomPass); // Fireflies are now placed using a particle system
            setPlayerInitialPosition(0, 0); // Starting coordinates (0, 0)
            manageFireflies(tilemap, scene, bloomPass); // Ensure manageFireflies is called after tilemap is loaded
        });
}
loadTilemap();

// Create a Grid of Tiles
export const tiles = [];
export function createTilemap() {
    const minX = Math.min(...tilemap.map(t => t.x));
    const maxX = Math.max(...tilemap.map(t => t.x));
    const minY = Math.min(...tilemap.map(t => t.y));
    const maxY = Math.max(...tilemap.map(t => t.y));

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            let geometry = new THREE.PlaneGeometry(1, 1);
            let tileData = tilemap.find(t => t.x === x && t.y === y);
            let isWalkable = tileData ? tileData.walkable : false;
            let material = new THREE.MeshBasicMaterial({ color: isWalkable ? 0x88cc88 : 0x444444 });
            let tile = new THREE.Mesh(geometry, material);
            tile.position.set(x, y, 0);
            tile.userData = { ...tileData }; // Preserve all attributes
            scene.add(tile);
            tiles.push(tile);
        }
    }
}

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
        player.position.set(closestTile.position.x, closestTile.position.y, 0.1);
        hitbox.position.set(closestTile.position.x, closestTile.position.y, 0.1);
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
player.layers.disable(1); // Ensure player is not on the bloom layer
scene.add(player);

// Hitbox Setup
export let hitboxGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.1);
export let hitboxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: false, visible: false }); // Make hitbox invisible
export let hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
hitbox.layers.disable(1); // Ensure hitbox is not on the bloom layer
scene.add(hitbox);

// Player Movement (Enabled After Setting Walkable Tiles)
export let moveDirection = { x: 0, y: 0 };
export let velocity = { x: 0, y: 0 };
export const maxSpeed = 0.06;
export const acceleration = 0.01;
export const deceleration = 0.02;

document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") moveDirection.y = 1;
    if (event.key === "ArrowDown") moveDirection.y = -1;
    if (event.key === "ArrowLeft") moveDirection.x = -1;
    if (event.key === "ArrowRight") moveDirection.x = 1;
});

document.addEventListener("keyup", (event) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") moveDirection.y = 0;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") moveDirection.x = 0;
});

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

// Firefly Collection System
const fireflies = [];
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
                fireflyCount++;
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
        }
    }
});

// Adjust canvas size and camera aspect ratio on window resize
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -aspect * 5;
    camera.right = aspect * 5;
    camera.top = 5;
    camera.bottom = -5;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
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

    // Render the scene
    renderer.autoClear = false;
    renderer.clear();

    // Render scene without bloom
    scene.traverse(obj => {
        if (obj.isMesh) {
            obj.layers.set(0);
        }
    });
    renderer.render(scene, camera);

    // Render bloom pass
    scene.traverse(obj => {
        if (obj.isMesh && obj.layers.test(bloomLayer)) {
            obj.layers.set(1);
        }
    });
    composer.render();

    // Update previous move direction
    prevMoveDirection.x = moveDirection.x;
    prevMoveDirection.y = moveDirection.y;
}
animate();
