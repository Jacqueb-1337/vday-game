import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { devModeManager } from './src/DevModeManager.js';
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

// Initialize DevModeManager
devModeManager.init(scene);

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

const dynamicZIndexTextures = ['tall_grass*', 'npc*', 'tree*', 'house*', 'building*', 'fence*']; // Patterns for dynamic z-index textures

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
            if (distance < 1) // Check if player is close enough
            {
                scene.remove(firefly);
                fireflies.splice(index, 1);
                collectedFireflies++;
                console.log(`Collected a firefly! Total: ${collectedFireflies}`);
            }
        });
    }

    // Toggle dev mode with backtick key
    if (event.key === "`") {
        if (devModeManager.isActive) {
            devModeManager.deactivate();
        } else {
            devModeManager.activate();
        }
    }
    
    // Refresh/redraw map with F5 key
    if (event.key === "F5") {
        event.preventDefault(); // Prevent browser refresh
        refreshMap();
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

    hitbox.material.wireframe = devModeManager.isActive;

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

    // Handle dynamic z-index for tiles
    tiles.forEach(tile => {
        if (isDynamicZIndexTexture(tile.userData.type)) {
            const distance = Math.hypot(tile.position.x - player.position.x, tile.position.y - player.position.y);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestTile = tile;
            }
        }
    });

    // Reset all dynamic tiles to default z position first
    tiles.forEach(tile => {
        if (isDynamicZIndexTexture(tile.userData.type)) {
            tile.position.z = 0;
        }
    });

    // Then set the z position for the nearest tile
    if (nearestTile && nearestDistance < 2) { // Only interact if within 2 units
        nearestTile.position.z = calculateDynamicZIndex(playerBottomY, nearestTile.position.y, player.position.z);
    }

    // Handle dynamic z-index for NPCs
    npcs.forEach(npc => {
        // Check if player is close enough to this NPC for z-index interaction
        const distance = Math.hypot(npc.position.x - player.position.x, npc.position.y - player.position.y);
        if (distance < 3) { // Within 3 units for interaction
            npc.position.z = calculateDynamicZIndex(playerBottomY, npc.position.y, player.position.z);
        } else {
            // Reset NPC to default z position when player is far away
            npc.position.z = 0;
        }
    });

    // Handle dynamic z-index for building objects
    if (devModeManager && devModeManager.buildingManager && devModeManager.buildingManager.buildings) {
        devModeManager.buildingManager.buildings.forEach(building => {
            if (building.mesh) {
                // Calculate building center and interaction area
                const buildingCenterX = building.position.x + (building.size.width - 1) / 2;
                const buildingCenterY = building.position.y + (building.size.height - 1) / 2;
                const maxSize = Math.max(building.size.width, building.size.height);
                const distance = Math.hypot(buildingCenterX - player.position.x, buildingCenterY - player.position.y);
                
                if (distance < maxSize + 2) { // Within building size + 2 units for interaction
                    // Use the building's center point for z-index calculation
                    building.mesh.position.z = calculateDynamicZIndex(playerBottomY, buildingCenterY, player.position.z);
                } else {
                    // Reset building to default z position when player is far away
                    building.mesh.position.z = 0;
                }
            }
        });
    }

    // Log z-index interactions (only in dev mode and when there are interactions)
    if (devModeManager.isActive) {
        let interactionLog = [];
        
        // Check for dynamic tile interactions
        if (nearestTile && nearestDistance < 2) {
            interactionLog.push(`Tile (${nearestTile.textureType}): z=${nearestTile.position.z}`);
        }
        
        // Check for NPC interactions
        npcs.forEach((npc, index) => {
            if (npc.position.z !== 0) {
                interactionLog.push(`NPC${index}: z=${npc.position.z}`);
            }
        });
        
        // Check for building interactions
        if (devModeManager.buildingManager && devModeManager.buildingManager.buildings) {
            devModeManager.buildingManager.buildings.forEach((building, index) => {
                if (building.mesh && building.mesh.position.z !== 0) {
                    interactionLog.push(`${building.objectType}: z=${building.mesh.position.z}`);
                }
            });
        }
        
        // Only log if there are active z-index interactions
        if (interactionLog.length > 0) {
            console.log(`Player z=${player.position.z} | Active z-interactions: ${interactionLog.join(', ')}`);
        }
    }

    renderScene(scene);

    if (devModeManager.isActive) {
        drawDevModeMarkers(scene, tiles);
    }

    prevMoveDirection.x = moveDirection.x;
    prevMoveDirection.y = moveDirection.y;
}

