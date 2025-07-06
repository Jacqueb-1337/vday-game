export class InputManager {
  constructor() {
    this.keys = {};
    this.mousePosition = { x: 0, y: 0 };
    this.mouseDelta = { x: 0, y: 0 };
    this.isMouseLocked = false;
    
    this.initEventListeners();
  }
  
  initEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', (event) => {
      this.keys[event.code] = true;
    });
    
    window.addEventListener('keyup', (event) => {
      this.keys[event.code] = false;
    });
    
    // Mouse events
    window.addEventListener('mousemove', (event) => {
      if (this.isMouseLocked) {
        this.mouseDelta.x = event.movementX || 0;
        this.mouseDelta.y = event.movementY || 0;
      } else {
        this.mousePosition.x = event.clientX;
        this.mousePosition.y = event.clientY;
      }
    });
    
    // Mouse lock functionality (optional)
    window.addEventListener('click', () => {
      if (!this.isMouseLocked) {
        document.body.requestPointerLock = document.body.requestPointerLock || 
                                          document.body.mozRequestPointerLock || 
                                          document.body.webkitRequestPointerLock;
        if (document.body.requestPointerLock) {
          document.body.requestPointerLock();
        }
      }
    });
    
    document.addEventListener('pointerlockchange', () => {
      this.isMouseLocked = document.pointerLockElement === document.body;
    });
  }
  
  // Key state queries
  isKeyPressed(keyCode) {
    return !!this.keys[keyCode];
  }
  
  // Movement keys
  isMovingForward() {
    return this.isKeyPressed('KeyW');
  }
  
  isMovingBackward() {
    return this.isKeyPressed('KeyS');
  }
  
  isMovingLeft() {
    return this.isKeyPressed('KeyA');
  }
  
  isMovingRight() {
    return this.isKeyPressed('KeyD');
  }
  
  isJumping() {
    return this.isKeyPressed('Space');
  }
  
  isRunning() {
    return this.isKeyPressed('ShiftLeft') || this.isKeyPressed('ShiftRight');
  }
  
  // Get movement vector
  getMovementVector() {
    const movement = { x: 0, z: 0 };
    
    if (this.isMovingForward()) movement.z -= 1;
    if (this.isMovingBackward()) movement.z += 1;
    if (this.isMovingLeft()) movement.x -= 1;
    if (this.isMovingRight()) movement.x += 1;
    
    // Normalize diagonal movement
    if (movement.x !== 0 && movement.z !== 0) {
      const length = Math.sqrt(movement.x * movement.x + movement.z * movement.z);
      movement.x /= length;
      movement.z /= length;
    }
    
    return movement;
  }
  
  // Mouse delta for camera control (if needed)
  getMouseDelta() {
    const delta = { ...this.mouseDelta };
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    return delta;
  }
}
