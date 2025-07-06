import * as THREE from 'three';
import { camera } from './camera.js';
import { renderer } from './render.js';
import { tiles, tilemap, updateTilemap, saveTilemap, redrawTile, redrawTiles } from './tilemap.js';
import { BuildingManager } from './BuildingManager.js';
import { npcs } from './npc.js';

// Import modular components
import { TileEditor } from './devmode/TileEditor.js';
import { NPCEditor } from './devmode/NPCEditor.js';
import { DevModeVisualization } from './devmode/DevModeVisualization.js';
import { UndoRedoSystem } from './devmode/UndoRedoSystem.js';
import { DevModeUI } from './devmode/DevModeUI.js';
import { ExpansionTool } from './devmode/ExpansionTool.js';

export class DevModeManager {
    constructor() {
        this.isActive = false;
        this.isInitialized = false;
        this.scene = null;
        
        // Initialize modular components
        this.tileEditor = new TileEditor(this);
        this.npcEditor = new NPCEditor(this);
        this.visualization = new DevModeVisualization(this);
        this.undoRedo = new UndoRedoSystem(this);
        this.ui = new DevModeUI(this);
        this.expansionTool = new ExpansionTool(this);
        
        // Delegate properties to modules for backward compatibility
        this.selectedTile = null;
        this.selectedNPC = null;
        this.popup = null;
        this.backdrop = null;
        this.lastCameraPosition = new THREE.Vector3();
        this.viewDistance = 15;
        this.showGrid = true;
        this.selectedTileType = '';
        this.tileTypes = [''];
        this.expansionMode = false;
        this.isDragging = false;
        this.dragStart = null;
        this.dragEnd = null;
        this.dragPreview = null;
        
        // Initialize building manager
        this.buildingManager = new BuildingManager(this);
        
        // Debounce timers
        this.updateDebounceTimer = null;
        this.saveDebounceTimer = null;
        this.cameraUpdateTimer = null;
    }
      init(scene) {
        if (this.isInitialized) return;
        
        this.scene = scene; // Store scene reference
        
        // Initialize all modules
        this.visualization.init(scene);
        this.ui.init();
        this.expansionTool.init();
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        
        // Load available tile types from assets
        this.loadTileTypes();
        
        // Initialize building manager
        this.buildingManager.init(this.scene);
    }
    
    async loadTileTypes() {
        try {
            // Since we're running in NW.js, we can use Node.js fs module
            const fs = require('fs');
            const path = require('path');
            
            const tilesDir = path.join(process.cwd(), 'src', 'assets', 'tiles');
            
            // Read the tiles directory
            let tileFiles = [];
            try {
                tileFiles = fs.readdirSync(tilesDir);
            } catch (error) {
                console.warn('Could not read tiles directory, falling back to known types');
                // Fallback to known tile types
                tileFiles = [
                    'dirtpath.png',
                    'dirtpathb.png', 
                    'dirtpathbl.png',
                    'dirtpathbr.png',
                    'dirtpathl.png',
                    'dirtpathr.png',
                    'dirtpatht.png',
                    'dirtpathtl.png',
                    'dirtpathtr.png',
                    'grassflowers.png',
                    'grassgeneric.png',
                    'grassweeds.png',
                    'tall_grass.png'
                ];
            }
            
            // Filter for PNG files and remove the extension
            const validTileTypes = tileFiles
                .filter(file => file.endsWith('.png'))
                .map(file => file.replace('.png', ''))
                .sort(); // Sort alphabetically for consistent ordering
            
            // Always include empty option first, then valid tile types
            this.tileTypes = ['', ...validTileTypes];
            
            // Set default tile type to the first non-empty type if current selection is empty
            if (!this.selectedTileType && validTileTypes.length > 0) {
                this.selectedTileType = validTileTypes[0];
            }
            
            console.log(`Loaded ${validTileTypes.length} tile types:`, validTileTypes);
            
            // Refresh tile type selector if it exists
            if (this.tileTypeSelector) {
                this.createTileTypeSelector();
            }
            
        } catch (error) {
            console.error('Error loading tile types:', error);
            // Fallback to minimal tile types
            this.tileTypes = ['', 'grassgeneric'];
            if (!this.selectedTileType) {
                this.selectedTileType = 'grassgeneric';
            }
        }
    }
      setupEventListeners() {
        // Click handler for tile selection
        this.tileClickHandler = (event) => {
            if (!this.isActive) return;
            
            // Don't handle tile clicks if popup is visible
            if (this.popup && this.popup.style.display === 'block') {
                return;
            }
            
            // Don't handle clicks if we just finished dragging
            if (this.isDragging) {
                return;
            }
            
            // Check if building manager should handle this click
            if (this.buildingManager.buildingMode) {
                const worldPos = this.getWorldPositionFromMouse(event);
                if (worldPos) {
                    this.buildingManager.handleMouseClick(event, worldPos);
                }
                return;
            }
            
            if (this.expansionMode) {
                // In expansion mode, dragging is handled by mousedown/mouseup
                // Click events are not used for drag selection
                return;
            } else {
                // Normal tile editing (not in expansion mode)
                this.handleTileClick(event);
            }
        };
        
        // Right-click handler for adding new tiles
        this.contextMenuHandler = (event) => {
            if (!this.isActive) return;
            
            event.preventDefault();
            
            if (!this.expansionMode) {
                this.handleRightClick(event);
            }
        };
        
        // Mouse down handler for drag selection
        this.mouseDownHandler = (event) => {
            if (!this.isActive || !this.expansionMode) return;
            if (event.button === 0 && !this.isDragging) { // Left mouse button and not already dragging
                this.expansionTool.startDragSelection(event);
            }
        };
        
        // Mouse move handler for drag selection and building preview
        this.mouseMoveHandler = (event) => {
            if (!this.isActive) return;
            
            // Handle building preview
            if (this.buildingManager.buildingMode) {
                const worldPos = this.getWorldPositionFromMouse(event);
                if (worldPos) {
                    this.buildingManager.handleMouseMove(event, worldPos);
                }
            }
            
            // Handle drag selection for expansion mode
            if (this.isDragging && this.expansionMode) {
                this.expansionTool.updateDragSelection(event);
            }
        };
        
        // Mouse up handler for drag selection
        this.mouseUpHandler = (event) => {
            if (!this.isActive || !this.expansionMode) return;
            if (event.button === 0 && this.isDragging) { // Left mouse button and currently dragging
                this.expansionTool.endDragSelection(event);
            }
        };
        
        document.addEventListener('click', this.tileClickHandler);
        document.addEventListener('contextmenu', this.contextMenuHandler);
        document.addEventListener('mousedown', this.mouseDownHandler);
        document.addEventListener('mousemove', this.mouseMoveHandler);
        document.addEventListener('mouseup', this.mouseUpHandler);
        
        // Add wheel event handler for object resizing
        this.wheelHandler = (event) => {
            if (!this.isActive || !this.buildingManager.buildingMode) return;
            
            // Only handle wheel events over the canvas
            const rect = renderer.domElement.getBoundingClientRect();
            const isOverCanvas = event.clientX >= rect.left && event.clientX <= rect.right &&
                               event.clientY >= rect.top && event.clientY <= rect.bottom;
            
            if (isOverCanvas) {
                event.preventDefault();
                this.buildingManager.handleSizeScroll(event);
            }
        };
        
        document.addEventListener('wheel', this.wheelHandler, { passive: false });
        
        // Enhanced keyboard shortcuts
        this.keydownHandler = (event) => {
            // Dev mode specific shortcuts (only when active)
            if (this.isActive) {
                if (event.key === 'Escape') {
                    if (this.isDragging) {
                        this.expansionTool.cancelDragSelection();
                        event.preventDefault();
                    } else if (this.expansionMode) {
                        this.toggleExpansionMode();
                        event.preventDefault();
                    } else if (this.popup && this.popup.style.display === 'block') {
                        this.ui.closePopup();
                        event.preventDefault();
                    }
                }
                
                switch(event.key.toLowerCase()) {
                    case 'e':
                        event.preventDefault();
                        this.toggleExpansionMode();
                        break;
                    case 'g':
                        event.preventDefault();
                        this.toggleGrid();
                        break;
                    case 'b':
                        event.preventDefault();
                        this.buildingManager.toggleBuildingMode();
                        break;
                    case 'q':
                        if (this.expansionMode) {
                            event.preventDefault();
                            this.expansionTool.toggleExpansionTool();
                        }
                        break;
                    case 'z':
                        if (event.ctrlKey && !event.shiftKey) {
                            event.preventDefault();
                            this.undoRedo.undo();
                        } else if (event.ctrlKey && event.shiftKey) {
                            event.preventDefault();
                            this.undoRedo.redo();
                        }
                        break;
                    case 'y':
                        if (event.ctrlKey) {
                            event.preventDefault();
                            this.undoRedo.redo();
                        }
                        break;
                }
            }
            
            // F12 or Ctrl+Shift+I to open dev tools (always available)
            if (event.key === 'F12' || (event.ctrlKey && event.shiftKey && event.key === 'I')) {
                if (typeof nw !== 'undefined' && nw.Window) {
                    nw.Window.get().showDevTools();
                    event.preventDefault();
                }
            }
        };
        
        document.addEventListener('keydown', this.keydownHandler);
    }
      activate() {
        if (!this.isInitialized) {
            console.warn('DevModeManager not initialized yet');
            return;
        }
        
        this.isActive = true;
        window.disableCollision = true;
        
        // Activate visualization and UI
        this.visualization.activate();
        this.ui.activate();
        
        // Update building manager visibility and origin markers
        this.buildingManager.updateLayerVisibility();
        this.buildingManager.updateOriginMarkersVisibility();
        
        // Store initial camera position
        this.lastCameraPosition.copy(camera.position);
        
        // Start camera monitoring for efficient updates
        this.startCameraMonitoring();
        
        console.log('Dev Mode activated - Collision disabled, tile visualization enabled');
        console.log('Controls: Left-click = Edit tile, Right-click = Add/Delete tile, B = Object placement');
    }
    
