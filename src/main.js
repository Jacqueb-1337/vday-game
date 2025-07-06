import * as THREE from 'three';
import { Game } from './game/Game.js';

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
  const gameContainer = document.getElementById('game-container');
  
  if (!gameContainer) {
    console.error('Game container not found!');
    return;
  }
  
  // Create and start the game
  const game = new Game(gameContainer);
  game.start();
  
  // Handle window resize
  window.addEventListener('resize', () => {
    game.handleResize();
  });
});
