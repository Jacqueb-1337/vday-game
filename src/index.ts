import * as THREE from 'three';
import { Game } from './components/Game';
import { Camera } from './components/Camera';
import { MainScene } from './scenes/MainScene';

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({ canvas });
const camera = new Camera();
const mainScene = new MainScene();

const game = new Game(renderer, camera, mainScene);

function gameLoop() {
    game.update();
    game.render();
    requestAnimationFrame(gameLoop);
}

game.startGame();
gameLoop();