    deactivate() {
        if (!this.isInitialized) return;
        
        this.isActive = false;
        window.disableCollision = false;
        
        // Deactivate visualization and UI
        this.visualization.deactivate();
        this.ui.deactivate();
        
        // Exit expansion mode if active and clean up all state
        if (this.expansionMode) {
            this.expansionMode = false;
            this.expansionTool.cleanup();
        }
        
        // Clean up building manager
        this.buildingManager.cleanup();
        this.buildingManager.updateOriginMarkersVisibility();
        
        // Stop camera monitoring
        this.stopCameraMonitoring();
        
        console.log('Dev Mode deactivated - Collision enabled, tile visualization hidden');
    }
      startCameraMonitoring() {
        if (this.cameraUpdateTimer) return;
        
        this.cameraUpdateTimer = setInterval(() => {
            if (!this.isActive) return;
            
            // Check if camera moved significantly
            const distance = this.lastCameraPosition.distanceTo(camera.position);
            if (distance > 2) { // Only update if camera moved more than 2 units
                this.lastCameraPosition.copy(camera.position);
                this.visualization.updateVisualization();
            }
        }, 500); // Check every 500ms instead of every frame
    }
    
    stopCameraMonitoring() {
        if (this.cameraUpdateTimer) {
            clearInterval(this.cameraUpdateTimer);
            this.cameraUpdateTimer = null;
        }
    }

    // Delegate methods to appropriate modules
    handleTileClick(event) {
        // First check for NPC clicks
        if (this.npcEditor.handleNPCClick(event)) {
            return; // NPC was clicked, don't process tile clicks
        }
        
        // Then handle tile clicks
        this.tileEditor.handleTileClick(event);
    }

    handleRightClick(event) {
        this.tileEditor.handleRightClick(event);
    }

    selectTile(tile) {
        this.selectedTile = tile;
        this.tileEditor.selectTile(tile);
    }

    selectNPC(npc) {
        this.selectedNPC = npc;
        this.npcEditor.selectNPC(npc);
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.visualization.toggleGrid();
    }

    toggleExpansionMode() {
        this.expansionMode = !this.expansionMode;
        this.expansionTool.toggleExpansionMode();
    }

