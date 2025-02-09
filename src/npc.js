import * as THREE from 'three';
import { scene } from '../main.js'; // Import scene from main.js
import { getLayerIndex } from './textureLayers.js'; // Import getLayerIndex function

const textureLoader = new THREE.TextureLoader();
export let npcs = [];

export function loadNPCs() {
    fetch('npcs.json')
        .then(response => response.json())
        .then(data => {
            data.npcs.forEach(npcData => {
                createNPC(npcData);
            });
        })
        .catch(error => console.error('Error loading NPCs:', error));
}

function loadTexture(path) {
    const texture = textureLoader.load(path);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
}

function createNPC(npcData) {
    const texture = loadTexture(`src/assets${npcData.texture}`);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const geometry = new THREE.PlaneGeometry(1, 1);
    const npc = new THREE.Mesh(geometry, material);
    npc.position.set(npcData.x, npcData.y, getLayerIndex('npc')); // Set z position based on texture layer
    npc.name = npcData.name;
    scene.add(npc);
    npcs.push(npc);
}
