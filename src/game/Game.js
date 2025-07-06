import * as THREE from 'three';
import { Player } from './Player.js';
import { InputManager } from './InputManager.js';
import { SpriteManager } from './SpriteManager.js';

export class Game {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.player = null;
    this.inputManager = null;
    this.spriteManager = null;
    
    // Game state
    this.isRunning = false;
    this.clock = new THREE.Clock();
    this.frameCount = 0;
    this.lastFPSUpdate = 0;
    
    // UI elements
    this.positionElement = document.getElementById('position');
    this.fpsElement = document.getElementById('fps');
  }
  
  init() {
    // Create the scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Create the camera (top-down perspective but with slight angle for depth)
    this.camera = new THREE.PerspectiveCamera(
      60, // field of view
      window.innerWidth / window.innerHeight, // aspect ratio
      0.1, // near clipping plane
      1000 // far clipping plane
    );
    
    // Position camera for top-down view with slight angle
    this.camera.position.set(0, 15, 8);
    this.camera.lookAt(0, 0, 0);
    
    // Create the renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
    
    // Initialize managers
    this.inputManager = new InputManager();
    this.spriteManager = new SpriteManager(this.scene);
    
    // Create the ground
    this.createGround();
    
    // Add lighting
    this.setupLighting();
    
    // Create the player
    this.player = new Player(this.scene, this.spriteManager);
    
    console.log('Game initialized successfully!');
  }
  
  createGround() {
    // Create a large ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 }); // Light green
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Add some grid lines for reference
    const gridHelper = new THREE.GridHelper(50, 50, 0x000000, 0x000000);
    gridHelper.material.opacity = 0.1;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }
  
  setupLighting() {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    // Directional light for shadows and definition
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -25;
    directionalLight.shadow.camera.right = 25;
    directionalLight.shadow.camera.top = 25;
    directionalLight.shadow.camera.bottom = -25;
    
    this.scene.add(directionalLight);
  }
  
  start() {
    this.init();
    this.isRunning = true;
    this.gameLoop();
  }
  
  stop() {
    this.isRunning = false;
  }
  
  gameLoop() {
    if (!this.isRunning) return;
    
    requestAnimationFrame(() => this.gameLoop());
    
    const deltaTime = this.clock.getDelta();
    
    // Update game objects
    if (this.player) {
      this.player.update(deltaTime, this.inputManager);
    }
    
    // Update camera to follow player
    this.updateCamera();
    
    // Update UI
    this.updateUI();
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
    
    // Update FPS counter
    this.frameCount++;
    if (this.clock.elapsedTime - this.lastFPSUpdate > 1) {
      if (this.fpsElement) {
        this.fpsElement.textContent = this.frameCount;
      }
      this.frameCount = 0;
      this.lastFPSUpdate = this.clock.elapsedTime;
    }
  }
  
  updateCamera() {
    if (!this.player) return;
    
    const playerPosition = this.player.getPosition();
    
    // Camera follows player with offset for top-down view
    const cameraOffset = new THREE.Vector3(0, 15, 8);
    const targetPosition = playerPosition.clone().add(cameraOffset);
    
    // Smooth camera movement
    this.camera.position.lerp(targetPosition, 0.05);
    
    // Camera always looks at player
    const lookAtTarget = playerPosition.clone();
    lookAtTarget.y += 2; // Look slightly above the player
    this.camera.lookAt(lookAtTarget);
  }
  
  updateUI() {
    if (!this.player || !this.positionElement) return;
    
    const position = this.player.getPosition();
    this.positionElement.textContent = 
      `${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}`;
  }
  
  handleResize() {
    if (!this.camera || !this.renderer) return;
    
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
