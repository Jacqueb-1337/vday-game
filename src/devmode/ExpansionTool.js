import * as THREE from 'three';
import { camera } from '../camera.js';
import { renderer } from '../render.js';

export class ExpansionTool {
    constructor(devModeManager) {
        this.devModeManager = devModeManager;
        this.expansionMode = false;
        this.expansionTool = 'create'; // 'create', 'erase', or 'walkability'
        this.isDragging = false;
        this.dragStart = null;
        this.dragEnd = null;
        this.dragPreview = null;
        this.expansionModeUI = null;
    }

    init() {
        // Initialize expansion tool - no special setup needed
    }

    toggleExpansionMode() {
        // Only allow expansion mode when dev mode is active
        if (!this.devModeManager.isActive) return;
        
        // Cancel any ongoing drag before switching modes
        if (this.isDragging) {
            this.cancelDragSelection();
        }
        
        this.expansionMode = !this.expansionMode;
          if (this.expansionMode) {
            // Show expansion mode UI
            this.showExpansionModeUI();
        } else {
            this.hideExpansionModeUI();
        }
    }

    toggleExpansionTool() {
        if (this.expansionTool === 'create') {
            this.expansionTool = 'erase';
        } else if (this.expansionTool === 'erase') {
            this.expansionTool = 'walkability';
        } else {
            this.expansionTool = 'create';        }
        this.updateExpansionModeUI();
    }

    startDragSelection(event) {
        const worldPos = this.devModeManager.getWorldPositionFromMouse(event);
        if (!worldPos) return;
        
        this.isDragging = true;
        this.dragStart = {
            x: Math.round(worldPos.x),
            y: Math.round(worldPos.y)
        };
        this.dragEnd = { ...this.dragStart };
          // Create drag preview
        this.createDragPreview();
    }

    updateDragSelection(event) {
        if (!this.isDragging) return;
        
        const worldPos = this.devModeManager.getWorldPositionFromMouse(event);
        if (!worldPos) return;
        
        this.dragEnd = {
            x: Math.round(worldPos.x),
            y: Math.round(worldPos.y)
        };
        
        // Update drag preview
        this.updateDragPreview();
    }    endDragSelection(event) {
        if (!this.isDragging) return;
        
        // Apply the area modification
        this.createTileArea(this.dragStart, this.dragEnd);
        
        // Clean up
        this.isDragging = false;
        this.removeDragPreview();
        this.dragStart = null;
        this.dragEnd = null;
    }    cancelDragSelection() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.removeDragPreview();
        this.dragStart = null;
        this.dragEnd = null;
    }

    createDragPreview() {
        this.dragPreview = new THREE.Group();
        this.dragPreview.name = 'dragPreview';
        this.devModeManager.scene.add(this.dragPreview);
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
                    } else if (existingTile.userData.type !== this.devModeManager.selectedTileType) {
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
            // Dispose of resources
            this.dragPreview.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            
            this.devModeManager.scene.remove(this.dragPreview);
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
                        if (currentType !== this.devModeManager.selectedTileType) {
                            batchActions.push({
                                type: 'modify',
                                x: x,
                                y: y,
                                originalTileType: currentType,
                                originalWalkable: existingTile.userData.walkable,
                                newTileType: this.devModeManager.selectedTileType,
                                newWalkable: existingTile.userData.walkable
                            });
                            
                            this.devModeManager.tileEditor.modifyTileQuiet(existingTile, this.devModeManager.selectedTileType, existingTile.userData.walkable);
                            modifiedCount++;
                        }
                    } else {
                        // Create new tile
                        batchActions.push({
                            type: 'create',
                            x: x,
                            y: y,
                            newTileType: this.devModeManager.selectedTileType,
                            newWalkable: true
                        });
                        
                        this.devModeManager.tileEditor.createNewTileQuiet(x, y, this.devModeManager.selectedTileType, true);
                        modifiedCount++;
                    }                }
            }
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
                        
                        this.devModeManager.tileEditor.deleteTileQuiet(existingTile);
                        modifiedCount++;                    }
                }
            }
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
                        
                        this.devModeManager.tileEditor.modifyTileQuiet(existingTile, existingTile.userData.type || '', newWalkable);
                        modifiedCount++;                    }
                }
            }
        }
        
        // Add batch operation to undo stack if any changes were made
        if (batchActions.length > 0) {
            this.devModeManager.undoRedo.pushUndoState({
                type: 'batch',
                actions: batchActions
            });
        }
        
        // For batch operations, individual tile overlays are already updated
        // No need to refresh the entire visualization
        this.devModeManager.debouncedSave();
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

    cleanup() {
        if (this.isDragging) {
            this.cancelDragSelection();
        }
        this.hideExpansionModeUI();
        this.expansionMode = false;
        this.expansionTool = 'create';
    }
}
