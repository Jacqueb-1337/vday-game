import * as THREE from 'three';
import { tiles } from './tilemap.js';

export class BuildingManager {
    constructor(devModeManager) {
        this.devModeManager = devModeManager; // Reference to the main dev mode manager
        
        // Building system properties
        this.buildingMode = false; // Whether we're in building placement mode
        this.buildings = []; // Array of placed buildings
        this.objectTypes = []; // Available object PNG files
        this.selectedObjectType = ''; // Currently selected object type
        this.objectSize = { width: 1, height: 1 }; // Current object size (resizable)
        this.buildingLayer = null; // Three.js group for building objects
        this.buildingPreview = null; // Preview of building being placed
        
        this.isInitialized = false;
    }
    
    init(scene) {
        if (this.isInitialized) return;
        
        this.scene = scene; // Store scene reference
        
        // Create building layer
        this.buildingLayer = new THREE.Group();
        this.buildingLayer.name = 'devModeBuildings';
        this.scene.add(this.buildingLayer);
        
        // Building layer should always be visible for placed objects
        this.buildingLayer.visible = true;
        
        this.isInitialized = true;
        
        // Load available object types from PNG files
        this.loadObjectTypes();
        
        // Load existing objects from file
        this.loadObjectsFromFile();
    }
    
    async loadObjectTypes() {
        try {
            // Since we're running in NW.js, we can use Node.js fs module
            const fs = require('fs');
            const path = require('path');
            
            const objectsDir = path.join(process.cwd(), 'src', 'assets', 'objects');
            
            // Create objects directory if it doesn't exist
            if (!fs.existsSync(objectsDir)) {
                fs.mkdirSync(objectsDir, { recursive: true });
                console.log('Created assets/objects directory - add PNG files here for building objects');
            }
            
            // Read PNG files from the objects directory
            let objectFiles = [];
            try {
                objectFiles = fs.readdirSync(objectsDir);
            } catch (error) {
                console.warn('Could not read objects directory');
            }
            
            // Filter for PNG files and remove the extension
            const validObjectTypes = objectFiles
                .filter(file => file.endsWith('.png'))
                .map(file => file.replace('.png', ''))
                .sort(); // Sort alphabetically for consistent ordering
            
            this.objectTypes = validObjectTypes;
            
            // Set default object type to the first one if available
            if (!this.selectedObjectType && validObjectTypes.length > 0) {
                this.selectedObjectType = validObjectTypes[0];
            }
            
            console.log(`Loaded ${validObjectTypes.length} object types:`, validObjectTypes);
            
        } catch (error) {
            console.error('Error loading object types:', error);
            // Fallback to empty array
            this.objectTypes = [];
        }
    }
    
    toggleBuildingMode() {
        this.buildingMode = !this.buildingMode;
        
        if (this.buildingMode) {
            // Entering building mode
            console.log('Entering building mode');
            this.showObjectSelector();
        } else {
            // Exiting building mode
            console.log('Exiting building mode');
            this.hideObjectSelector();
            this.clearBuildingPreview();
        }
        
        // Update visibility
        this.updateLayerVisibility();
    }
    
    showObjectSelector() {
        // Create or show object selector UI
        if (!this.objectSelectorModal) {
            this.createObjectSelectorModal();
        }
        
        this.objectSelectorModal.style.display = 'block';
        this.populateObjectSelector();
    }
    
    hideObjectSelector() {
        if (this.objectSelectorModal) {
            this.objectSelectorModal.style.display = 'none';
        }
    }
    