// Utility function to calculate z-index based on player and object positions
function calculateDynamicZIndex(playerBottomY, objectCenterY, playerZ, offset = 0.25) {
    const halfwayPoint = objectCenterY - offset;
    if (playerBottomY < halfwayPoint) {
        return playerZ - 1; // Object is in front of player (player is behind)
    } else {
        return playerZ + 1; // Object is behind player (player is in front)
    }
}

// Map refresh function - redraws the entire map like a reboot
export function refreshMap() {
    console.log('Refreshing map...');

    // Store current dev mode state
    const wasDevModeActive = devModeManager.isActive;
    const wasExpansionMode = devModeManager.expansionMode;
    const currentExpansionTool = devModeManager.expansionTool;

    // Store building mode state
    const wasBuildingMode = devModeManager.buildingManager.buildingMode;
    const selectedObjectType = devModeManager.buildingManager.selectedObjectType;

    try {
        // 1. Clear existing tiles from scene (preserve NPCs, fireflies, player, objects)
        const tilesToRemove = [];
        scene.traverse((child) => {
            // Remove tiles but keep important objects
            if (child.isMesh && 
                child !== player && 
                child !== hitbox && 
                !npcs.includes(child) && // Preserve NPCs
                !fireflies.includes(child) && // Preserve fireflies
                !child.userData.isObjectOverlay &&
                !child.userData.isDevModeOverlay &&
                !child.userData.isDevModeGrid &&
                !child.userData.isOriginMarker &&
                !child.userData.isPreview &&
                !child.userData.isPreviewOutline &&
                !child.userData.isPreviewOrigin &&
                child.name !== 'buildingPreview' &&
                !child.name?.startsWith('object_')) {
                tilesToRemove.push(child);
            }
        });

        // Remove collected tiles
        tilesToRemove.forEach(tile => {
            scene.remove(tile);
            if (tile.geometry) tile.geometry.dispose();
            if (tile.material) {
                if (tile.material.map) tile.material.map.dispose();
                tile.material.dispose();
            }
        });

        // Clear tiles array
        tiles.length = 0;

        // 2. Temporarily deactivate dev mode to avoid conflicts during reload
        if (wasDevModeActive) {
            devModeManager.deactivate();
        }

        // 3. Reload tilemap and recreate tiles
        loadTilemap().then(() => {
            console.log('Map tiles reloaded successfully');

            // 4. Restore dev mode if it was active
            if (wasDevModeActive) {
                devModeManager.activate();

                // Restore expansion mode state
                if (wasExpansionMode) {
                    devModeManager.expansionMode = true;
                    devModeManager.expansionTool = currentExpansionTool;
                    devModeManager.showExpansionModeUI();
                }
            }

            // 5. Restore building mode if it was active
            if (wasBuildingMode) {
                devModeManager.buildingManager.buildingMode = true;
                devModeManager.buildingManager.selectedObjectType = selectedObjectType;
                devModeManager.buildingManager.showObjectSelector();
                devModeManager.buildingManager.updateBuildingPreview();
            }

            // 6. Reload building overlays (they should persist through map refresh)
            devModeManager.buildingManager.loadObjectsFromFile();

            // 7. Update visibility states
            devModeManager.buildingManager.updateLayerVisibility();
            if (wasDevModeActive) {
                devModeManager.buildingManager.updateOriginMarkersVisibility();
            }

            console.log('Map refresh completed successfully');
        }).catch((error) => {
            console.error('Error during map refresh:', error);

            // Try to restore states even if reload failed
            if (wasDevModeActive) {
                devModeManager.activate();
            }
        });

    } catch (error) {
        console.error('Error during map refresh:', error);
    }
}

animate();