    // Utility methods
    getWorldPositionFromMouse(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        // Intersect with a ground plane at y = 0
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersection = new THREE.Vector3();
        
        if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
            return {
                x: Math.round(intersection.x),
                y: Math.round(intersection.y)
            };
        }
          return null;
    }

    async loadTileTypes() {
        try {
            // Since we're running in NW.js, we can use Node.js fs module
            const fs = require('fs');
            const path = require('path');
            
            const tilesDir = path.join(process.cwd(), 'src', 'assets', 'tiles');
            
            // Read the tiles directory
            let tileFiles = [];
            try {
                tileFiles = fs.readdirSync(tilesDir);
            } catch (error) {
                console.warn('Could not read tiles directory, falling back to known types');
                // Fallback to known tile types
                tileFiles = [
                    'dirtpath.png',
                    'dirtpathb.png', 
                    'dirtpathbl.png',
                    'dirtpathbr.png',
                    'dirtpathl.png',
                    'dirtpathr.png',
                    'dirtpatht.png',
                    'dirtpathtl.png',
                    'dirtpathtr.png',
                    'grassflowers.png',
                    'grassgeneric.png',
                    'grassweeds.png',
                    'tall_grass.png'
                ];
            }
            
            // Filter for PNG files and remove the extension
            const validTileTypes = tileFiles
                .filter(file => file.endsWith('.png'))
                .map(file => file.replace('.png', ''))
                .sort(); // Sort alphabetically for consistent ordering
            
            // Always include empty option first, then valid tile types
            this.tileTypes = ['', ...validTileTypes];
            
            // Set default tile type to the first non-empty type if current selection is empty
            if (!this.selectedTileType && validTileTypes.length > 0) {
                this.selectedTileType = validTileTypes[0];
            }
            
            console.log(`Loaded ${validTileTypes.length} tile types:`, validTileTypes);
            
            // Refresh tile type selector if it exists
            if (this.ui && this.ui.tileTypeSelector) {
                this.ui.refreshTileTypeSelector();
            }
            
        } catch (error) {
            console.error('Error loading tile types:', error);
            // Fallback to minimal tile types
            this.tileTypes = ['', 'grassgeneric'];
            if (!this.selectedTileType) {
                this.selectedTileType = 'grassgeneric';
            }
        }
    }

    // Cleanup method
    cleanup() {
        if (!this.isInitialized) return;
        
        // Remove event listeners
        document.removeEventListener('click', this.tileClickHandler);
        document.removeEventListener('contextmenu', this.contextMenuHandler);
        document.removeEventListener('mousedown', this.mouseDownHandler);
        document.removeEventListener('mousemove', this.mouseMoveHandler);
        document.removeEventListener('mouseup', this.mouseUpHandler);
        document.removeEventListener('wheel', this.wheelHandler);
        document.removeEventListener('keydown', this.keydownHandler);
        
        // Cleanup modules
        if (this.visualization) this.visualization.cleanup();
        if (this.ui) this.ui.cleanup();
        if (this.expansionTool) this.expansionTool.cleanup();
        if (this.buildingManager) this.buildingManager.cleanup();
        
        // Stop camera monitoring
        this.stopCameraMonitoring();
        
        this.isInitialized = false;
        this.isActive = false;
    }
}
            pointer-events: auto;
        `;
        
        // Prevent click events from propagating through the popup
        this.popup.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        
        // Prevent mousedown/mouseup events from propagating
        this.popup.addEventListener('mousedown', (event) => {
            event.stopPropagation();
        });
        
        this.popup.addEventListener('mouseup', (event) => {
            event.stopPropagation();
        });
        
        document.body.appendChild(this.popup);
        
        // Add temporary dev tools button
        this.createDevToolsButton();
        
        // Add tile type selector
        this.createTileTypeSelector();
    }
    
    createDevToolsButton() {
        const devButton = document.createElement('button');
        devButton.textContent = 'Open Console (F12)';
        devButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 1001;
            padding: 10px;
            background: #007acc;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-family: Arial, sans-serif;
        `;
        
        devButton.onclick = () => {
            if (typeof nw !== 'undefined' && nw.Window) {
                nw.Window.get().showDevTools();
            } else {
                alert('Dev tools not available. Try Ctrl+Shift+I or F12');
            }
        };
        
        document.body.appendChild(devButton);
    }
    
    createTileTypeSelector() {
        const selector = document.createElement('div');
        selector.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 1001;
            padding: 15px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            border-radius: 10px;
            border: 1px solid #555;
            font-family: Arial, sans-serif;
            display: ${this.isActive ? 'block' : 'none'};
            max-width: 300px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
        `;
        
        // Title
        const title = document.createElement('div');
        title.textContent = 'Selected Tile Type:';
        title.style.cssText = `
            margin-bottom: 10px;
            font-weight: bold;
            text-align: center;
        `;
        selector.appendChild(title);
        
        // Selected tile preview
        const selectedPreview = document.createElement('div');
        selectedPreview.style.cssText = `
            text-align: center;
            margin-bottom: 15px;
            padding: 10px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            cursor: pointer;
            border: 2px solid #007acc;
        `;
        
        const selectedImage = document.createElement('img');
        selectedImage.style.cssText = `
            width: 32px;
            height: 32px;
            image-rendering: pixelated;
            display: block;
            margin: 0 auto 5px auto;
        `;
        selectedImage.src = `src/assets/tiles/${this.selectedTileType}.png`;
        selectedImage.onerror = () => {
            selectedImage.style.display = 'none';
        };
        
        const selectedLabel = document.createElement('div');
        selectedLabel.textContent = this.formatTileName(this.selectedTileType);
        selectedLabel.style.cssText = `
            font-size: 12px;
            color: #ccc;
        `;
        
        selectedPreview.appendChild(selectedImage);
        selectedPreview.appendChild(selectedLabel);
        selector.appendChild(selectedPreview);
        
        // Click to open tile grid
        selectedPreview.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showTileGrid();
        });
        
        // Undo/Redo buttons
        const undoRedoContainer = document.createElement('div');
        undoRedoContainer.style.cssText = `
            display: flex;
            gap: 5px;
            margin-bottom: 15px;
        `;
        
        this.undoButton = document.createElement('button');
        this.undoButton.innerHTML = '↶ Undo';
        this.undoButton.style.cssText = `
            flex: 1;
            padding: 8px;
            background: #444;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: Arial, sans-serif;
            font-size: 11px;
            transition: background 0.2s;
        `;
        this.undoButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.undo();
        });
        this.undoButton.addEventListener('mouseenter', () => {
            if (!this.undoButton.disabled) {
                this.undoButton.style.background = '#555';
            }
        });
        this.undoButton.addEventListener('mouseleave', () => {
            this.undoButton.style.background = '#444';
        });
        
        this.redoButton = document.createElement('button');
        this.redoButton.innerHTML = '↷ Redo';
        this.redoButton.style.cssText = `
            flex: 1;
            padding: 8px;
            background: #444;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: Arial, sans-serif;
            font-size: 11px;
            transition: background 0.2s;
        `;
        this.redoButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.redo();
        });
        this.redoButton.addEventListener('mouseenter', () => {
            if (!this.redoButton.disabled) {
                this.redoButton.style.background = '#555';
            }
        });
        this.redoButton.addEventListener('mouseleave', () => {
            this.redoButton.style.background = '#444';
        });
        
        undoRedoContainer.appendChild(this.undoButton);
        undoRedoContainer.appendChild(this.redoButton);
        selector.appendChild(undoRedoContainer);
        
        // Initialize button states
        this.updateUndoRedoButtons();
        
        // Instructions
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            margin-top: 15px;
            font-size: 11px;
            line-height: 1.4;
            border-top: 1px solid #444;
            padding-top: 10px;
        `;
        instructions.innerHTML = `
            <strong>Dev Mode Controls:</strong><br>
            Left-click: Edit tile<br>
            Right-click: Add/Delete tile<br>
            <strong>E</strong>: Toggle expansion mode<br>
            <strong>B</strong>: Toggle building mode<br>
            <strong>Q</strong>: Switch create/erase tool (in expansion)<br>
            <strong>G</strong>: Toggle grid<br>
            <strong>Ctrl+Z</strong>: Undo<br>
            <strong>Ctrl+Y/Ctrl+Shift+Z</strong>: Redo<br>
            \` (backtick): Toggle dev mode
        `;
        selector.appendChild(instructions);
        
        // Prevent click events from propagating through the selector
        selector.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        
        selector.addEventListener('mousedown', (event) => {
            event.stopPropagation();
        });
        
        selector.addEventListener('mouseup', (event) => {
            event.stopPropagation();
        });
        
        this.tileTypeSelector = selector;
        this.selectedPreview = selectedPreview;
        this.selectedImage = selectedImage;
        this.selectedLabel = selectedLabel;
        document.body.appendChild(selector);
    }
    
    showTilePopup(tile) {
        const tileData = tile.userData;
        const tilemapData = tilemap.find(t => t.x === tile.position.x && t.y === tile.position.y);
        
        // Create backdrop to prevent click-through
        if (!this.backdrop) {
            this.backdrop = document.createElement('div');
            this.backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.3);
                z-index: 9999;
                display: none;
            `;
            
            // Close popup when clicking backdrop
            this.backdrop.addEventListener('click', () => {
                this.closePopup();
            });
            
            document.body.appendChild(this.backdrop);
        }
        
        // Show backdrop
        this.backdrop.style.display = 'block';
        
        this.popup.innerHTML = `
            <h3>Tile Properties</h3>
            <div style="margin-bottom: 10px;">
                <strong>Position:</strong> (${tile.position.x}, ${tile.position.y})
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">
                    <strong>Walkable:</strong>
                </label>
                <select id="tile-walkable" style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555;">
                    <option value="true" ${tileData.walkable ? 'selected' : ''}>Yes</option>
                    <option value="false" ${!tileData.walkable ? 'selected' : ''}>No</option>
                </select>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 8px;">
                    <strong>Tile Type:</strong>
                </label>
                <div id="popup-tile-selector" style="
                    padding: 10px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 5px;
                    cursor: pointer;
                    border: 2px solid #007acc;
                    text-align: center;
                ">
                    <img id="popup-selected-image" style="
                        width: 32px;
                        height: 32px;
                        image-rendering: pixelated;
                        display: block;
                        margin: 0 auto 5px auto;
                    " src="src/assets/tiles/${tileData.type || ''}.png" onerror="this.style.display='none'">
                    <div id="popup-selected-label" style="font-size: 12px; color: #ccc;">
                        ${this.formatTileName(tileData.type || '')}
                    </div>
                    <div style="font-size: 10px; color: #999; margin-top: 3px;">
                        Click to change
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">
                    <strong>Custom Properties (JSON):</strong>
                </label>
                <textarea id="tile-custom" rows="4" 
                          style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555; resize: vertical;"
                          placeholder="Enter custom properties as JSON">${this.getCustomPropertiesJSON(tilemapData)}</textarea>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="tile-cancel" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
                <button id="tile-save" style="padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Save Changes
                </button>
            </div>
        `;
        
        this.popup.style.display = 'block';
        
        // Store the current tile type for the popup
        this.popupSelectedTileType = tileData.type || ''; // Use empty string if no type set
        
        // Add event listeners for buttons
        document.getElementById('tile-cancel').onclick = () => this.closePopup();
        document.getElementById('tile-save').onclick = () => this.saveTileChanges();
        
        // Add event listener for tile type selector
        document.getElementById('popup-tile-selector').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showPopupTileGrid();
        });
        
        // Focus the first input to make it clear the popup is active
        setTimeout(() => {
            const firstInput = document.getElementById('tile-walkable');
            if (firstInput) firstInput.focus();
        }, 100);
    }
    
    getCustomPropertiesJSON(tilemapData) {
        if (!tilemapData) return '{}';
        
        // Extract all properties except the standard ones
        const customProps = { ...tilemapData };
        delete customProps.x;
        delete customProps.y;
        delete customProps.walkable;
        delete customProps.type;
        
        return JSON.stringify(customProps, null, 2);
    }
    
    saveTileChanges() {
        if (!this.selectedTile) return;
        
        try {
            const walkable = document.getElementById('tile-walkable').value === 'true';
            const type = this.popupSelectedTileType || ''; // Use empty string if nothing selected
            const customPropsText = document.getElementById('tile-custom').value.trim();
            
            // Store original values for undo
            const originalTileType = this.selectedTile.userData.type || '';
            const originalWalkable = this.selectedTile.userData.walkable;
            
            // Parse custom properties
            let customProps = {};
            if (customPropsText) {
                customProps = JSON.parse(customPropsText);
            }
              // Update tile userData
            this.selectedTile.userData.walkable = walkable;
            this.selectedTile.userData.type = type;
            
            // Update tilemap data
            const tileIndex = tilemap.findIndex(t => 
                t.x === this.selectedTile.position.x && t.y === this.selectedTile.position.y
            );
            
            if (tileIndex !== -1) {
                tilemap[tileIndex] = {
                    x: this.selectedTile.position.x,
                    y: this.selectedTile.position.y,
                    walkable: walkable,
                    type: type,
                    ...customProps
                };
            }
              // Use selective redraw instead of updateTileVisual
            redrawTile(this.selectedTile.position.x, this.selectedTile.position.y);
            
            // Update single tile overlay for dev mode visualization
            if (this.isActive) {
                const updatedTile = tiles.find(t => 
                    t.position.x === this.selectedTile.position.x && 
                    t.position.y === this.selectedTile.position.y
                );
                if (updatedTile) {
                    this.updateSingleTile(updatedTile);
                    // Update selectedTile reference to the new tile
                    this.selectedTile = updatedTile;
                }
            }
            
            // Push undo state for tile modification (only if there was actually a change)
            if (originalTileType !== type || originalWalkable !== walkable) {
                this.pushUndoState({
                    type: 'modify',
                    x: this.selectedTile.position.x,
                    y: this.selectedTile.position.y,
                    originalTileType: originalTileType,
                    originalWalkable: originalWalkable,
                    newTileType: type,
                    newWalkable: walkable
                });
            }
              // Debounced save to prevent excessive file writes
            this.debouncedSave();
            
            this.closePopup();
            
            console.log('Tile changes saved successfully');
            
        } catch (error) {
            alert('Error saving tile changes: ' + error.message);
        }
    }
    
    debouncedSave() {
        clearTimeout(this.saveDebounceTimer);
        this.saveDebounceTimer = setTimeout(() => {
            updateTilemap();
            saveTilemap();
            // Also save objects
            this.buildingManager.saveObjectsToFile();
        }, 500); // Save 500ms after last change
    }
    
    updateTileVisual(tile, tileType) {
        // Dispose of old material to prevent memory leaks
        if (tile.material) {
            if (tile.material.map) tile.material.map.dispose();
            tile.material.dispose();
        }
        
        // Create new material based on tile type
        if (tileType && tileType !== '') {
            const textureLoader = new THREE.TextureLoader();
            const texturePath = `src/assets/tiles/${tileType}.png`;
            
            const texture = textureLoader.load(texturePath, (tex) => {
                tex.magFilter = THREE.NearestFilter;
                tex.minFilter = THREE.NearestFilter;
                tex.generateMipmaps = false;
                tex.needsUpdate = true;
            }, undefined, (error) => {
                // Fallback if texture fails to load
                console.warn(`Failed to load texture: ${texturePath}`);
                tile.material = new THREE.MeshBasicMaterial({ 
                    color: 0x8965256, // Default grass color
                    side: THREE.DoubleSide
                });
            });
            
            tile.material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: false,
                opacity: 1.0,
                blending: THREE.NormalBlending
            });
        } else {
            // Empty tile - use default grass material
            tile.material = new THREE.MeshBasicMaterial({ 
                color: 0x8965256, // Default grass color
                side: THREE.DoubleSide
            });
        }
    }
      closePopup() {
        this.popup.style.display = 'none';
        
        // Hide backdrop
        if (this.backdrop) {
            this.backdrop.style.display = 'none';
        }
        
        // Close any open tile grids
        this.hideTileGrid();
        this.hidePopupTileGrid();
        
        this.selectedTile = null;
        this.selectedNPC = null;
        this.popupSelectedTileType = null;
    }
    
    // Public method to refresh visualization (call when tiles change)
    refresh() {
        if (this.isActive && this.isInitialized) {
            // Debounce refresh to prevent excessive updates
            clearTimeout(this.updateDebounceTimer);
            this.updateDebounceTimer = setTimeout(() => {
                this.updateVisualization();
            }, 100); // Only refresh 100ms after last call
        }
    }
      // More efficient method to update single tile overlay
    updateSingleTile(tile) {
        if (!this.isActive || !this.isInitialized) return;
        
        const { x, y } = tile.position;
        const key = `${x},${y}`;
        const existingOverlay = this.tileOverlays.get(key);
        
        if (existingOverlay) {
            // Update existing overlay color
            const isWalkable = tile.userData.walkable;
            const color = isWalkable ? 0x00ff00 : 0xff0000;
            existingOverlay.material.color.setHex(color);
        } else if (this.isActive && this.isInitialized) {
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
    
    handleRightClick(event) {
        // Get mouse position relative to canvas
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        
        // Calculate world position from mouse
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        // Project ray onto the ground plane (y = 0)
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const worldPosition = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, worldPosition);
        
        // First check if building manager handles this (for object deletion)
        if (this.buildingManager.handleRightClick(event, worldPosition)) {
            return; // Building manager handled it
        }
        
        // Round to integer tile coordinates
        const tileX = Math.round(worldPosition.x);
        const tileY = Math.round(worldPosition.y);
        
        // Check if tile already exists at this position
        const existingTile = tiles.find(tile => 
            tile.position.x === tileX && tile.position.y === tileY
        );
        
        if (existingTile) {
            // If tile exists, delete it (like an eraser)
            this.deleteTile(existingTile);
        } else {
            // If no tile exists, create a new one with selected tile type
            this.createNewTile(tileX, tileY, this.selectedTileType);
        }
    }
    
    createNewTile(x, y, tileType = '') {
        // Check if tile already exists
        const existingTile = tiles.find(tile => 
            tile.position.x === x && tile.position.y === y
        );
        
        if (existingTile) {
            // If tile exists, modify it instead
            this.modifyExistingTile(existingTile, tileType);
            return;
        }
        
        // Add undo state before creating
        this.pushUndoState({
            type: 'create',
            x: x,
            y: y,
            newTileType: tileType,
            newWalkable: true
        });
          this.createNewTileQuiet(x, y, tileType, true);
        
        // Individual tile overlay is updated in createNewTileQuiet
        // Save changes
        this.debouncedSave();
        
        console.log(`Created new tile at (${x}, ${y}) with type: ${tileType}`);
    }
    
    modifyExistingTile(tile, newTileType, newWalkable = null) {
        const originalType = tile.userData.type || '';
        const originalWalkable = newWalkable !== null ? newWalkable : tile.userData.walkable;
        
        // Only modify if there's actually a change
        if (originalType === newTileType && originalWalkable === tile.userData.walkable) {
            return;
        }
        
        // Add undo state before modifying
        this.pushUndoState({
            type: 'modify',
            x: tile.position.x,
            y: tile.position.y,
            originalTileType: originalType,
            originalWalkable: tile.userData.walkable,
            newTileType: newTileType,
            newWalkable: originalWalkable
        });
          this.modifyTileQuiet(tile, newTileType, originalWalkable);
        
        // Individual tile overlay is updated in modifyTileQuiet
        // Save changes
        this.debouncedSave();
        
        console.log(`Modified tile at (${tile.position.x}, ${tile.position.y}) to type: ${newTileType}`);
    }
    
    deleteTile(tile) {
        const { x, y } = tile.position;
        const originalType = tile.userData.type || '';
        const originalWalkable = tile.userData.walkable;
        
        // Add undo state before deleting
        this.pushUndoState({
            type: 'delete',
            x: x,
            y: y,
            originalTileType: originalType,
            originalWalkable: originalWalkable
        });
          this.deleteTileQuiet(tile);
        
        // Overlay is automatically removed when tile is deleted
        // Save changes
        this.debouncedSave();
        this.debouncedSave();
        
        console.log(`Deleted tile at (${x}, ${y})`);
    }
    
    // New methods for enhanced world expansion
    
    toggleExpansionMode() {
        // Only allow expansion mode when dev mode is active
        if (!this.isActive) return;
        
        // Cancel any ongoing drag before switching modes
        if (this.isDragging) {
            this.cancelDragSelection();
        }
        
        this.expansionMode = !this.expansionMode;
        
        if (this.expansionMode) {
            console.log('Expansion Mode ACTIVATED - Use mouse to drag and create tile areas');
            console.log('Press E again or Escape to exit expansion mode');
            
            // Show expansion mode UI
            this.showExpansionModeUI();
        } else {
            console.log('Expansion Mode DEACTIVATED');
            this.hideExpansionModeUI();
        }
    }
    
    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.gridLayer.visible = this.showGrid && this.isActive;
        console.log(`Grid ${this.showGrid ? 'enabled' : 'disabled'}`);
    }
    
    showExpansionModeUI() {
        if (this.expansionModeUI) return;
        
        this.expansionModeUI = document.createElement('div');
        this.expansionModeUI.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1002;
            padding: 15px 25px;
            background: rgba(0, 120, 212, 0.95);
            color: white;
            border-radius: 10px;
            font-family: Arial, sans-serif;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.2);
            min-width: 300px;
        `;
        
        this.updateExpansionModeUI();
        
        document.body.appendChild(this.expansionModeUI);
        
        // Auto-fade after 5 seconds but don't hide completely
        setTimeout(() => {
            if (this.expansionModeUI && this.expansionMode) {
                this.expansionModeUI.style.opacity = '0.7';
            }
        }, 5000);
    }
    
    hideExpansionModeUI() {
        if (this.expansionModeUI) {
            document.body.removeChild(this.expansionModeUI);
            this.expansionModeUI = null;
        }
    }
    
    updateExpansionModeUI() {
        if (!this.expansionModeUI) return;
        
        let toolIcon, toolName, toolColor;
        
        if (this.expansionTool === 'create') {
            toolIcon = '🏗️';
            toolName = 'CREATE';
            toolColor = 'rgba(0, 200, 100, 0.95)';
        } else if (this.expansionTool === 'erase') {
            toolIcon = '🗑️';
            toolName = 'ERASE';
            toolColor = 'rgba(220, 50, 50, 0.95)';
        } else if (this.expansionTool === 'walkability') {
            toolIcon = '🚶';
            toolName = 'WALKABILITY';
            toolColor = 'rgba(255, 165, 0, 0.95)';
        }
        
        this.expansionModeUI.style.background = toolColor;
        this.expansionModeUI.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <div style="font-size: 24px;">${toolIcon}</div>
                <div>
                    <div style="font-size: 16px; font-weight: bold; margin-bottom: 3px;">
                        EXPANSION MODE - ${toolName} TOOL
                    </div>
                    <div style="font-size: 12px; opacity: 0.9;">
                        Click & drag to ${this.expansionTool === 'walkability' ? 'toggle walkability' : this.expansionTool} • <strong>Q</strong> to switch tools • <strong>E</strong>/<strong>Esc</strong> to exit
                    </div>
                </div>
            </div>
        `;
    }
    
    toggleExpansionTool() {
        if (this.expansionTool === 'create') {
            this.expansionTool = 'erase';
        } else if (this.expansionTool === 'erase') {
            this.expansionTool = 'walkability';
        } else {
            this.expansionTool = 'create';
        }
        this.updateExpansionModeUI();
        console.log(`Switched to ${this.expansionTool.toUpperCase()} tool`);
    }
    
    startDragSelection(event) {
        // Prevent starting a new drag if already dragging
        if (this.isDragging) return;
        
        this.isDragging = true;
        
        // Get world position from mouse
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        // Cast ray to ground plane
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const worldPosition = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, worldPosition);
        
        this.dragStart = {
            x: Math.round(worldPosition.x),
            y: Math.round(worldPosition.y)
        };
        
        // Initialize dragEnd to dragStart for single-tile selections
        this.dragEnd = {
            x: this.dragStart.x,
            y: this.dragStart.y
        };
        
        this.createDragPreview();
    }
    
    updateDragSelection(event) {
        if (!this.isDragging || !this.dragStart) return;
        
        // Get current world position
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const worldPosition = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, worldPosition);
        
        this.dragEnd = {
            x: Math.round(worldPosition.x),
            y: Math.round(worldPosition.y)
        };
        
        this.updateDragPreview();
    }
    
    endDragSelection(event) {
        if (!this.isDragging) return;
        
        // Clean up drag state first
        this.isDragging = false;
        
        // If we have valid drag coordinates, process the area
        if (this.dragStart && this.dragEnd) {
            this.createTileArea(this.dragStart, this.dragEnd);
        }
        
        // Always clean up regardless of whether we processed an area
        this.removeDragPreview();
        this.dragStart = null;
        this.dragEnd = null;
    }
    
    cancelDragSelection() {
        this.isDragging = false;
        this.removeDragPreview();
        this.dragStart = null;
        this.dragEnd = null;
        console.log('Drag selection cancelled');
    }
    
    createDragPreview() {
        this.removeDragPreview(); // Remove any existing preview
        
        this.dragPreview = new THREE.Group();
        this.dragPreview.name = 'dragPreview';
        this.scene.add(this.dragPreview);
    }
    
    updateDragPreview() {
        if (!this.dragPreview || !this.dragStart || !this.dragEnd) return;
        
        // Clear existing preview
        this.dragPreview.clear();
        
        // Calculate bounds
        const minX = Math.min(this.dragStart.x, this.dragEnd.x);
        const maxX = Math.max(this.dragStart.x, this.dragEnd.x);
        const minY = Math.min(this.dragStart.y, this.dragEnd.y);
        const maxY = Math.max(this.dragStart.y, this.dragEnd.y);
        
        // Create preview tiles with different colors based on tool
        const geometry = new THREE.PlaneGeometry(1, 1);
        let material;
        
        if (this.expansionTool === 'create') {
            // Green for create/modify
            material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            });
        } else if (this.expansionTool === 'erase') {
            // Red for erase
            material = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            });
        } else if (this.expansionTool === 'walkability') {
            // Orange for walkability toggle
            material = new THREE.MeshBasicMaterial({
                color: 0xffa500,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            });
        }
        
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const existingTile = tiles.find(tile => 
                    tile.position.x === x && tile.position.y === y
                );
                
                let showPreview = false;
                
                if (this.expansionTool === 'create') {
                    if (!existingTile) {
                        // Show green preview for tiles that will be created
                        showPreview = true;
                    } else if (existingTile.userData.type !== this.selectedTileType) {
                        // Show green preview for tiles that will be modified
                        showPreview = true;
                    }
                } else if (this.expansionTool === 'erase' && existingTile) {
                    // Show red preview for tiles that will be erased
                    showPreview = true;
                } else if (this.expansionTool === 'walkability' && existingTile) {
                    // Show orange preview for tiles whose walkability will be toggled
                    showPreview = true;
                }
                
                if (showPreview) {
                    const preview = new THREE.Mesh(geometry, material);
                    preview.position.set(x, y, 0.05);
                    this.dragPreview.add(preview);
                }
            }
        }
    }
    
    removeDragPreview() {
        if (this.dragPreview) {
            this.scene.remove(this.dragPreview);
            this.dragPreview = null;
        }
    }
    
    createTileArea(start, end) {
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        
        let modifiedCount = 0;
        const batchActions = [];
        
        if (this.expansionTool === 'create') {
            // Create or modify tiles
            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    const existingTile = tiles.find(tile => 
                        tile.position.x === x && tile.position.y === y
                    );
                    
                    if (existingTile) {
                        // Modify existing tile if it's different
                        const currentType = existingTile.userData.type || '';
                        if (currentType !== this.selectedTileType) {
                            batchActions.push({
                                type: 'modify',
                                x: x,
                                y: y,
                                originalTileType: currentType,
                                originalWalkable: existingTile.userData.walkable,
                                newTileType: this.selectedTileType,
                                newWalkable: existingTile.userData.walkable
                            });
                            
                            this.modifyTileQuiet(existingTile, this.selectedTileType, existingTile.userData.walkable);
                            modifiedCount++;
                        }
                    } else {
                        // Create new tile
                        batchActions.push({
                            type: 'create',
                            x: x,
                            y: y,
                            newTileType: this.selectedTileType,
                            newWalkable: true
                        });
                        
                        this.createNewTileQuiet(x, y, this.selectedTileType, true);
                        modifiedCount++;
                    }
                }
            }
            console.log(`Created/Modified ${modifiedCount} tiles in area (${minX},${minY}) to (${maxX},${maxY})`);
        } else if (this.expansionTool === 'erase') {
            // Erase tiles
            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    const existingTile = tiles.find(tile => 
                        tile.position.x === x && tile.position.y === y
                    );
                    
                    if (existingTile) {
                        batchActions.push({
                            type: 'delete',
                            x: x,
                            y: y,
                            originalTileType: existingTile.userData.type || '',
                            originalWalkable: existingTile.userData.walkable
                        });
                        
                        this.deleteTileQuiet(existingTile);
                        modifiedCount++;
                    }
                }
            }
            console.log(`Erased ${modifiedCount} tiles in area (${minX},${minY}) to (${maxX},${maxY})`);
        } else if (this.expansionTool === 'walkability') {
            // Toggle walkability of existing tiles
            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    const existingTile = tiles.find(tile => 
                        tile.position.x === x && tile.position.y === y
                    );
                    
                    if (existingTile) {
                        const currentWalkable = existingTile.userData.walkable;
                        const newWalkable = !currentWalkable;
                        
                        batchActions.push({
                            type: 'walkability',
                            x: x,
                            y: y,
                            originalTileType: existingTile.userData.type || '',
                            originalWalkable: currentWalkable,
                            newTileType: existingTile.userData.type || '',
                            newWalkable: newWalkable
                        });
                        
                        this.modifyTileQuiet(existingTile, existingTile.userData.type || '', newWalkable);
                        modifiedCount++;
                    }
                }
            }
            console.log(`Toggled walkability for ${modifiedCount} tiles in area (${minX},${minY}) to (${maxX},${maxY})`);
        }
          // Add batch operation to undo stack if any changes were made
        if (batchActions.length > 0) {
            this.pushUndoState({
                type: 'batch',
                actions: batchActions
            });
        }
        
        // For batch operations, individual tile overlays are already updated
        // No need to refresh the entire visualization
        this.debouncedSave();
        this.debouncedSave();
    }
    
    // Undo/Redo system methods
    
    pushUndoState(action) {
        // Add current state to undo stack
        this.undoStack.push(action);
        
        // Limit stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        
        // Clear redo stack when new action is performed
        this.redoStack = [];
        
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.undoStack.length === 0) return;
        
        const action = this.undoStack.pop();
        
        // Execute the undo
        this.executeUndo(action);
        
        // Add to redo stack
        this.redoStack.push(action);
        
        this.updateUndoRedoButtons();
        this.debouncedSave();
    }
    
    redo() {
        if (this.redoStack.length === 0) return;
        
        const action = this.redoStack.pop();
        
        // Execute the redo (which is the original action)
        this.executeRedo(action);
        
        // Add back to undo stack
        this.undoStack.push(action);
        
        this.updateUndoRedoButtons();
        this.debouncedSave();
    }
    
    executeUndo(action) {
        switch (action.type) {
            case 'create':
                // Undo tile creation by deleting the tile
                const tileToDelete = tiles.find(t => t.position.x === action.x && t.position.y === action.y);
                if (tileToDelete) {
                    this.deleteTileQuiet(tileToDelete);
                }
                break;
                
            case 'delete':
                // Undo tile deletion by recreating the tile
                this.createNewTileQuiet(action.x, action.y, action.originalTileType, action.originalWalkable);
                break;
                
            case 'modify':
                // Undo tile modification by restoring original values
                const tileToRestore = tiles.find(t => t.position.x === action.x && t.position.y === action.y);
                if (tileToRestore) {
                    this.modifyTileQuiet(tileToRestore, action.originalTileType, action.originalWalkable);
                }
                break;
                
            case 'walkability':
                // Undo walkability change by restoring original walkability
                const tileToRestoreWalkability = tiles.find(t => t.position.x === action.x && t.position.y === action.y);
                if (tileToRestoreWalkability) {
                    this.modifyTileQuiet(tileToRestoreWalkability, action.originalTileType, action.originalWalkable);
                }
                break;
                
            case 'batch':
                // Undo batch operation by undoing each individual action in reverse
                for (let i = action.actions.length - 1; i >= 0; i--) {
                    this.executeUndo(action.actions[i]);
                }
                break;
                
            case 'object_place':
            case 'object_remove':
                // Delegate object undo to building manager
                this.buildingManager.undoObjectAction(action);
                break;
        }
        
        this.refresh();
    }
    
    executeRedo(action) {
        switch (action.type) {
            case 'create':
                // Redo tile creation
                this.createNewTileQuiet(action.x, action.y, action.newTileType, action.newWalkable);
                break;
                
            case 'delete':
                // Redo tile deletion
                const tileToDelete = tiles.find(t => t.position.x === action.x && t.position.y === action.y);
                if (tileToDelete) {
                    this.deleteTileQuiet(tileToDelete);
                }
                break;
                
            case 'modify':
                // Redo tile modification
                const tileToModify = tiles.find(t => t.position.x === action.x && t.position.y === action.y);
                if (tileToModify) {
                    this.modifyTileQuiet(tileToModify, action.newTileType, action.newWalkable);
                }
                break;
                
            case 'walkability':
                // Redo walkability change
                const tileToModifyWalkability = tiles.find(t => t.position.x === action.x && t.position.y === action.y);
                if (tileToModifyWalkability) {
                    this.modifyTileQuiet(tileToModifyWalkability, action.newTileType, action.newWalkable);
                }
                break;
                
            case 'batch':
                // Redo batch operation by redoing each individual action
                for (const subAction of action.actions) {
                    this.executeRedo(subAction);
                }
                break;
                
            case 'object_place':
            case 'object_remove':
                // Delegate object redo to building manager
                this.buildingManager.redoObjectAction(action);
                break;
        }
        
        this.refresh();
    }
      // Quiet versions of tile operations (don't add to undo stack)
    createNewTileQuiet(x, y, tileType = '', walkable = true) {
        // Create tile data
        const newTileData = {
            x: x,
            y: y,
            walkable: walkable,
            type: tileType,
            originalColor: 8965256
        };
        
        // Add to tilemap
        tilemap.push(newTileData);
        
        // Use selective redraw to create the tile
        redrawTile(x, y);
        
        // Update single tile overlay if dev mode is active
        if (this.isActive) {
            const tile = tiles.find(t => t.position.x === x && t.position.y === y);
            if (tile) {
                this.updateSingleTile(tile);
            }
        }
    }
      deleteTileQuiet(tile) {
        const { x, y } = tile.position;
        
        this.scene.remove(tile);
        
        const tileIndex = tiles.indexOf(tile);
        if (tileIndex > -1) {
            tiles.splice(tileIndex, 1);
        }
        
        const tilemapIndex = tilemap.findIndex(t => t.x === x && t.y === y);
        if (tilemapIndex > -1) {
            tilemap.splice(tilemapIndex, 1);
        }
        
        // Remove overlay if it exists
        if (this.isActive) {
            const key = `${x},${y}`;
            const existingOverlay = this.tileOverlays.get(key);
            if (existingOverlay) {
                this.visualizationLayer.remove(existingOverlay);
                if (existingOverlay.geometry) existingOverlay.geometry.dispose();
                if (existingOverlay.material) existingOverlay.material.dispose();
                this.tileOverlays.delete(key);
            }
        }
        
        if (tile.geometry) tile.geometry.dispose();
        if (tile.material) tile.material.dispose();
    }
      modifyTileQuiet(tile, newTileType, newWalkable) {
        tile.userData.type = newTileType;
        tile.userData.walkable = newWalkable;
        
        // Update tilemap data
        const tileIndex = tilemap.findIndex(t => 
            t.x === tile.position.x && t.y === tile.position.y
        );
        
        if (tileIndex !== -1) {
            tilemap[tileIndex].type = newTileType;
            tilemap[tileIndex].walkable = newWalkable;
        }
          // Use selective redraw instead of full refresh
        redrawTile(tile.position.x, tile.position.y);
        
        // Update single tile overlay if dev mode is active
        if (this.isActive) {
            // Get the new tile reference after redraw
            const newTile = tiles.find(t => 
                t.position.x === tile.position.x && t.position.y === tile.position.y
            );
            if (newTile) {
                this.updateSingleTile(newTile);
            }
        }
    }
    
    showTileGrid() {
        if (this.tileGrid) {
            this.hideTileGrid();
            return;
        }
        
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1005;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // Prevent clicks on backdrop from propagating to game
        backdrop.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            // Close grid if clicking on backdrop
            if (e.target === backdrop) {
                this.hideTileGrid();
            }
        });
        
        // Create grid container
        const gridContainer = document.createElement('div');
        gridContainer.style.cssText = `
            background: rgba(0, 0, 0, 0.95);
            border-radius: 15px;
            padding: 20px;
            width: 450px;
            max-height: 80vh;
            overflow-y: auto;
            border: 2px solid #555;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
        `;
        
        // Prevent clicks on grid container from propagating to game
        gridContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });
        
        // Title
        const title = document.createElement('h3');
        title.textContent = 'Select Tile Type';
        title.style.cssText = `
            color: white;
            margin: 0 0 20px 0;
            text-align: center;
            font-family: Arial, sans-serif;
        `;
        gridContainer.appendChild(title);
        
        // Grid
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            margin-bottom: 20px;
        `;
        
        let selectedTileElement = null;
        
        // Create tile options
        this.tileTypes.forEach(tileType => {
            const tileOption = document.createElement('div');
            tileOption.style.cssText = `
                text-align: center;
                padding: 10px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 2px solid ${tileType === this.selectedTileType ? '#007acc' : 'transparent'};
                background: ${tileType === this.selectedTileType ? 'rgba(0, 122, 204, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
            `;
            
            // Track selected tile element for auto-scrolling
            if (tileType === this.selectedTileType) {
                selectedTileElement = tileOption;
            }
            
            // Hover effects
            tileOption.addEventListener('mouseenter', () => {
                if (tileType !== this.selectedTileType) {
                    tileOption.style.background = 'rgba(255, 255, 255, 0.1)';
                }
            });
            
            tileOption.addEventListener('mouseleave', () => {
                if (tileType !== this.selectedTileType) {
                    tileOption.style.background = 'rgba(255, 255, 255, 0.05)';
                }
            });
            
            // Tile image or placeholder
            if (tileType === '' || !tileType) {
                // Empty tile - show a special placeholder
                const emptyPlaceholder = document.createElement('div');
                emptyPlaceholder.style.cssText = `
                    width: 48px;
                    height: 48px;
                    background: linear-gradient(45deg, #333 25%, transparent 25%), 
                                linear-gradient(-45deg, #333 25%, transparent 25%), 
                                linear-gradient(45deg, transparent 75%, #333 75%), 
                                linear-gradient(-45deg, transparent 75%, #333 75%);
                    background-size: 8px 8px;
                    background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
                    margin: 0 auto 8px auto;
                    border-radius: 4px;
                    border: 2px dashed #666;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #999;
                    font-size: 20px;
                `;
                emptyPlaceholder.textContent = '∅';
                tileOption.appendChild(emptyPlaceholder);
            } else {
                // Regular tile with image
                const img = document.createElement('img');
                img.style.cssText = `
                    width: 48px;
                    height: 48px;
                    image-rendering: pixelated;
                    margin: 0 auto 8px auto;
                    display: block;
                `;
                img.src = `src/assets/tiles/${tileType}.png`;
                img.onerror = () => {
                    img.style.display = 'none';
                };
                tileOption.appendChild(img);
            }
            
            // Label
            const label = document.createElement('div');
            label.textContent = this.formatTileName(tileType);
            label.style.cssText = `
                color: white;
                font-size: 10px;
                font-family: Arial, sans-serif;
            `;
            tileOption.appendChild(label);
            
            // Click handler
            tileOption.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.selectTileType(tileType);
                this.hideTileGrid();
            });
            
            grid.appendChild(tileOption);
        });
        
        gridContainer.appendChild(grid);
        
        // Button container for refresh and close buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 10px;
        `;
        
        // Refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = '🔄 Refresh Assets';
        refreshBtn.style.cssText = `
            padding: 10px 20px;
            background: #007acc;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-family: Arial, sans-serif;
            transition: background 0.2s;
        `;
        refreshBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Show loading state
            refreshBtn.textContent = '⏳ Refreshing...';
            refreshBtn.disabled = true;
            
            try {
                // Reload tile types from assets
                await this.loadTileTypes();
                
                // Close and reopen the grid to show updated tiles
                this.hideTileGrid();
                // Small delay to ensure cleanup
                setTimeout(() => {
                    this.showTileGrid();
                }, 100);
                
                console.log('Tile assets refreshed successfully');
            } catch (error) {
                console.error('Error refreshing tile assets:', error);
                alert('Error refreshing tile assets: ' + error.message);
                
                // Reset button state
                refreshBtn.textContent = '🔄 Refresh Assets';
                refreshBtn.disabled = false;
            }
        });
        refreshBtn.addEventListener('mouseenter', () => {
            if (!refreshBtn.disabled) {
                refreshBtn.style.background = '#005a9e';
            }
        });
        refreshBtn.addEventListener('mouseleave', () => {
            if (!refreshBtn.disabled) {
                refreshBtn.style.background = '#007acc';
            }
        });
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 10px 20px;
            background: #666;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-family: Arial, sans-serif;
        `;
        closeBtn.addEventListener('click', () => this.hideTileGrid());
        
        buttonContainer.appendChild(refreshBtn);
        buttonContainer.appendChild(closeBtn);
        gridContainer.appendChild(buttonContainer);
        
        backdrop.appendChild(gridContainer);
        
        // Click backdrop to close
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                this.hideTileGrid();
            }
        });
        
        // Prevent click-through
        backdrop.addEventListener('mousedown', (e) => e.stopPropagation());
        backdrop.addEventListener('mouseup', (e) => e.stopPropagation());
        
        document.body.appendChild(backdrop);
        this.tileGrid = backdrop;
        
        // Auto-scroll to selected tile if it exists
        if (selectedTileElement) {
            setTimeout(() => {
                selectedTileElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }
    
    hideTileGrid() {
        if (this.tileGrid) {
            document.body.removeChild(this.tileGrid);
            this.tileGrid = null;
        }
    }
    
    selectTileType(tileType) {
        this.selectedTileType = tileType;
        this.updateSelectedTileDisplay();
               console.log(`Selected tile type: ${tileType || 'Empty/Nothing'}`);
    }
    
    showPopupTileGrid() {
        if (this.popupTileGrid) {
            this.hidePopupTileGrid();
            return;
        }
        
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10005;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // Prevent clicks on backdrop from propagating to game
        backdrop.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            // Close grid if clicking on backdrop
            if (e.target === backdrop) {
                this.hidePopupTileGrid();
            }
        });
        
        // Create grid container (similar to showTileGrid but for popup)
        const gridContainer = document.createElement('div');
        gridContainer.style.cssText = `
            background: rgba(0, 0, 0, 0.95);
            border-radius: 15px;
            padding: 20px;
            width: 450px;
            max-height: 80vh;
            overflow-y: auto;
            border: 2px solid #555;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
        `;
        
        // Prevent clicks on grid container from propagating to game
        gridContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });
        
        // Title
        const title = document.createElement('h3');
        title.textContent = 'Select Tile Type';
        title.style.cssText = `
            color: white;
            margin: 0 0 20px 0;
            text-align: center;
            font-family: Arial, sans-serif;
        `;
        gridContainer.appendChild(title);
        
        // Grid
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            margin-bottom: 20px;
        `;
        
        let selectedTileElement = null;
        
        // Create tile options
        this.tileTypes.forEach(tileType => {
            const tileOption = document.createElement('div');
            tileOption.style.cssText = `
                text-align: center;
                padding: 10px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 2px solid ${tileType === this.popupSelectedTileType ? '#007acc' : 'transparent'};
                background: ${tileType === this.popupSelectedTileType ? 'rgba(0, 122, 204, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
            `;
            
            // Track selected tile element for auto-scrolling
            if (tileType === this.popupSelectedTileType) {
                selectedTileElement = tileOption;
            }
            
            // Hover effects
            tileOption.addEventListener('mouseenter', () => {
                if (tileType !== this.popupSelectedTileType) {
                    tileOption.style.background = 'rgba(255, 255, 255, 0.1)';
                }
            });
            
            tileOption.addEventListener('mouseleave', () => {
                if (tileType !== this.popupSelectedTileType) {
                    tileOption.style.background = 'rgba(255, 255, 255, 0.05)';
                }
            });
            
            // Tile image or placeholder
            if (tileType === '' || !tileType) {
                // Empty tile - show a special placeholder
                const emptyPlaceholder = document.createElement('div');
                emptyPlaceholder.style.cssText = `
                    width: 48px;
                    height: 48px;
                    background: linear-gradient(45deg, #333 25%, transparent 25%), 
                                linear-gradient(-45deg, #333 25%, transparent 25%), 
                                linear-gradient(45deg, transparent 75%, #333 75%), 
                                linear-gradient(-45deg, transparent 75%, #333 75%);
                    background-size: 8px 8px;
                    background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
                    margin: 0 auto 8px auto;
                    border-radius: 4px;
                    border: 2px dashed #666;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #999;
                    font-size: 20px;
                `;
                emptyPlaceholder.textContent = '∅';
                tileOption.appendChild(emptyPlaceholder);
            } else {
                // Regular tile with image
                const img = document.createElement('img');
                img.style.cssText = `
                    width: 48px;
                    height: 48px;
                    image-rendering: pixelated;
                    margin: 0 auto 8px auto;
                    display: block;
                `;
                img.src = `src/assets/tiles/${tileType}.png`;
                img.onerror = () => {
                    img.style.display = 'none';
                };
                tileOption.appendChild(img);
            }
            
            // Label
            const label = document.createElement('div');
            label.textContent = this.formatTileName(tileType);
            label.style.cssText = `
                color: white;
                font-size: 10px;
                font-family: Arial, sans-serif;
            `;
            tileOption.appendChild(label);
            
            // Click handler
            tileOption.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.popupSelectedTileType = tileType;
                // Update popup display
                const popupImage = document.getElementById('popup-selected-image');
                const popupLabel = document.getElementById('popup-selected-label');
                if (popupImage && popupLabel) {
                    if (tileType === '') {
                        popupImage.style.display = 'none';
                    } else {
                        popupImage.style.display = 'block';
                        popupImage.src = `src/assets/tiles/${tileType}.png`;
                    }
                    popupLabel.textContent = this.formatTileName(tileType);
                }
                this.hidePopupTileGrid();
            });
            
            grid.appendChild(tileOption);
        });
        
        gridContainer.appendChild(grid);
        
        // Button container for refresh and close buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 10px;
        `;
        
        // Refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = '🔄 Refresh Assets';
        refreshBtn.style.cssText = `
            padding: 10px 20px;
            background: #007acc;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-family: Arial, sans-serif;
            transition: background 0.2s;
        `;
        refreshBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Show loading state
            refreshBtn.textContent = '⏳ Refreshing...';
            refreshBtn.disabled = true;
            
            try {
                // Reload tile types from assets
                await this.loadTileTypes();
                
                // Update the main tile selector display as well
                this.updateSelectedTileDisplay();
                
                // Close and reopen the popup grid to show updated tiles
                this.hidePopupTileGrid();
                // Small delay to ensure cleanup
                setTimeout(() => {
                    this.showPopupTileGrid();
                }, 100);
                
                console.log('Tile assets refreshed successfully');
            } catch (error) {
                console.error('Error refreshing tile assets:', error);
                alert('Error refreshing tile assets: ' + error.message);
                
                // Reset button state
                refreshBtn.textContent = '🔄 Refresh Assets';
                refreshBtn.disabled = false;
            }
        });
        refreshBtn.addEventListener('mouseenter', () => {
            if (!refreshBtn.disabled) {
                refreshBtn.style.background = '#005a9e';
            }
        });
        refreshBtn.addEventListener('mouseleave', () => {
            if (!refreshBtn.disabled) {
                refreshBtn.style.background = '#007acc';
            }
        });
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 10px 20px;
            background: #666;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-family: Arial, sans-serif;
        `;
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.hidePopupTileGrid();
        });
        
        buttonContainer.appendChild(refreshBtn);
        buttonContainer.appendChild(closeBtn);
        gridContainer.appendChild(buttonContainer);
        
        backdrop.appendChild(gridContainer);
        
        // Prevent click-through
        backdrop.addEventListener('mousedown', (e) => e.stopPropagation());
        backdrop.addEventListener('mouseup', (e) => e.stopPropagation());
        
        document.body.appendChild(backdrop);
        this.popupTileGrid = backdrop;
        
        // Auto-scroll to selected tile if it exists
        if (selectedTileElement) {
            setTimeout(() => {
                selectedTileElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }
    
    hidePopupTileGrid() {
        if (this.popupTileGrid) {
            document.body.removeChild(this.popupTileGrid);
            this.popupTileGrid = null;
        }
    }
    
    // Helper methods for tile selection
    
    formatTileName(tileType) {
        if (!tileType || tileType === '') {
            return 'Empty/Nothing';
        }
        return tileType.replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase())
                      .replace(/_/g, ' ');
    }
    
    updateSelectedTileDisplay() {
        if (this.selectedImage && this.selectedLabel) {
            if (this.selectedTileType === '' || !this.selectedTileType) {
                // Hide image and show placeholder
                this.selectedImage.style.display = 'none';
                
                // Check if placeholder already exists
                let placeholder = this.selectedPreview.querySelector('.empty-placeholder');
                if (!placeholder) {
                    placeholder = document.createElement('div');
                    placeholder.className = 'empty-placeholder';
                    placeholder.style.cssText = `
                        width: 32px;
                        height: 32px;
                        background: linear-gradient(45deg, #333 25%, transparent 25%), 
                                    linear-gradient(-45deg, #333 25%, transparent 25%), 
                                    linear-gradient(45deg, transparent 75%, #333 75%), 
                                    linear-gradient(-45deg, transparent 75%, #333 75%);
                        background-size: 4px 4px;
                        background-position: 0 0, 0 2px, 2px -2px, -2px 0px;
                        margin: 0 auto 5px auto;
                        border-radius: 4px;
                        border: 1px dashed #666;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #999;
                        font-size: 16px;
                    `;
                    placeholder.textContent = '∅';
                    this.selectedPreview.insertBefore(placeholder, this.selectedLabel);
                }
            } else {
                // Remove placeholder if it exists
                const placeholder = this.selectedPreview.querySelector('.empty-placeholder');
                if (placeholder) {
                    placeholder.remove();
                }
                
                // Show image
                this.selectedImage.style.display = 'block';
                this.selectedImage.src = `src/assets/tiles/${this.selectedTileType}.png`;
            }
            
            this.selectedLabel.textContent = this.formatTileName(this.selectedTileType);
        }
    }
    
    getWorldPositionFromMouse(event) {
        // Get mouse position relative to canvas
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        
        // Calculate world position from mouse
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        // Project ray onto the ground plane (z = 0 for top-down view)
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const worldPosition = new THREE.Vector3();
        const intersect = raycaster.ray.intersectPlane(groundPlane, worldPosition);
        
        return intersect ? worldPosition : null;
    }
    
    updateUndoRedoButtons() {
        if (this.undoButton) {
            this.undoButton.disabled = this.undoStack.length === 0;
            this.undoButton.style.opacity = this.undoStack.length === 0 ? '0.5' : '1';
        }
        
        if (this.redoButton) {
            this.redoButton.disabled = this.redoStack.length === 0;
            this.redoButton.style.opacity = this.redoStack.length === 0 ? '0.5' : '1';
        }
    }
    
    showNPCPopup(npc) {
        // Ensure popup exists
        this.createPopup();
        
        // Create backdrop to prevent click-through
        if (!this.backdrop) {
            this.backdrop = document.createElement('div');
            this.backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.3);
                z-index: 9999;
                display: none;
            `;
            
            // Close popup when clicking backdrop
            this.backdrop.addEventListener('click', () => {
                this.closePopup();
            });
            
            document.body.appendChild(this.backdrop);
        }
        
        // Show backdrop
        this.backdrop.style.display = 'block';
        
        // Load current NPC data
        let npcData = {
            name: npc.name || 'Unnamed NPC',
            x: npc.position.x,
            y: npc.position.y,
            texture: npc.material?.map?.image?.src || ''
        };
        
        // Try to load dialogue data if it exists
        let dialogueData = {};
        try {
            fetch('dialogue.json')
                .then(response => response.json())
                .then(data => {
                    dialogueData = data[npc.name] || {};
                    // Update dialogue fields if they exist
                    const greetingField = document.getElementById('npc-greeting');
                    const responsesField = document.getElementById('npc-responses');
                    if (greetingField) greetingField.value = dialogueData.greeting || '';
                    if (responsesField) responsesField.value = JSON.stringify(dialogueData.responses || [], null, 2);
                })
                .catch(error => console.warn('Could not load dialogue data:', error));
        } catch (error) {
            console.warn('Could not load dialogue data:', error);
        }
        
        this.popup.innerHTML = `
            <h3>NPC Properties</h3>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;"><strong>Name:</strong></label>
                <input type="text" id="npc-name" value="${npcData.name}" style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 4px;">
            </div>
            
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;"><strong>Position:</strong></label>
                <div style="display: flex; gap: 10px;">
                    <div style="flex: 1;">
                        <label style="font-size: 12px; color: #ccc;">X:</label>
                        <input type="number" id="npc-x" value="${npcData.x}" style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 4px;">
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 12px; color: #ccc;">Y:</label>
                        <input type="number" id="npc-y" value="${npcData.y}" style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 4px;">
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;"><strong>Texture Path:</strong></label>
                <input type="text" id="npc-texture" value="${npcData.texture.replace(window.location.origin, '') || ''}" style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 4px;" placeholder="src/assets/npcs/filename.png">
            </div>
            
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;"><strong>Dialogue - Greeting:</strong></label>
                <textarea id="npc-greeting" rows="2" style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 4px; resize: vertical;" placeholder="Enter greeting text"></textarea>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;"><strong>Dialogue - Responses (JSON):</strong></label>
                <textarea id="npc-responses" rows="4" style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 4px; resize: vertical;" placeholder='["Response 1", "Response 2"]'></textarea>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;"><strong>Custom Properties (JSON):</strong></label>
                <textarea id="npc-custom" rows="3" style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 4px; resize: vertical;" placeholder="Enter custom properties as JSON">${this.getNPCCustomProperties(npc)}</textarea>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="npc-cancel" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="npc-save" style="padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">Save Changes</button>
            </div>
        `;
        
        this.popup.style.display = 'block';
        
        // Set up event handlers
        document.getElementById('npc-save').onclick = () => this.saveNPCChanges();
        document.getElementById('npc-cancel').onclick = () => this.closePopup();
        
        // Focus the first input to make it clear the popup is active
        setTimeout(() => {
            const firstInput = document.getElementById('npc-name');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    getNPCCustomProperties(npc) {
        // Extract custom properties from NPC (excluding standard ones)
        const customProps = { ...npc.userData };
        delete customProps.name;
        delete customProps.texture;
        delete customProps.dialogue;
        
        return JSON.stringify(customProps, null, 2);
    }
    
    async saveNPCChanges() {
        if (!this.selectedNPC) return;
        
        try {
            const name = document.getElementById('npc-name').value.trim();
            const x = parseFloat(document.getElementById('npc-x').value);
            const y = parseFloat(document.getElementById('npc-y').value);
            const texture = document.getElementById('npc-texture').value.trim();
            const greeting = document.getElementById('npc-greeting').value.trim();
            const responsesText = document.getElementById('npc-responses').value.trim();
            const customPropsText = document.getElementById('npc-custom').value.trim();
            
            // Parse responses
            let responses = [];
            if (responsesText) {
                responses = JSON.parse(responsesText);
            }
            
            // Parse custom properties
            let customProps = {};
            if (customPropsText) {
                customProps = JSON.parse(customPropsText);
            }
            
            // Update NPC object
            this.selectedNPC.name = name;
            this.selectedNPC.position.set(x, y, this.selectedNPC.position.z);
            
            // Update texture if changed
            if (texture && texture !== this.selectedNPC.material?.map?.image?.src?.replace(window.location.origin, '')) {
                const textureLoader = new THREE.TextureLoader();
                const newTexture = textureLoader.load(texture);
                newTexture.magFilter = THREE.NearestFilter;
                newTexture.minFilter = THREE.NearestFilter;
                newTexture.generateMipmaps = false;
                
                // Dispose old texture to prevent memory leaks
                if (this.selectedNPC.material.map) {
                    this.selectedNPC.material.map.dispose();
                }
                this.selectedNPC.material.map = newTexture;
            }
            
            // Update userData with custom properties
            this.selectedNPC.userData = {
                name: name,
                texture: texture,
                dialogue: { greeting, responses },
                ...customProps
            };
            
            // Save to files
            await this.saveNPCsToFile();
            await this.saveDialogueToFile();
            
            this.closePopup();
            console.log('NPC changes saved successfully');
            
        } catch (error) {
            alert('Error saving NPC changes: ' + error.message);
            console.error('Error saving NPC changes:', error);
        }
    }
    
    async saveNPCsToFile() {
        try {
            // Collect all NPC data
            const npcData = {
                npcs: npcs.map(npc => ({
                    name: npc.name || 'Unnamed NPC',
                    x: npc.position.x,
                    y: npc.position.y,
                    z: npc.position.z,
                    texture: npc.userData?.texture || npc.material?.map?.image?.src?.replace(window.location.origin, '') || '',
                    ...npc.userData
                }))
            };
            
            // Create download link
            const dataStr = JSON.stringify(npcData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'npcs.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('NPCs saved to file');
        } catch (error) {
            console.error('Error saving NPCs:', error);
            throw error;
        }
    }
    
    async saveDialogueToFile() {
        try {
            // Collect all dialogue data
            const dialogueData = {};
            npcs.forEach(npc => {
                if (npc.name && npc.userData?.dialogue) {
                    dialogueData[npc.name] = npc.userData.dialogue;
                }
            });
            
            // Create download link
            const dataStr = JSON.stringify(dialogueData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'dialogue.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('Dialogue saved to file');
        } catch (error) {
            console.error('Error saving dialogue:', error);
            throw error;
        }
    }

    // ...existing code...
}

// Create singleton instance (but don't initialize yet)
export const devModeManager = new DevModeManager();
