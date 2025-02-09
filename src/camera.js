import * as THREE from 'three';

export const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
camera.position.z = 10;  // Ensure camera is positioned correctly

export function updateCameraAspect() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -aspect * 5;
    camera.right = aspect * 5;
    camera.top = 5;
    camera.bottom = -5;
    camera.updateProjectionMatrix();
}

window.addEventListener('resize', () => {
    updateCameraAspect();
});
