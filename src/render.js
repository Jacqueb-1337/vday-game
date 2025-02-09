import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { BrightnessShader } from './shaders/BrightnessShader.js'; // Import the custom shader
import { camera } from './camera.js'; // Import camera

export const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("gameCanvas") });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Bloom Layer
export const bloomLayer = new THREE.Layers();
bloomLayer.set(1);

// Post-processing setup
export const composer = new EffectComposer(renderer);
export let bloomPass; // Declare bloomPass

export function setupRenderPass(scene) {
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const brightnessPass = new ShaderPass(BrightnessShader);
    composer.addPass(brightnessPass);

    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.4, 0.85);
    composer.addPass(bloomPass);
}

// Background Color Fix
renderer.setClearColor(0x222222); // Change to a visible background color

export function renderScene(scene) {
    // Render the scene
    renderer.autoClear = false;
    renderer.clear();

    // Render scene without bloom
    scene.traverse(obj => {
        if (obj.isMesh && !obj.layers.test(bloomLayer)) { // Keep bloom objects on layer 1
            obj.layers.set(0);
        }
    });
    renderer.render(scene, camera);

    // Render bloom pass
    scene.traverse(obj => {
        if ((obj.isMesh || obj.isPoints) && obj.layers.test(bloomLayer)) {
            obj.layers.set(1);
        }
    });
    composer.render();
}
