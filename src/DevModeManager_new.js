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
