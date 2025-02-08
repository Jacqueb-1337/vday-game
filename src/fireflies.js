import * as THREE from 'three';

export let fireflyParticles, fireflyGeometry, fireflyMaterial;
export let fireflyCount = 0; // Declare and initialize fireflyCount
const maxFireflies = 8;
const minFireflies = 5;

export function spawnFireflies(tilemap, scene, bloomPass) {
    if (!tilemap || !Array.isArray(tilemap)) {
        console.error("spawnFireflies: tilemap is not defined or not an array.");
        return;
    }

    const grassTiles = tilemap.filter(t => t.type === "tall_grass");

    const newPositions = [];
    const newVelocities = [];
    const newOrigins = [];

    grassTiles.forEach(tile => {
        if (Math.random() < 0.2 && fireflyCount < maxFireflies && !tile.hasFirefly) { // 20% chance to spawn per tile, only one firefly per tile
            const x = tile.x + (Math.random() - 0.5) * 0.8;
            const y = tile.y + (Math.random() - 0.5) * 0.8;
            const z = Math.random() * 0.5 + 0.2; // Slightly above the tile

            newPositions.push(x, y, z);
            newVelocities.push((Math.random() - 0.5) * 0.005, (Math.random() - 0.5) * 0.005, (Math.random() - 0.1) * 0.005); // Reduced speed
            newOrigins.push(x, y, z);
            fireflyCount++;
            tile.hasFirefly = true; // Mark tile as having a firefly

            console.info("Firefly spawned at", x, y, z);
        }
    });

    if (newPositions.length === 0) {
        console.warn("No fireflies were spawned.");
        return; // Avoid creating empty geometry
    }

    if (!fireflyGeometry) {
        fireflyGeometry = new THREE.BufferGeometry();
        fireflyGeometry.setAttribute("position", new THREE.Float32BufferAttribute(newPositions, 3));
        fireflyGeometry.setAttribute("velocity", new THREE.Float32BufferAttribute(newVelocities, 3));
        fireflyGeometry.setAttribute("origin", new THREE.Float32BufferAttribute(newOrigins, 3));

        fireflyMaterial = new THREE.PointsMaterial({
            color: 0xffcc00,
            size: 3.6, // Slightly larger to make them more visible
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
        });

        fireflyParticles = new THREE.Points(fireflyGeometry, fireflyMaterial);
        scene.add(fireflyParticles);
    } else {
        const positions = fireflyGeometry.attributes.position.array;
        const velocities = fireflyGeometry.attributes.velocity.array;
        const origins = fireflyGeometry.attributes.origin.array;

        fireflyGeometry.setAttribute("position", new THREE.Float32BufferAttribute([...positions, ...newPositions], 3));
        fireflyGeometry.setAttribute("velocity", new THREE.Float32BufferAttribute([...velocities, ...newVelocities], 3));
        fireflyGeometry.setAttribute("origin", new THREE.Float32BufferAttribute([...origins, ...newOrigins], 3));

        fireflyGeometry.attributes.position.needsUpdate = true;
        fireflyGeometry.attributes.velocity.needsUpdate = true;
        fireflyGeometry.attributes.origin.needsUpdate = true;
    }

    animateFireflies(bloomPass, tilemap);
    updateFireflyVelocities(); // Now we ensure it runs only after fireflies exist
}

