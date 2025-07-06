import * as THREE from 'three';

// Calculate initial aspect ratio
const aspect = window.innerWidth / window.innerHeight;

export const camera = new THREE.OrthographicCamera(-aspect * 5, aspect * 5, 5, -5, 0.1, 100);
camera.position.z = 10;  // Ensure camera is positioned correctly
camera.updateProjectionMatrix(); // Ensure projection matrix is updated

export function updateCameraAspect() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -aspect * 5;
    camera.right = aspect * 5;
    camera.top = 5;
    camera.bottom = -5;
    camera.updateProjectionMatrix();
}