    createObjectSelectorModal() {
        // Create modal for object selection
        this.objectSelectorModal = document.createElement('div');
        this.objectSelectorModal.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 250px;
            max-height: 400px;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #4CAF50;
            border-radius: 8px;
            padding: 12px;
            z-index: 10000;
            color: white;
            font-family: Arial, sans-serif;
            overflow-y: auto;
            pointer-events: all;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
        `;
        
        // Prevent click-through by stopping event propagation
        this.objectSelectorModal.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        this.objectSelectorModal.addEventListener('mousedown', (event) => {
            event.stopPropagation();
        });
        this.objectSelectorModal.addEventListener('mouseup', (event) => {
            event.stopPropagation();
        });
        this.objectSelectorModal.addEventListener('contextmenu', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        
        // Title
        const title = document.createElement('h3');
        title.textContent = 'Object Selector';
        title.style.cssText = `
            margin: 0 0 15px 0;
            color: #4CAF50;
            text-align: center;
        `;
        this.objectSelectorModal.appendChild(title);
        
        // Size controls
        const sizeControls = document.createElement('div');
        sizeControls.style.cssText = `
            margin-bottom: 12px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
        `;
        
        const sizeLabel = document.createElement('div');
        sizeLabel.textContent = 'Object Size:';
        sizeLabel.style.cssText = `
            font-weight: bold;
            margin-bottom: 6px;
            text-align: center;
            font-size: 12px;
        `;
        sizeControls.appendChild(sizeLabel);
        
        const sizeDisplay = document.createElement('div');
        sizeDisplay.id = 'object-size-display';
        sizeDisplay.style.cssText = `
            text-align: center;
            font-size: 16px;
            margin-bottom: 6px;
            color: #4CAF50;
        `;
        sizeControls.appendChild(sizeDisplay);
        
        const sizeHint = document.createElement('div');
        sizeHint.textContent = 'Use mouse wheel to resize';
        sizeHint.style.cssText = `
            font-size: 10px;
            text-align: center;
            color: #999;
        `;
        sizeControls.appendChild(sizeHint);
        
        this.objectSelectorModal.appendChild(sizeControls);
        
        // Object list container
        this.objectList = document.createElement('div');
        this.objectList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 12px;
        `;
        this.objectSelectorModal.appendChild(this.objectList);
        
        // Refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = 'Refresh Objects';
        refreshBtn.style.cssText = `
            margin-bottom: 8px;
            padding: 6px 12px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            font-size: 12px;
        `;
        refreshBtn.onclick = () => {
            this.loadObjectTypes().then(() => {
                this.populateObjectSelector();
            });
        };
        // Prevent click-through on button
        refreshBtn.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        this.objectSelectorModal.appendChild(refreshBtn);
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 6px 12px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            font-size: 12px;
        `;
        closeBtn.onclick = () => {
            this.buildingMode = false;
            this.hideObjectSelector();
            this.clearBuildingPreview();
            this.updateLayerVisibility();
        };
        // Prevent click-through on button
        closeBtn.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        this.objectSelectorModal.appendChild(closeBtn);
        
        // Add scroll wheel event listener for resizing
        this.objectSelectorModal.addEventListener('wheel', (event) => {
            event.preventDefault();
            this.handleSizeScroll(event);
        });
        
        document.body.appendChild(this.objectSelectorModal);
    }
    
    handleSizeScroll(event) {
        const delta = event.deltaY > 0 ? -1 : 1; // Scroll up = increase, scroll down = decrease
        
        // Resize both width and height together, with min size of 1
        this.objectSize.width = Math.max(1, this.objectSize.width + delta);
        this.objectSize.height = Math.max(1, this.objectSize.height + delta);
        
        // Update size display
        this.updateSizeDisplay();
        
        // Update preview in real-time
        this.updateBuildingPreview();
    }
    
    updateSizeDisplay() {
        const sizeDisplay = document.getElementById('object-size-display');
        if (sizeDisplay) {
            sizeDisplay.textContent = `${this.objectSize.width}x${this.objectSize.height}`;
        }
    }
    
    populateObjectSelector() {
        if (!this.objectList) return;
        
        // Clear existing content
        this.objectList.innerHTML = '';
        
        // Update size display
        this.updateSizeDisplay();
        
        if (this.objectTypes.length === 0) {
            const noObjects = document.createElement('div');
            noObjects.style.cssText = `
                text-align: center;
                color: #999;
                padding: 20px;
                font-style: italic;
            `;
            noObjects.textContent = 'No PNG files found in src/assets/objects/';
            this.objectList.appendChild(noObjects);
            return;
        }
        
        // Add object options
        for (const objectType of this.objectTypes) {
            const objectOption = document.createElement('div');
            objectOption.style.cssText = `
                padding: 8px;
                background: ${this.selectedObjectType === objectType ? '#4CAF50' : '#333'};
                border: 1px solid #555;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            // Object preview image
            const objectImg = document.createElement('img');
            objectImg.style.cssText = `
                width: 24px;
                height: 24px;
                image-rendering: pixelated;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
            `;
            objectImg.src = `src/assets/objects/${objectType}.png`;
            objectImg.onerror = () => {
                objectImg.style.display = 'none';
            };
            
            // Object info
            const objectInfo = document.createElement('div');
            objectInfo.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 2px; font-size: 12px;">${this.formatObjectName(objectType)}</div>
                <div style="font-size: 9px; color: #999;">${objectType}.png</div>
            `;
            
            objectOption.appendChild(objectImg);
            objectOption.appendChild(objectInfo);
            
            objectOption.onclick = (event) => {
                event.stopPropagation(); // Prevent click-through
                this.selectedObjectType = objectType;
                this.populateObjectSelector(); // Refresh to show selection
                this.updateBuildingPreview(); // Update preview
            };
            
            // Prevent all mouse events from propagating
            objectOption.addEventListener('mousedown', (event) => {
                event.stopPropagation();
            });
            objectOption.addEventListener('mouseup', (event) => {
                event.stopPropagation();
            });
            
            objectOption.onmouseenter = () => {
                if (this.selectedObjectType !== objectType) {
                    objectOption.style.background = '#444';
                }
            };
            
            objectOption.onmouseleave = () => {
                if (this.selectedObjectType !== objectType) {
                    objectOption.style.background = '#333';
                }
            };
            
            this.objectList.appendChild(objectOption);
        }
    }
    
    formatObjectName(objectType) {
        // Convert filename to readable name (e.g., "stone_wall" -> "Stone Wall")
        return objectType
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    // This method is defined later in the file with proper texture preview
    
    clearBuildingPreview() {
        if (this.buildingPreview) {
            // Dispose of all geometries and materials in the preview
            this.buildingPreview.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (child.material.map) {
                        child.material.map.dispose();
                    }
                    child.material.dispose();
                }
            });
            
            this.buildingLayer.remove(this.buildingPreview);
            this.buildingPreview = null;
            console.log('Building preview cleared');
        }
    }
    
    updateLayerVisibility() {
        if (this.buildingLayer) {
            // Building layer should always be visible when objects exist
            // Only the origin markers and previews should be controlled by dev mode
            this.buildingLayer.visible = true;
            
            // Make the entire building layer non-interactive for raycasting
            // This prevents click-through issues with the underlying game
            this.buildingLayer.traverse((child) => {
                if (child.isMesh) {
                    child.raycast = function() {}; // Disable raycasting for all meshes in this layer
                }
            });
            
            console.log(`Building layer visibility set to: ${this.buildingLayer.visible}`);
        }
    }
    
    // Handle mouse events for building placement
    handleMouseMove(event, worldPosition) {
        if (!this.buildingMode || !this.selectedObjectType) return;
        
        // Update building preview position to snap to grid
        if (this.buildingPreview) {
            const snapX = Math.floor(worldPosition.x);
            const snapY = Math.floor(worldPosition.y); // Use Y instead of Z for 2D movement
            this.buildingPreview.position.set(snapX, snapY, 0);
        }
    }
    
    handleMouseClick(event, worldPosition) {
        if (!this.buildingMode || !this.selectedObjectType) return;
        
        // Place object at clicked position
        this.placeObjectAt(worldPosition);
    }
    
    placeObjectAt(worldPosition) {
        if (!this.selectedObjectType) return;
        
        const snapX = Math.floor(worldPosition.x);
        const snapY = Math.floor(worldPosition.y); // Use Y instead of Z for 2D placement
        
        // Create object instance
        const object = {
            id: `object_${Date.now()}`,
            objectType: this.selectedObjectType,
            position: { x: snapX, y: snapY },
            size: { width: this.objectSize.width, height: this.objectSize.height },
            rotation: 0,
            mesh: null // Will store the Three.js mesh
        };
        
        this.buildings.push(object);
        
        console.log('Placed object:', object);
        
        // Create the visual object overlay
        this.createObjectOverlay(object);
        
        // Add to undo stack
        this.devModeManager.pushUndoState({
            type: 'object_place',
            objectId: object.id,
            objectData: { ...object } // Store object data for undo
        });
        
        // Auto-save objects after placement
        this.saveObjectsToFile();
    }
    
    createObjectOverlay(object) {
        console.log('Creating object overlay for:', object);
        
        // Create object group
        const objectGroup = new THREE.Group();
        objectGroup.name = `object_${object.id}`;
        
        // Load the PNG texture
        const textureLoader = new THREE.TextureLoader();
        const texturePath = `src/assets/objects/${object.objectType}.png`;
        
        console.log(`Loading texture from: ${texturePath}`);
        
        const texture = textureLoader.load(texturePath, (tex) => {
            console.log(`Texture loaded successfully: ${texturePath}`, tex);
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.generateMipmaps = false;
            tex.needsUpdate = true;
        }, undefined, (error) => {
            console.error(`Failed to load object texture: ${texturePath}`, error);
        });
        
        // Create geometry that spans the entire object size
        const geometry = new THREE.PlaneGeometry(object.size.width, object.size.height);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1, // Helps with transparency
            side: THREE.DoubleSide
        });
        
        // Create the main object mesh
        const objectMesh = new THREE.Mesh(geometry, material);
        
        // Make the mesh non-interactive for raycasting to prevent click-through issues
        objectMesh.userData.isObjectOverlay = true;
        objectMesh.raycast = function() {}; // Disable raycasting for this mesh
        
        // Position the mesh so its bottom-left corner is at the origin tile
        // Center the mesh within its size area
        const meshX = object.position.x + (object.size.width - 1) / 2;
        const meshY = object.position.y + (object.size.height - 1) / 2;
        const meshZ = 0.05; // Slightly above ground tiles
        
        objectMesh.position.set(meshX, meshY, meshZ);
        
        console.log(`Object mesh positioned at: (${meshX}, ${meshY}, ${meshZ})`);
        
        objectGroup.add(objectMesh);
        
        // Add origin marker (green dot) for dev mode
        if (this.devModeManager.isActive) {
            this.addOriginMarker(objectGroup, object);
        }
        
        // Add to building layer
        this.buildingLayer.add(objectGroup);
        
        // Store reference to the mesh in the object
        object.mesh = objectGroup;
        
        console.log(`Created object overlay for ${object.objectType} at (${object.position.x}, ${object.position.y}) with size ${object.size.width}x${object.size.height}`);
    }
    
    addOriginMarker(objectGroup, object) {
        // Create a small green dot to mark the origin tile
        const markerGeometry = new THREE.CircleGeometry(0.1, 8);
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        
        const originMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        
        // Make origin marker non-interactive for raycasting
        originMarker.userData.isOriginMarker = true;
        originMarker.raycast = function() {}; // Disable raycasting
        
        // The origin marker should be at the bottom-left corner relative to the object center
        // If object is 1x1, center is at (0,0) relative to group, origin is at (-0, -0) = (0,0)
        // If object is 2x2, center is at (0,0) relative to group, origin is at (-0.5, -0.5)
        // If object is 3x3, center is at (0,0) relative to group, origin is at (-1, -1)
        const markerX = -(object.size.width - 1) / 2;
        const markerY = -(object.size.height - 1) / 2;
        
        originMarker.position.set(markerX, markerY, 0.1); // Above the object
        originMarker.name = 'originMarker';
        
        console.log(`Origin marker positioned at: (${markerX}, ${markerY}, 0.1) relative to object center`);
        
        objectGroup.add(originMarker);
    }
    
    // Update preview to show the actual texture and proper sizing
    updateBuildingPreview() {
        // Clear existing preview
        this.clearBuildingPreview();
        
        if (!this.selectedObjectType || !this.buildingMode) return;
        
        // Create preview group
        this.buildingPreview = new THREE.Group();
        this.buildingPreview.name = 'buildingPreview';
        
        // Create preview outline tiles
        const outlineGeometry = new THREE.PlaneGeometry(1, 1);
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x4CAF50,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        // Create outline for each tile the object will occupy
        for (let x = 0; x < this.objectSize.width; x++) {
            for (let y = 0; y < this.objectSize.height; y++) {
                const outlineTile = new THREE.Mesh(outlineGeometry, outlineMaterial);
                
                // Make outline tiles non-interactive for raycasting
                outlineTile.userData.isPreviewOutline = true;
                outlineTile.raycast = function() {}; // Disable raycasting
                
                outlineTile.position.set(x, y, 0.08);
                this.buildingPreview.add(outlineTile);
            }
        }
        
        // Create preview of the actual object (semi-transparent)
        const textureLoader = new THREE.TextureLoader();
        const texturePath = `src/assets/objects/${this.selectedObjectType}.png`;
        
        const texture = textureLoader.load(texturePath, (tex) => {
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.generateMipmaps = false;
            tex.needsUpdate = true;
        }, undefined, (error) => {
            console.warn(`Failed to load preview texture: ${texturePath}`);
        });
        
        const previewGeometry = new THREE.PlaneGeometry(this.objectSize.width, this.objectSize.height);
        const previewMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.7,
            alphaTest: 0.1,
            side: THREE.DoubleSide
        });
        
        const previewMesh = new THREE.Mesh(previewGeometry, previewMaterial);
        
        // Make preview mesh non-interactive for raycasting
        previewMesh.userData.isPreview = true;
        previewMesh.raycast = function() {}; // Disable raycasting
        
        previewMesh.position.set(
            (this.objectSize.width - 1) / 2,
            (this.objectSize.height - 1) / 2,
            0.09
        );
        
        this.buildingPreview.add(previewMesh);
        
        // Add origin marker to preview
        const originGeometry = new THREE.CircleGeometry(0.1, 8);
        const originMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.9
        });
        
        const originMarker = new THREE.Mesh(originGeometry, originMaterial);
        
        // Make preview origin marker non-interactive for raycasting
        originMarker.userData.isPreviewOrigin = true;
        originMarker.raycast = function() {}; // Disable raycasting
        
        originMarker.position.set(0, 0, 0.1);
        this.buildingPreview.add(originMarker);
        
        this.buildingLayer.add(this.buildingPreview);
        
        console.log(`Preview updated for ${this.selectedObjectType} (${this.objectSize.width}x${this.objectSize.height})`);
    }
    
    // Clean up when dev mode is deactivated
    cleanup() {
        this.buildingMode = false;
        this.hideObjectSelector();
        this.clearBuildingPreview();
        
        // Keep objects visible when exiting dev mode
        // Only hide origin markers and previews
        this.updateOriginMarkersVisibility();
        
        // Building layer should remain visible
        if (this.buildingLayer) {
            this.buildingLayer.visible = true;
        }
    }
    
    // Get object at position (for editing/deletion) - now uses position-based detection
    getObjectAt(worldPosition) {
        // Find object that contains the given position
        for (const object of this.buildings) {
            const ox = object.position.x;
            const oy = object.position.y;
            
            // Check if the world position falls within the object's bounds
            // Use floor to snap to tile coordinates for consistent detection
            const tileX = Math.floor(worldPosition.x);
            const tileY = Math.floor(worldPosition.y); // Use Y instead of Z for 2D detection
            
            if (tileX >= ox && tileX < ox + object.size.width &&
                tileY >= oy && tileY < oy + object.size.height) {
                return object;
            }
        }
        return null;
    }
    
    // Remove object and its mesh from scene
    removeObject(object) {
        const index = this.buildings.indexOf(object);
        if (index !== -1) {
            this.buildings.splice(index, 1);
            
            // Remove the mesh from the scene
            if (object.mesh && this.buildingLayer) {
                this.buildingLayer.remove(object.mesh);
                
                // Dispose of geometry and materials to prevent memory leaks
                object.mesh.traverse((child) => {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (child.material.map) {
                            child.material.map.dispose();
                        }
                        child.material.dispose();
                    }
                });
            }
            
            console.log('Removed object:', object.id);
            
            // Add to undo stack
            this.devModeManager.pushUndoState({
                type: 'object_remove',
                objectId: object.id,
                objectData: { ...object } // Store object data for undo
            });
            
            // Auto-save objects after removal
            this.saveObjectsToFile();
        }
    }
    
    // Handle right-click to delete objects
    handleRightClick(event, worldPosition) {
        if (!this.buildingMode) return;
        
        const object = this.getObjectAt(worldPosition);
        if (object) {
            this.removeObject(object);
            return true; // Indicate that we handled the right-click
        }
        return false;
    }
    
    // Undo/Redo support
    undoObjectAction(action) {
        if (action.type === 'object_place') {
            // Find and remove the object
            const object = this.buildings.find(obj => obj.id === action.objectId);
            if (object) {
                this.removeObjectQuiet(object); // Remove without adding to undo stack
            }
        } else if (action.type === 'object_remove') {
            // Recreate the object
            const objectData = action.objectData;
            objectData.mesh = null; // Reset mesh reference
            this.buildings.push(objectData);
            this.createObjectOverlay(objectData);
        }
        
        // Save after undo operation
        this.saveObjectsToFile();
    }
    
    redoObjectAction(action) {
        if (action.type === 'object_place') {
            // Recreate the object
            const objectData = action.objectData;
            objectData.mesh = null; // Reset mesh reference
            this.buildings.push(objectData);
            this.createObjectOverlay(objectData);
        } else if (action.type === 'object_remove') {
            // Find and remove the object
            const object = this.buildings.find(obj => obj.id === action.objectId);
            if (object) {
                this.removeObjectQuiet(object); // Remove without adding to undo stack
            }
        }
        
        // Save after redo operation
        this.saveObjectsToFile();
    }
    
    // Remove object without adding to undo stack (for undo/redo operations)
    removeObjectQuiet(object) {
        const index = this.buildings.indexOf(object);
        if (index !== -1) {
            this.buildings.splice(index, 1);
            
            // Remove the mesh from the scene
            if (object.mesh && this.buildingLayer) {
                this.buildingLayer.remove(object.mesh);
                
                // Dispose of geometry and materials to prevent memory leaks
                object.mesh.traverse((child) => {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (child.material.map) {
                            child.material.map.dispose();
                        }
                        child.material.dispose();
                    }
                });
            }
            
            console.log('Removed object (quiet):', object.id);
        }
    }
    
    // Update visibility of origin markers based on dev mode state
    updateOriginMarkersVisibility() {
        if (!this.buildingLayer) return;
        
        this.buildingLayer.traverse((child) => {
            if (child.name === 'originMarker') {
                child.visible = this.devModeManager.isActive;
            }
        });
    }
    
    // Save/Load system for objects
    getObjectsData() {
        return this.buildings.map(object => ({
            id: object.id,
            objectType: object.objectType,
            position: { ...object.position },
            size: { ...object.size },
            rotation: object.rotation
        }));
    }
    
    async saveObjectsToFile() {
        try {
            const fs = require('fs');
            const path = require('path');
            
            const objectMapPath = path.join(process.cwd(), 'objectmap.json');
            const objectsData = this.getObjectsData();
            
            fs.writeFileSync(objectMapPath, JSON.stringify(objectsData, null, 2));
            console.log(`Saved ${objectsData.length} objects to objectmap.json`);
        } catch (error) {
            console.error('Failed to save objects:', error);
        }
    }
    
    async loadObjectsFromFile() {
        try {
            const fs = require('fs');
            const path = require('path');
            
            const objectMapPath = path.join(process.cwd(), 'objectmap.json');
            
            if (!fs.existsSync(objectMapPath)) {
                console.log('No objectmap.json found, starting with empty object map');
                return;
            }
            
            const objectsData = JSON.parse(fs.readFileSync(objectMapPath, 'utf8'));
            this.loadObjectsData(objectsData);
        } catch (error) {
            console.error('Failed to load objects:', error);
        }
    }
    
    loadObjectsData(objectsData) {
        // Clear existing objects
        this.clearAllObjects();
        
        // Recreate objects from data
        for (const objectData of objectsData) {
            const object = {
                id: objectData.id,
                objectType: objectData.objectType,
                position: { ...objectData.position },
                size: { ...objectData.size },
                rotation: objectData.rotation || 0,
                mesh: null
            };
            
            this.buildings.push(object);
            this.createObjectOverlay(object);
        }
        
        console.log(`Loaded ${objectsData.length} objects`);
    }
    
    clearAllObjects() {
        // Remove all object meshes from scene
        for (const object of this.buildings) {
            if (object.mesh && this.buildingLayer) {
                this.buildingLayer.remove(object.mesh);
                
                // Dispose of geometry and materials
                object.mesh.traverse((child) => {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (child.material.map) {
                            child.material.map.dispose();
                        }
                        child.material.dispose();
                    }
                });
            }
        }
        
        // Clear the buildings array
        this.buildings = [];
        console.log('Cleared all objects');
    }
}
