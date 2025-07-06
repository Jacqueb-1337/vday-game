import * as THREE from 'three';

export class SpriteManager {
  constructor(scene) {
    this.scene = scene;
    this.sprites = new Map();
    this.spriteGroups = new Map();
    
    this.initDefaultSprites();
  }
  
  initDefaultSprites() {
    // Create default sprite materials using colored rectangles
    // In a real game, you'd load actual sprite textures here
    
    // Player sprite - simple colored rectangle
    const playerCanvas = this.createColoredSprite(32, 48, '#4a90e2', '#ffffff');
    const playerTexture = new THREE.CanvasTexture(playerCanvas);
    playerTexture.magFilter = THREE.NearestFilter;
    playerTexture.minFilter = THREE.NearestFilter;
    
    this.sprites.set('player', {
      texture: playerTexture,
      width: 1.6,
      height: 2.4
    });
    
    // Tree sprite
    const treeCanvas = this.createColoredSprite(24, 32, '#8B4513', '#228B22');
    const treeTexture = new THREE.CanvasTexture(treeCanvas);
    treeTexture.magFilter = THREE.NearestFilter;
    treeTexture.minFilter = THREE.NearestFilter;
    
    this.sprites.set('tree', {
      texture: treeTexture,
      width: 1.2,
      height: 1.6
    });
    
    // Rock sprite
    const rockCanvas = this.createColoredSprite(20, 16, '#696969', '#A9A9A9');
    const rockTexture = new THREE.CanvasTexture(rockCanvas);
    rockTexture.magFilter = THREE.NearestFilter;
    rockTexture.minFilter = THREE.NearestFilter;
    
    this.sprites.set('rock', {
      texture: rockTexture,
      width: 1.0,
      height: 0.8
    });
  }
  
  createColoredSprite(width, height, primaryColor, secondaryColor) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Create a simple sprite design
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, width, height);
    
    // Add some detail with secondary color
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(width * 0.1, height * 0.1, width * 0.8, height * 0.3);
    
    // Add border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
    
    return canvas;
  }
  
  createSprite(spriteType, position = { x: 0, y: 0, z: 0 }) {
    const spriteData = this.sprites.get(spriteType);
    if (!spriteData) {
      console.warn(`Sprite type '${spriteType}' not found!`);
      return null;
    }
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({
      map: spriteData.texture,
      transparent: true,
      alphaTest: 0.1
    });
    
    // Create sprite mesh
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(spriteData.width, spriteData.height, 1);
    sprite.position.set(position.x, position.y + spriteData.height / 2, position.z);
    
    // Store sprite data for sorting
    sprite.userData = {
      type: spriteType,
      baseY: position.y,
      sortOrder: 0
    };
    
    this.scene.add(sprite);
    return sprite;
  }
  
  createBillboardSprite(spriteType, position = { x: 0, y: 0, z: 0 }) {
    const spriteData = this.sprites.get(spriteType);
    if (!spriteData) {
      console.warn(`Sprite type '${spriteType}' not found!`);
      return null;
    }
    
    // Create a plane geometry for the sprite that always faces the camera
    const geometry = new THREE.PlaneGeometry(spriteData.width, spriteData.height);
    const material = new THREE.MeshBasicMaterial({
      map: spriteData.texture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide
    });
    
    const sprite = new THREE.Mesh(geometry, material);
    sprite.position.set(position.x, position.y + spriteData.height / 2, position.z);
    
    // Store sprite data
    sprite.userData = {
      type: spriteType,
      baseY: position.y,
      isBillboard: true,
      sortOrder: 0
    };
    
    this.scene.add(sprite);
    return sprite;
  }
  
  // Update all sprites (for animation, sorting, etc.)
  update(camera) {
    // Sort sprites by depth for proper rendering order
    this.sortSpritesByDepth(camera);
  }
  
  sortSpritesByDepth(camera) {
    const sprites = [];
    
    // Collect all sprites from the scene
    this.scene.traverse((object) => {
      if (object.userData && object.userData.type) {
        sprites.push(object);
      }
    });
    
    // Sort by distance from camera (furthest first)
    sprites.sort((a, b) => {
      const distanceA = camera.position.distanceTo(a.position);
      const distanceB = camera.position.distanceTo(b.position);
      return distanceB - distanceA;
    });
    
    // Update render order
    sprites.forEach((sprite, index) => {
      sprite.renderOrder = index;
    });
  }
  
  // Utility method to make billboards face the camera
  updateBillboards(camera) {
    this.scene.traverse((object) => {
      if (object.userData && object.userData.isBillboard) {
        object.lookAt(camera.position);
      }
    });
  }
}