// Animate Fireflies (Floating & Flickering)
function animateFireflies(bloomPass, tilemap) {
    const positions = fireflyGeometry.attributes.position.array;
    const velocities = fireflyGeometry.attributes.velocity.array;
    const origins = fireflyGeometry.attributes.origin.array;

    const time = Date.now() * 0.002; // Time variable for movement patterns

    for (let i = 0; i < positions.length; i += 3) {
        // Calculate next position with random offsets for each firefly
        const randomOffsetX = Math.random() * 0.005;
        const randomOffsetY = Math.random() * 0.005;
        const nextX = positions[i] + Math.sin(time + i * 0.1 + randomOffsetX) * 0.0025 + velocities[i]; // Reduced speed
        const nextY = positions[i + 1] + Math.cos(time + i * 0.1 + randomOffsetY) * 0.0025 + velocities[i + 1]; // Reduced speed

        // Check if the next position is inside a non-walkable tile
        const tile = tilemap.find(t => Math.floor(t.x) === Math.floor(nextX) && Math.floor(t.y) === Math.floor(nextY));
        if (tile && !tile.walkable) {
            // Reverse velocity to keep firefly within walkable areas
            velocities[i] *= -1;
            velocities[i + 1] *= -1;
        } else {
            // Apply subtle floating movement using sine and cosine waves
            positions[i] = nextX;   // X movement
            positions[i + 1] = nextY; // Y movement
            positions[i + 2] += Math.sin(time * 2 + i + randomOffsetX) * 0.001; // Reduced bobbing effect
        }

        // Ensure fireflies stay within range of their origin tile
        const dx = positions[i] - origins[i];
        const dy = positions[i + 1] - origins[i + 1];
        if (Math.abs(dx) > 1.5) velocities[i] *= -1;
        if (Math.abs(dy) > 1.5) velocities[i + 1] *= -1;

        // Apply slight random flicker effect
        const flicker = 0.7 + Math.sin(time * 3 + i + randomOffsetY) * 0.3;
        fireflyMaterial.opacity = flicker;
        bloomPass.strength = flicker * 5.0; // Increase bloom strength
        bloomPass.radius = 1.0; // Increase bloom area
    }

    fireflyGeometry.attributes.position.needsUpdate = true;
    requestAnimationFrame(() => animateFireflies(bloomPass, tilemap));
}

// Ensure fireflies never stop moving by modifying velocity update logic
function updateFireflyVelocities() {
    if (!fireflyGeometry || !fireflyGeometry.attributes.velocity) {
        console.warn("updateFireflyVelocities called before fireflyGeometry is initialized.");
        return; // Exit function if fireflyGeometry is not ready
    }

    const velocities = fireflyGeometry.attributes.velocity.array;

    for (let i = 0; i < velocities.length; i += 3) {
        velocities[i] += (Math.random() - 0.5) * 0.001;   // Reduced random jitter X
        velocities[i + 1] += (Math.random() - 0.5) * 0.001; // Reduced random jitter Y

        // Cap the velocities to prevent them from becoming too fast
        velocities[i] = Math.min(Math.max(velocities[i], -0.005), 0.005); // Reduced speed cap
        velocities[i + 1] = Math.min(Math.max(velocities[i + 1], -0.005), 0.005); // Reduced speed cap
    }

    fireflyGeometry.attributes.velocity.needsUpdate = true;
    setTimeout(updateFireflyVelocities, 1000); // Update velocities every second
}

// Ensure there are always between 5 and 8 fireflies on the map
export function manageFireflies(tilemap, scene, bloomPass) {
    if (fireflyCount < minFireflies) {
        spawnFireflies(tilemap, scene, bloomPass);
    }

    if (fireflyCount > maxFireflies) {
        // Remove excess fireflies
        const positions = fireflyGeometry.attributes.position.array;
        const velocities = fireflyGeometry.attributes.velocity.array;
        const origins = fireflyGeometry.attributes.origin.array;

        for (let i = positions.length - 3; i >= 0 && fireflyCount > maxFireflies; i -= 3) {
            positions.splice(i, 3);
            velocities.splice(i, 3);
            origins.splice(i, 3);
            fireflyCount--;
        }

        fireflyGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        fireflyGeometry.setAttribute("velocity", new THREE.Float32BufferAttribute(velocities, 3));
        fireflyGeometry.setAttribute("origin", new THREE.Float32BufferAttribute(origins, 3));
        fireflyGeometry.attributes.position.needsUpdate = true;
    }

    setTimeout(() => manageFireflies(tilemap, scene, bloomPass), 2000); // Check every 2 seconds
}
