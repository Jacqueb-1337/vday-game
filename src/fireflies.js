import * as THREE from 'three';
import { scene } from '../main.js'; // Import scene from main.js

export let fireflies = [];

export function createFirefly(x, y, z) {
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        emissive: 0xffcc00,
        emissiveIntensity: 1,
        transparent: true,
        opacity: 1
    });
    const firefly = new THREE.Mesh(geometry, material);
    firefly.position.set(x, y, z);
    firefly.layers.set(1); // Add to bloom layer
    scene.add(firefly);
    fireflies.push(firefly);
}
