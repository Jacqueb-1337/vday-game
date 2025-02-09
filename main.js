import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { devMode } from './src/devMode.js';
import { camera, updateCameraAspect } from './src/camera.js'; // Import camera and updateCameraAspect
import { moveDirection, velocity, maxSpeed, acceleration, deceleration } from './src/controls.js'; // Import controls
import { renderer, bloomLayer, composer, bloomPass, renderScene, setupRenderPass } from './src/render.js'; // Import rendering and bloom setup
import { loadTilemap, createTilemap, updateTilemap, saveTilemap, tilemap, tiles, tilemapPath } from './src/tilemap.js'; // Import tilemap logic and tilemapPath
import { drawDevModeMarkers } from './src/devModeMarkers.js'; // Import dev mode markers
import { createFirefly, fireflies } from './src/fireflies.js'; // Import firefly functions
import { loadNPCs, npcs } from './src/npc.js'; // Import NPC functions and npcs array
import { getLayerIndex } from './src/textureLayers.js'; // Import getLayerIndex function

const fs = require('fs');
const path = require('path');

export const scene = new THREE.Scene();
setupRenderPass(scene);

console.log(`Loading tilemap from: ${tilemapPath}`);

loadTilemap().then(() => {
    // Add fireflies to the scene
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * 10 - 5;
        const y = Math.random() * 10 - 5;
        const z = 1; // Set z position above the ground
        createFirefly(x, y, z);
    }

    // Load NPCs
    loadNPCs();
});

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
        player.position.set(closestTile.position.x, closestTile.position.y, getLayerIndex('player'));
        hitbox.position.set(closestTile.position.x, closestTile.position.y, getLayerIndex('player'));
    } else {
        console.error('No walkable tile found for initial player position');
    }
}

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
        loadTexture('src/assets/characters/player/player_east_1.png'),
        loadTexture('src/assets/characters/player/player_east_2.png'),
        loadTexture('src/assets/characters/player/player_east_3.png')
    ],
    west: [
        loadTexture('src/assets/characters/player/player_west_1.png'),
        loadTexture('src/assets/characters/player/player_west_2.png'),
        loadTexture('src/assets/characters/player/player_west_3.png')
    ],
    north: [
        loadTexture('src/assets/characters/player/player_north_1.png'),
        loadTexture('src/assets/characters/player/player_north_2.png'),
        loadTexture('src/assets/characters/player/player_north_3.png')
    ],
    south: [
        loadTexture('src/assets/characters/player/player_south_1.png'),
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
player.position.z = getLayerIndex('player'); // Ensure player is above the NPCs
player.layers.set(2);
scene.add(player);

export let hitboxGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.1);
export let hitboxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: false, visible: false });
export let hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
hitbox.position.z = getLayerIndex('player'); // Ensure hitbox is above the NPCs
hitbox.layers.set(2);
scene.add(hitbox);

window.addEventListener('resize', () => {
    updateCameraAspect();
});

export function checkCollision(px, py, pw, ph, tx, ty, tw, th) {
    const tolerance = 0.02;
    const dx = Math.abs(px - tx);
    const dy = Math.abs(py - ty);
    return (dx < (pw / 2 + tw / 2 - tolerance)) && (dy < (ph / 2 + th / 2 - tolerance));
}

function handleNPCCollisions() {
    npcs.forEach(npc => {
        // Define the bounding box for the NPC with smaller dimensions
        const npcBounds = {
            x: npc.position.x,
            y: npc.position.y,
            width: npc.geometry.parameters.width * 0.55, // Adjust width
            height: npc.geometry.parameters.height * 0.65 // Adjust height
        };

        // Define the bounding box for the player with smaller dimensions
        const playerBounds = {
            x: player.position.x,
            y: player.position.y,
            width: player.geometry.parameters.width * 0.55, // Adjust width
            height: player.geometry.parameters.height * 0.65 // Adjust height
        };

        // Check if the player and NPC are colliding
        if (checkCollision(playerBounds.x, playerBounds.y, playerBounds.width, playerBounds.height, npcBounds.x, npcBounds.y, npcBounds.width, npcBounds.height)) {
            // Calculate the overlap distance on the x-axis
            const overlapX = (playerBounds.width / 2 + npcBounds.width / 2) - Math.abs(playerBounds.x - npcBounds.x);
            // Calculate the overlap distance on the y-axis
            const overlapY = (playerBounds.height / 2 + npcBounds.height / 2) - Math.abs(playerBounds.y - npcBounds.y);

            // Resolve the collision by moving the player out of the overlap
            if (overlapX < overlapY) {
                if (playerBounds.x < npcBounds.x) {
                    player.position.x -= overlapX; // Move player left
                } else {
                    player.position.x += overlapX; // Move player right
                }
            } else {
                if (playerBounds.y < npcBounds.y) {
                    player.position.y -= overlapY; // Move player down
                } else {
                    player.position.y += overlapY; // Move player up
                }
            }
        }
    });
}

