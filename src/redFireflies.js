import * as THREE from 'three';
import { scene } from '../main.js'; // Import scene from main.js

export let redFireflies = [];
export let redFireflyCount = 0; // Declare and initialize redFireflyCount
const maxRedFireflies = 5;
const minRedFireflies = 3;

export function spawnRedFireflies(tilemap, scene, bloomPass) {
    console.warn("spawnRedFireflies called"); // Debug log
    if (!tilemap || !Array.isArray(tilemap)) {
        console.error("spawnRedFireflies: tilemap is not defined or not an array.");
        return;
    }

    const grassTiles = tilemap.filter(t => t.type === "tall_grass");
    console.warn("Grass tiles found:", grassTiles.length); // Debug log

    grassTiles.forEach(tile => {
        if (Math.random() < 0.2 && redFireflyCount < maxRedFireflies && !tile.hasRedFirefly) { // 20% chance to spawn per tile, only one red firefly per tile
            const x = tile.x + (Math.random() - 0.5) * 0.8;
            const y = tile.y + (Math.random() - 0.5) * 0.8;
            const z = 2; // Set z position above other objects

            const geometry = new THREE.SphereGeometry(0.1, 8, 8);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1, transparent: true, opacity: 1 });
            const redFirefly = new THREE.Mesh(geometry, material);
            redFirefly.position.set(x, y, z);
            redFirefly.userData = {
                origin: { x, y, z },
                velocity: { x: (Math.random() - 0.5) * 0.005, y: (Math.random() - 0.5) * 0.005, z: (Math.random() - 0.1) * 0.005 }
            };
            redFirefly.layers.set(1); // Enable bloom layer rendering
            redFirefly.visible = true; // Ensure red firefly is visible
            scene.add(redFirefly);
            redFireflies.push(redFirefly);
            redFireflyCount++;
            tile.hasRedFirefly = true; // Mark tile as having a red firefly

            console.info("Red Firefly spawned at", x, y, z); // Debug log
        }
    });

    if (redFireflies.length === 0) {
        console.warn("No red fireflies were spawned.");
        return; // Avoid creating empty geometry
    }

    animateRedFireflies(bloomPass, tilemap);
    updateRedFireflyVelocities(); // Now we ensure it runs only after red fireflies exist
}

// Animate Red Fireflies (Floating & Flickering)
function animateRedFireflies(bloomPass, tilemap) {
    const time = Date.now() * 0.002; // Time variable for movement patterns

    redFireflies.forEach(redFirefly => {
        const { origin, velocity } = redFirefly.userData;

        // Calculate next position with random offsets for each red firefly
        const randomOffsetX = Math.random() * 0.005;
        const randomOffsetY = Math.random() * 0.005;
        const nextX = redFirefly.position.x + Math.sin(time + randomOffsetX) * 0.0025 + velocity.x; // Reduced speed
        const nextY = redFirefly.position.y + Math.cos(time + randomOffsetY) * 0.0025 + velocity.y; // Reduced speed

        // Check if the next position is inside a non-walkable tile
        const tile = tilemap.find(t => Math.floor(t.x) === Math.floor(nextX) && Math.floor(t.y) === Math.floor(nextY));
        if (tile && !tile.walkable) {
            // Reverse velocity to keep red firefly within walkable areas
            velocity.x *= -1;
            velocity.y *= -1;
        } else {
            // Apply subtle floating movement using sine and cosine waves
            redFirefly.position.x = nextX;   // X movement
            redFirefly.position.y = nextY; // Y movement
            redFirefly.position.z += Math.sin(time * 2 + randomOffsetX) * 0.001; // Reduced bobbing effect
        }

        // Ensure red fireflies stay within range of their origin tile
        const dx = redFirefly.position.x - origin.x;
        const dy = redFirefly.position.y - origin.y;
        if (Math.abs(dx) > 1.5) velocity.x *= -1;
        if (Math.abs(dy) > 1.5) velocity.y *= -1;

        // Apply slight random flicker effect
        const flicker = 0.7 + Math.sin(time * 3 + randomOffsetY) * 0.3;
        redFirefly.material.opacity = flicker;
        bloomPass.strength = Math.max(flicker * 30.0, 5.0); // Increase bloom strength
        bloomPass.radius = 3.0; // Increase bloom area
    });

    requestAnimationFrame(() => animateRedFireflies(bloomPass, tilemap));

    // Debug logging to confirm visibility and positions
    redFireflies.forEach(redFirefly => {
        if (!scene.children.includes(redFirefly)) {
            console.error("Red Firefly not added to scene:", redFirefly.position);
        }
    });
}

// Ensure red fireflies never stop moving by modifying velocity update logic
function updateRedFireflyVelocities() {
    redFireflies.forEach(redFirefly => {
        const velocity = redFirefly.userData.velocity;

        velocity.x += (Math.random() - 0.5) * 0.001;   // Reduced random jitter X
        velocity.y += (Math.random() - 0.5) * 0.001; // Reduced random jitter Y

        // Cap the velocities to prevent them from becoming too fast
        velocity.x = Math.min(Math.max(velocity.x, -0.005), 0.005); // Reduced speed cap
        velocity.y = Math.min(Math.max(velocity.y, -0.005), 0.005); // Reduced speed cap
    });

    setTimeout(updateRedFireflyVelocities, 1000); // Update velocities every second
}

// Ensure there are always between 3 and 5 red fireflies on the map
export function manageRedFireflies(tilemap, scene, bloomPass) {
    if (redFireflyCount < minRedFireflies) {
        spawnRedFireflies(tilemap, scene, bloomPass);
    }

    if (redFireflyCount > maxRedFireflies) {
        // Remove excess red fireflies
        for (let i = redFireflies.length - 1; i >= 0 && redFireflyCount > maxRedFireflies; i--) {
            const redFirefly = redFireflies[i];
            scene.remove(redFirefly);
            redFireflies.splice(i, 1);
            redFireflyCount--;
        }
    }

    setTimeout(() => manageRedFireflies(tilemap, scene, bloomPass), 2000); // Check every 2 seconds
}
