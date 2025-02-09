import * as THREE from 'three';
import { getLayerIndex } from './textureLayers.js'; // Import getLayerIndex function

let markerGroup;
const textureLoader = new THREE.TextureLoader();
const textures = {
    greenx: textureLoader.load('src/assets/markers/greenx.png'),
    redx: textureLoader.load('src/assets/markers/redx.png')
};

export function drawDevModeMarkers(scene, tiles) {
    if (!markerGroup) {
        markerGroup = new THREE.Group();
        markerGroup.name = 'devModeMarkers';
        scene.add(markerGroup);
    }

    // Hide all existing markers
    markerGroup.children.forEach(marker => marker.visible = false);

    tiles.forEach(tile => {
        const { x, y, userData } = tile;
        const isWalkable = userData.walkable;

        const texture = isWalkable ? textures.greenx : textures.redx;

        let marker = markerGroup.children.find(marker => marker.position.x === x && marker.position.y === y);
        if (!marker) {
            const geometry = new THREE.PlaneGeometry(1, 1);
            const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
            marker = new THREE.Mesh(geometry, material);
            marker.position.set(x, y, getLayerIndex(isWalkable ? 'greenx' : 'redx')); // Set the layer index for markers
            markerGroup.add(marker);
        } else {
            marker.material.map = texture;
            marker.material.needsUpdate = true;
        }
        marker.visible = true;
    });
}
