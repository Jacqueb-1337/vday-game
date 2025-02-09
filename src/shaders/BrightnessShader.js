import * as THREE from 'three';

export const BrightnessShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "brightness": { value: 0.85 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float brightness;
        varying vec2 vUv;
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            color.rgb *= brightness;
            gl_FragColor = color;
        }
    `
};
