import * as THREE from 'three';
import { scene } from '../main.js'; // Import scene from main.js

export let fireflies = [];
export let fireflyCount = 0; // Declare and initialize fireflyCount
const maxFireflies = 8;
const minFireflies = 5;

export function spawnFireflies(tilemap, scene, bloomPass) {
    console.warn("spawnFireflies called"); // Debug log
    if (!tilemap || !Array.isArray(tilemap)) {
        console.error("spawnFireflies: tilemap is not defined or not an array.");
        return;
    }

    const grassTiles = tilemap.filter(t => t.type === "tall_grass");
    console.warn("Grass tiles found:", grassTiles.length); // Debug log

    grassTiles.forEach(tile => {
        if (Math.random() < 0.2 && fireflyCount < maxFireflies && !tile.hasFirefly) { // 20% chance to spawn per tile, only one firefly per tile
            const x = tile.x + (Math.random() - 0.5) * 0.8;
            const y = tile.y + (Math.random() - 0.5) * 0.8;
            const z = 2; // Set z position above other objects

            const geometry = new THREE.SphereGeometry(10, 8, 8);
            const material = new THREE.MeshBasicMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 1, transparent: true, opacity: 1 });
            const firefly = new THREE.Mesh(geometry, material);
            firefly.position.set(x, y, z);
            firefly.userData = {
                origin: { x, y, z },
                velocity: { x: (Math.random() - 0.5) * 0.005, y: (Math.random() - 0.5) * 0.005, z: (Math.random() - 0.1) * 0.005 }
            };
            firefly.layers.set(1); // Enable bloom layer rendering
            firefly.visible = true; // Ensure firefly is visible
            scene.add(firefly);
            fireflies.push(firefly);
            fireflyCount++;
            tile.hasFirefly = true; // Mark tile as having a firefly

            console.info("Firefly spawned at", x, y, z); // Debug log
        }
    });

    if (fireflies.length === 0) {
        console.warn("No fireflies were spawned.");
        return; // Avoid creating empty geometry
    }

    animateFireflies(bloomPass, tilemap);
    updateFireflyVelocities(); // Now we ensure it runs only after fireflies exist
}

// Animate Fireflies (Floating & Flickering)
function animateFireflies(bloomPass, tilemap) {
    const time = Date.now() * 0.002; // Time variable for movement patterns

    fireflies.forEach(firefly => {
        const { origin, velocity } = firefly.userData;

        // Calculate next position with random offsets for each firefly
        const randomOffsetX = Math.random() * 0.005;
        const randomOffsetY = Math.random() * 0.005;
        const nextX = firefly.position.x + Math.sin(time + randomOffsetX) * 0.0025 + velocity.x; // Reduced speed
        const nextY = firefly.position.y + Math.cos(time + randomOffsetY) * 0.0025 + velocity.y; // Reduced speed

        // Check if the next position is inside a non-walkable tile
        const tile = tilemap.find(t => Math.floor(t.x) === Math.floor(nextX) && Math.floor(t.y) === Math.floor(nextY));
        if (tile && !tile.walkable) {
            // Reverse velocity to keep firefly within walkable areas
            velocity.x *= -1;
            velocity.y *= -1;
        } else {
            // Apply subtle floating movement using sine and cosine waves
            firefly.position.x = nextX;   // X movement
            firefly.position.y = nextY; // Y movement
            firefly.position.z += Math.sin(time * 2 + randomOffsetX) * 0.001; // Reduced bobbing effect
        }

        // Ensure fireflies stay within range of their origin tile
        const dx = firefly.position.x - origin.x;
        const dy = firefly.position.y - origin.y;
        if (Math.abs(dx) > 1.5) velocity.x *= -1;
        if (Math.abs(dy) > 1.5) velocity.y *= -1;

        // Apply slight random flicker effect
        const flicker = 0.7 + Math.sin(time * 3 + randomOffsetY) * 0.3;
        firefly.material.opacity = flicker;
        bloomPass.strength = Math.max(flicker * 30.0, 5.0); // Increase bloom strength
        bloomPass.radius = 3.0; // Increase bloom area
    });

    requestAnimationFrame(() => animateFireflies(bloomPass, tilemap));

    // Debug logging to confirm visibility and positions
    fireflies.forEach(firefly => {
        if (!scene.children.includes(firefly)) {
            console.error("Firefly not added to scene:", firefly.position);
        }
    });
}

// Ensure fireflies never stop moving by modifying velocity update logic
function updateFireflyVelocities() {
    fireflies.forEach(firefly => {
        const velocity = firefly.userData.velocity;

        velocity.x += (Math.random() - 0.5) * 0.001;   // Reduced random jitter X
        velocity.y += (Math.random() - 0.5) * 0.001; // Reduced random jitter Y

        // Cap the velocities to prevent them from becoming too fast
        velocity.x = Math.min(Math.max(velocity.x, -0.005), 0.005); // Reduced speed cap
        velocity.y = Math.min(Math.max(velocity.y, -0.005), 0.005); // Reduced speed cap
    });

    setTimeout(updateFireflyVelocities, 1000); // Update velocities every second
}

// Ensure there are always between 5 and 8 fireflies on the map
export function manageFireflies(tilemap, scene, bloomPass) {
    if (fireflyCount < minFireflies) {
        spawnFireflies(tilemap, scene, bloomPass);
    }

    if (fireflyCount > maxFireflies) {
        // Remove excess fireflies
        for (let i = fireflies.length - 1; i >= 0 && fireflyCount > maxFireflies; i--) {
            const firefly = fireflies[i];
            scene.remove(firefly);
            fireflies.splice(i, 1);
            fireflyCount--;
        }
    }

    setTimeout(() => manageFireflies(tilemap, scene, bloomPass), 2000); // Check every 2 seconds
}
