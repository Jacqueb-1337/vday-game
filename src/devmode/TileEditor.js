import * as THREE from 'three';
import { camera } from '../camera.js';
import { renderer } from '../render.js';
import { tiles, tilemap, updateTilemap, saveTilemap, redrawTile } from '../tilemap.js';

export class TileEditor {
    constructor(devModeManager) {
        this.devModeManager = devModeManager;
        this.selectedTile = null;
        this.popupSelectedTileType = null;
    }

    handleTileClick(event) {
        // Get mouse position relative to canvas
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        
        // Raycast to find clicked tile
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        // Check intersections with actual tiles (not overlays)
        const intersects = raycaster.intersectObjects(tiles);
        
        if (intersects.length > 0) {
            const clickedTile = intersects[0].object;
            this.selectTile(clickedTile);
        }
    }

    selectTile(tile) {
        this.selectedTile = tile;
        this.devModeManager.ui.showTilePopup(tile);
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
        this.devModeManager.undoRedo.pushUndoState({
            type: 'create',
            x: x,
            y: y,
            newTileType: tileType,
            newWalkable: true
        });
        
        this.createNewTileQuiet(x, y, tileType, true);
          // Individual tile overlay is updated in createNewTileQuiet
        // Save changes
        this.devModeManager.debouncedSave();
    }

    modifyExistingTile(tile, newTileType, newWalkable = null) {
        const originalType = tile.userData.type || '';
        const originalWalkable = newWalkable !== null ? newWalkable : tile.userData.walkable;
        
        // Only modify if there's actually a change
        if (originalType === newTileType && originalWalkable === tile.userData.walkable) {
            return;
        }
        
        // Add undo state before modifying
        this.devModeManager.undoRedo.pushUndoState({
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
        this.devModeManager.debouncedSave();
    }

    deleteTile(tile) {
        const { x, y } = tile.position;
        const originalType = tile.userData.type || '';
        const originalWalkable = tile.userData.walkable;
        
        // Add undo state before deleting
        this.devModeManager.undoRedo.pushUndoState({
            type: 'delete',
            x: x,
            y: y,
            originalTileType: originalType,
            originalWalkable: originalWalkable
        });
        
        this.deleteTileQuiet(tile);
          // Overlay is automatically removed when tile is deleted
        // Save changes
        this.devModeManager.debouncedSave();
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
        if (this.devModeManager.isActive) {
            const tile = tiles.find(t => t.position.x === x && t.position.y === y);
            if (tile) {
                this.devModeManager.visualization.updateSingleTile(tile);
            }
        }
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
        if (this.devModeManager.isActive) {
            // Get the new tile reference after redraw
            const newTile = tiles.find(t => 
                t.position.x === tile.position.x && t.position.y === tile.position.y
            );
            if (newTile) {
                this.devModeManager.visualization.updateSingleTile(newTile);
            }
        }
    }

    deleteTileQuiet(tile) {
        const { x, y } = tile.position;
        
        // Remove from tilemap
        const tileIndex = tilemap.findIndex(t => t.x === x && t.y === y);
        if (tileIndex !== -1) {
            tilemap.splice(tileIndex, 1);
        }
        
        // Remove tile overlay if it exists
        const overlayKey = `${x},${y}`;
        const overlay = this.devModeManager.visualization.tileOverlays.get(overlayKey);
        if (overlay) {
            this.devModeManager.visualization.visualizationLayer.remove(overlay);
            if (overlay.geometry) overlay.geometry.dispose();
            if (overlay.material) overlay.material.dispose();
            this.devModeManager.visualization.tileOverlays.delete(overlayKey);
        }
        
        // Remove tile from scene and dispose resources
        if (tile.geometry) tile.geometry.dispose();
        if (tile.material) {
            if (tile.material.map) tile.material.map.dispose();
            tile.material.dispose();
        }
        
        this.devModeManager.scene.remove(tile);
        
        // Remove from tiles array
        const tilesIndex = tiles.findIndex(t => t === tile);
        if (tilesIndex !== -1) {
            tiles.splice(tilesIndex, 1);
        }
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
            if (this.devModeManager.isActive) {
                const updatedTile = tiles.find(t => 
                    t.position.x === this.selectedTile.position.x && 
                    t.position.y === this.selectedTile.position.y
                );
                if (updatedTile) {
                    this.devModeManager.visualization.updateSingleTile(updatedTile);
                    // Update selectedTile reference to the new tile
                    this.selectedTile = updatedTile;
                }
            }
            
            // Push undo state for tile modification (only if there was actually a change)
            if (originalTileType !== type || originalWalkable !== walkable) {
                this.devModeManager.undoRedo.pushUndoState({
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
            this.devModeManager.debouncedSave();
              this.devModeManager.ui.closePopup();
            
        } catch (error) {
            alert('Error saving tile changes: ' + error.message);
        }
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
}
