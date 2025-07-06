import * as THREE from 'three';

export class Player {
  constructor(scene, spriteManager) {
    this.scene = scene;
    this.spriteManager = spriteManager;
    
    // Player properties
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.speed = 5.0;
    this.runSpeedMultiplier = 2.0;
    this.jumpForce = 8.0;
    this.gravity = -20.0;
    this.isGrounded = true;
    this.groundY = 0;
    
    // Animation properties
    this.animationState = 'idle';
    this.facingDirection = 1; // 1 for right, -1 for left
    
    // Create player sprite
    this.sprite = this.spriteManager.createSprite('player', this.position);
    if (this.sprite) {
      this.sprite.castShadow = true;
    }
    
    // Create collision box for debugging (invisible)
    this.createCollisionBox();
  }
  
  createCollisionBox() {
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      wireframe: true, 
      visible: false 
    });
    this.collisionBox = new THREE.Mesh(geometry, material);
    this.scene.add(this.collisionBox);
  }
  
  update(deltaTime, inputManager) {
    this.handleInput(inputManager, deltaTime);
    this.updatePhysics(deltaTime);
    this.updateAnimation();
    this.updateSpritePosition();
  }
  
  handleInput(inputManager, deltaTime) {
    const movement = inputManager.getMovementVector();
    const isRunning = inputManager.isRunning();
    const isJumping = inputManager.isJumping();
    
    // Calculate movement speed
    let currentSpeed = this.speed;
    if (isRunning) {
      currentSpeed *= this.runSpeedMultiplier;
    }
    
    // Apply horizontal movement
    this.velocity.x = movement.x * currentSpeed;
    this.velocity.z = movement.z * currentSpeed;
    
    // Update facing direction based on movement
    if (movement.x > 0) {
      this.facingDirection = 1;
    } else if (movement.x < 0) {
      this.facingDirection = -1;
    }
    
    // Handle jumping
    if (isJumping && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }
    
    // Update animation state
    if (movement.x !== 0 || movement.z !== 0) {
      this.animationState = isRunning ? 'running' : 'walking';
    } else {
      this.animationState = 'idle';
    }
  }
  
  updatePhysics(deltaTime) {
    // Apply gravity
    if (!this.isGrounded) {
      this.velocity.y += this.gravity * deltaTime;
    }
    
    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    // Ground collision
    if (this.position.y <= this.groundY) {
      this.position.y = this.groundY;
      this.velocity.y = 0;
      this.isGrounded = true;
    }
    
    // Simple world boundaries
    const worldSize = 25;
    this.position.x = Math.max(-worldSize, Math.min(worldSize, this.position.x));
    this.position.z = Math.max(-worldSize, Math.min(worldSize, this.position.z));
  }
  
  updateAnimation() {
    if (!this.sprite) return;
    
    // Simple animation by scaling the sprite slightly
    const time = Date.now() * 0.001;
    
    switch (this.animationState) {
      case 'walking':
        // Subtle bob animation for walking
        const walkBob = Math.sin(time * 8) * 0.05;
        this.sprite.scale.y = 2.4 + walkBob;
        break;
        
      case 'running':
        // Faster bob animation for running
        const runBob = Math.sin(time * 12) * 0.1;
        this.sprite.scale.y = 2.4 + runBob;
        break;
        
      case 'idle':
      default:
        // Gentle breathing animation for idle
        const idleBob = Math.sin(time * 2) * 0.02;
        this.sprite.scale.y = 2.4 + idleBob;
        break;
    }
    
    // Flip sprite based on facing direction
    this.sprite.scale.x = 1.6 * this.facingDirection;
  }
  
  updateSpritePosition() {
    if (!this.sprite) return;
    
    // Update sprite position to match player position
    this.sprite.position.copy(this.position);
    this.sprite.position.y += this.sprite.scale.y / 2; // Center sprite vertically
    
    // Update collision box position
    if (this.collisionBox) {
      this.collisionBox.position.copy(this.position);
      this.collisionBox.position.y += 1; // Center collision box
    }
  }
  
  getPosition() {
    return this.position.clone();
  }
  
  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.updateSpritePosition();
  }
  
  // Collision detection helper
  getCollisionBounds() {
    return {
      min: {
        x: this.position.x - 0.5,
        y: this.position.y,
        z: this.position.z - 0.5
      },
      max: {
        x: this.position.x + 0.5,
        y: this.position.y + 2,
        z: this.position.z + 0.5
      }
    };
  }
}