let prevDirection = 'south';
let prevMoveDirection = { x: 0, y: 0 };

const dynamicZIndexTextures = ['tall_grass*', 'npc*']; // Example wildcard for dynamic z-index textures

function isDynamicZIndexTexture(textureType) {
    if (!textureType) return false; // Handle undefined textureType

    // Check for exact match first
    if (dynamicZIndexTextures.includes(textureType)) {
        return true;
    }

    // Check for wildcard match
    return dynamicZIndexTextures.some(pattern => pattern.endsWith('*') && textureType.startsWith(pattern.slice(0, -1)));
}

let collectedFireflies = 0;

document.addEventListener("keydown", (event) => {
    if (event.key === "E") { // Press 'E' to collect fireflies
        fireflies.forEach((firefly, index) => {
            const distance = player.position.distanceTo(firefly.position);
            if (distance < 1) { // Check if player is close enough
                scene.remove(firefly);
                fireflies.splice(index, 1);
                collectedFireflies++;
                console.log(`Collected a firefly! Total: ${collectedFireflies}`);
            }
        });
    }
});

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();

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

    if (moveDirection.x !== 0 && moveDirection.y !== 0) {
        const diagonalSpeed = maxSpeed / Math.sqrt(2);
        velocity.x = moveDirection.x * diagonalSpeed;
        velocity.y = moveDirection.y * diagonalSpeed;
    }

    let newX = player.position.x + velocity.x;
    let newY = player.position.y + velocity.y;

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

    // Handle NPC collisions
    handleNPCCollisions();

    camera.position.x = player.position.x;
    camera.position.y = player.position.y;
    camera.updateProjectionMatrix();

    document.getElementById('coords').innerText = `X: ${player.position.x.toFixed(2)}, Y: ${player.position.y.toFixed(2)}`;

    const isWalkable = tiles.some(t => checkCollision(player.position.x, player.position.y, hitbox.geometry.parameters.width, hitbox.geometry.parameters.height, t.position.x, t.position.y, 1, 1) && t.userData.walkable);
    document.getElementById('walkable').innerText = `Walkable: ${isWalkable ? 'Yes' : 'No'}`;

    hitbox.material.wireframe = window.devMode;

    if (moveDirection.x > 0) playerDirection = 'east';
    else if (moveDirection.x < 0) playerDirection = 'west';
    else if (moveDirection.y > 0) playerDirection = 'north';
    else if (moveDirection.y < 0) playerDirection = 'south';

    if (playerDirection !== prevDirection) {
        playerFrame = 1;
        playerFrameTime = 0;
        prevDirection = playerDirection;
    }

    if (moveDirection.x !== 0 || moveDirection.y !== 0) {
        playerFrameTime += 1;
        if (playerFrameTime > 10) {
            playerFrameTime = 0;
            playerFrame = (playerFrame + 1) % playerTextures[playerDirection].length;
        }
    } else {
        playerFrame = 0;
    }

    player.material.map = playerTextures[playerDirection][playerFrame];
    player.material.needsUpdate = true;

    const playerBottomY = player.position.y - 0.5;
    let nearestTile = null;
    let nearestDistance = Infinity;

    tiles.forEach(tile => {
        if (isDynamicZIndexTexture(tile.userData.type)) {
            const distance = Math.hypot(tile.position.x - player.position.x, tile.position.y - player.position.y);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestTile = tile;
            }
        }
    });

    if (nearestTile) {
        const halfwayPoint = nearestTile.position.y - 0.4;
        if (playerBottomY < halfwayPoint) {
            nearestTile.position.z = player.position.z - 1;
        } else {
            nearestTile.position.z = player.position.z + 1;
        }
    }

    // Log player and NPC positions and z-layers
    console.log(`Player Position: X: ${player.position.x}, Y: ${player.position.y}, Z: ${player.position.z}`);
    npcs.forEach(npc => {
        console.log(`NPC Position: X: ${npc.position.x}, Y: ${npc.position.y}, Z: ${npc.position.z}`);
    });

    renderScene(scene);

    if (window.devMode) {
        drawDevModeMarkers(scene, tiles);
    }

    prevMoveDirection.x = moveDirection.x;
    prevMoveDirection.y = moveDirection.y;
}
animate();