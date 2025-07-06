import * as THREE from 'three';
import { camera } from '../camera.js';
import { tiles, tilemap } from '../tilemap.js';

export class DevModeVisualization {
    constructor(devModeManager) {
        this.devModeManager = devModeManager;
        this.visualizationLayer = null;
        this.gridLayer = null;
        this.tileOverlays = new Map(); // Cache for tile overlay meshes
        this.viewDistance = 15; // Only show overlays within this distance
        this.showGrid = true; // Toggle for grid visibility
    }

    init(scene) {
        // Create visualization layer
        this.visualizationLayer = new THREE.Group();
        this.visualizationLayer.name = 'devModeVisualization';
        scene.add(this.visualizationLayer);
        
        // Create grid layer
        this.gridLayer = new THREE.Group();
        this.gridLayer.name = 'devModeGrid';
        scene.add(this.gridLayer);
        
        // Initially hide all layers
        this.visualizationLayer.visible = false;
        this.gridLayer.visible = false;
    }

    updateVisualization() {
        if (!this.devModeManager.isActive || !this.devModeManager.isInitialized) return;
        
        // Clear existing overlays efficiently
        this.clearOverlays();
        
        // Batch overlay creation for better performance
        this.createOverlaysBatched();
    }

    createOverlaysBatched() {
        // Create overlays only for visible tiles in view
        const cameraPosition = camera.position;
        
        tiles.forEach(tile => {
            const { x, y } = tile.position;
            
            // Frustum culling - only create overlays for tiles near camera
            const distance = Math.sqrt(
                Math.pow(x - cameraPosition.x, 2) + 
                Math.pow(y - cameraPosition.y, 2)
            );
            
            if (distance > this.viewDistance) return; // Skip distant tiles
            
            const isWalkable = tile.userData.walkable;
            
            // Create individual geometry and material for each overlay
            const geometry = new THREE.PlaneGeometry(0.9, 0.9);
            const material = new THREE.MeshBasicMaterial({
                color: isWalkable ? 0x00ff00 : 0xff0000,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            
            const overlay = new THREE.Mesh(geometry, material);
            overlay.position.set(x, y, 0.01);
            overlay.userData.originalTile = tile;
            overlay.renderOrder = 1000; // Render on top
              this.visualizationLayer.add(overlay);
            this.tileOverlays.set(`${x},${y}`, overlay);
        });
    }

    clearOverlays() {
        // Dispose of geometries and materials to prevent memory leaks
        this.visualizationLayer.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        
        // Clear the layer efficiently
        this.visualizationLayer.clear();
        this.tileOverlays.clear();
    }

    updateGrid() {
        if (!this.devModeManager.isActive || !this.devModeManager.isInitialized) return;
        
        // Clear existing grid
        this.gridLayer.clear();
        
        if (!this.showGrid) return;
        
        const cameraPosition = camera.position;
        const gridSize = 20; // Show grid in a 20x20 area around camera
        const startX = Math.floor(cameraPosition.x - gridSize / 2);
        const endX = Math.ceil(cameraPosition.x + gridSize / 2);
        const startY = Math.floor(cameraPosition.y - gridSize / 2);
        const endY = Math.ceil(cameraPosition.y + gridSize / 2);
        
        // Create grid lines
        const gridMaterial = new THREE.LineBasicMaterial({ 
            color: 0x666666, 
            transparent: true, 
            opacity: 0.3 
        });
        
        // Vertical lines
        for (let x = startX; x <= endX; x++) {
            const points = [];
            points.push(new THREE.Vector3(x - 0.5, startY - 0.5, 0.005));
            points.push(new THREE.Vector3(x - 0.5, endY + 0.5, 0.005));
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, gridMaterial);
            this.gridLayer.add(line);
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y++) {
            const points = [];
            points.push(new THREE.Vector3(startX - 0.5, y - 0.5, 0.005));
            points.push(new THREE.Vector3(endX + 0.5, y - 0.5, 0.005));
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, gridMaterial);
            this.gridLayer.add(line);
        }
    }

    // More efficient method to update single tile overlay
    updateSingleTile(tile) {
        if (!this.devModeManager.isActive || !this.devModeManager.isInitialized) return;
        
        const { x, y } = tile.position;
        const key = `${x},${y}`;
        const existingOverlay = this.tileOverlays.get(key);
        
        if (existingOverlay) {
            // Update existing overlay color
            const isWalkable = tile.userData.walkable;
            const color = isWalkable ? 0x00ff00 : 0xff0000;
            existingOverlay.material.color.setHex(color);
        } else if (this.devModeManager.isActive && this.devModeManager.isInitialized) {
            // If overlay doesn't exist, create it
            this.createSingleOverlay(tile);
        }
    }
    
    // Helper method to create a single overlay for a tile
    createSingleOverlay(tile) {
        const { x, y } = tile.position;
        const key = `${x},${y}`;
        
        // Don't create duplicate overlays
        if (this.tileOverlays.has(key)) return;
        
        const isWalkable = tile.userData.walkable;
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({
            color: isWalkable ? 0x00ff00 : 0xff0000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        const overlay = new THREE.Mesh(geometry, material);
        overlay.position.set(x, y, 0.01);
        overlay.userData.originalTile = tile;
        overlay.renderOrder = 1000; // Render on top
        
        this.visualizationLayer.add(overlay);
        this.tileOverlays.set(key, overlay);
    }

    activate() {
        this.visualizationLayer.visible = true;
        this.gridLayer.visible = this.showGrid;
        this.updateVisualization();
        this.updateGrid();
    }

    deactivate() {
        this.visualizationLayer.visible = false;
        this.gridLayer.visible = false;
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.gridLayer.visible = this.showGrid && this.devModeManager.isActive;
        if (this.showGrid && this.devModeManager.isActive) {
            this.updateGrid();
        }
    }

    cleanup() {
        // Dispose of geometries and materials to prevent memory leaks
        if (this.visualizationLayer) {
            this.visualizationLayer.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.visualizationLayer.clear();
        }

        if (this.gridLayer) {
            this.gridLayer.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.gridLayer.clear();
        }

        this.tileOverlays.clear();
    }

    // Public method to refresh visualization (call when tiles change)
    refresh() {
        if (this.devModeManager.isActive && this.devModeManager.isInitialized) {
            // Debounce refresh to prevent excessive updates
            clearTimeout(this.devModeManager.updateDebounceTimer);
            this.devModeManager.updateDebounceTimer = setTimeout(() => {
                this.updateVisualization();
            }, 100); // Only refresh 100ms after last call
        }
    }
}
