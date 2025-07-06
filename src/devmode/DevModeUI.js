import { tiles, tilemap, updateTilemap, saveTilemap, redrawTile } from '../tilemap.js';
import { npcs } from '../npc.js';

export class DevModeUI {
    constructor(devModeManager) {
        this.devModeManager = devModeManager;
        this.popup = null;
        this.backdrop = null;
        this.tileTypeSelector = null;
        this.selectedPreview = null;
        this.selectedImage = null;
        this.selectedLabel = null;
        this.undoButton = null;
        this.redoButton = null;
        this.tileGrid = null;
        this.popupTileGrid = null;
        this.expansionModeUI = null;
    }

    init() {
        // Create popup HTML
        this.createPopup();
        
        // Add temporary dev tools button
        this.createDevToolsButton();
        
        // Add tile type selector
        this.createTileTypeSelector();
    }

    activate() {
        // Show tile type selector
        if (this.tileTypeSelector) {
            this.tileTypeSelector.style.display = 'block';
        }
    }

    deactivate() {
        this.closePopup();
        
        // Hide tile type selector
        if (this.tileTypeSelector) {
            this.tileTypeSelector.style.display = 'none';
        }
        
        // Hide any open tile grids
        this.hideTileGrid();
        this.hidePopupTileGrid();
    }

    createPopup() {
        // Create popup HTML element
        this.popup = document.createElement('div');
        this.popup.id = 'dev-mode-popup';
        this.popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #555;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10000;
            display: none;
            min-width: 300px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
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
            display: ${this.devModeManager.isActive ? 'block' : 'none'};
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
        selectedImage.src = `src/assets/tiles/${this.devModeManager.selectedTileType}.png`;
        selectedImage.onerror = () => {
            selectedImage.style.display = 'none';
        };
        
        const selectedLabel = document.createElement('div');
        selectedLabel.textContent = this.formatTileName(this.devModeManager.selectedTileType);
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
            this.devModeManager.undoRedo.undo();
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
            this.devModeManager.undoRedo.redo();
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
            Left-click: Edit tile/NPC<br>
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
        
        this.tileTypeSelector = selector;
        this.selectedPreview = selectedPreview;
        this.selectedImage = selectedImage;
        this.selectedLabel = selectedLabel;
        document.body.appendChild(selector);
    }

    formatTileName(tileType) {
        if (!tileType) return 'Empty';
        
        // Convert camelCase or snake_case to readable format
        return tileType
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim();
    }

    updateUndoRedoButtons() {
        if (this.undoButton && this.redoButton) {
            // Update undo button
            this.undoButton.disabled = this.devModeManager.undoRedo.undoStack.length === 0;
            this.undoButton.style.opacity = this.devModeManager.undoRedo.undoStack.length === 0 ? '0.5' : '1';
            this.undoButton.style.cursor = this.undoButton.disabled ? 'not-allowed' : 'pointer';
            
            // Update redo button
            this.redoButton.disabled = this.devModeManager.undoRedo.redoStack.length === 0;
            this.redoButton.style.opacity = this.redoButton.disabled ? '0.5' : '1';
            this.redoButton.style.cursor = this.redoButton.disabled ? 'not-allowed' : 'pointer';
        }
    }

    refreshTileTypeSelector() {
        if (this.tileTypeSelector) {
            // Remove the old selector and create a new one
            this.tileTypeSelector.parentNode.removeChild(this.tileTypeSelector);
            this.tileTypeSelector = null;
            this.createTileTypeSelector();
        }
    }

    showTilePopup(tile) {
        const tileData = tile.userData;
        const tilemapData = tilemap.find(t => t.x === tile.position.x && t.y === tile.position.y);
        
        this.createBackdrop();
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
                          placeholder="Enter custom properties as JSON">${this.devModeManager.tileEditor.getCustomPropertiesJSON(tilemapData)}</textarea>
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
        this.devModeManager.tileEditor.popupSelectedTileType = tileData.type || '';
        
        // Add event listeners for buttons
        document.getElementById('tile-cancel').onclick = () => this.closePopup();
        document.getElementById('tile-save').onclick = () => this.devModeManager.tileEditor.saveTileChanges();
        
        // Add event listener for tile type selector
        document.getElementById('popup-tile-selector').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showPopupTileGrid();
        });
        
        // Focus the first input
        setTimeout(() => {
            const firstInput = document.getElementById('tile-walkable');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    showNPCPopup(npc) {
        this.createBackdrop();
        this.backdrop.style.display = 'block';
        
        // Load current NPC data
        let npcData = {
            name: npc.name || 'Unnamed NPC',
            x: npc.position.x,
            y: npc.position.y,
            texture: npc.material?.map?.image?.src || ''
        };
        
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
                <textarea id="npc-custom" rows="3" style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 4px; resize: vertical;" placeholder="Enter custom properties as JSON">${this.devModeManager.npcEditor.getNPCCustomProperties(npc)}</textarea>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="npc-cancel" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="npc-save" style="padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">Save Changes</button>
            </div>
        `;
        
        this.popup.style.display = 'block';
        
        // Set up event handlers
        document.getElementById('npc-save').onclick = () => this.devModeManager.npcEditor.saveNPCChanges();
        document.getElementById('npc-cancel').onclick = () => this.closePopup();
        
        // Focus the first input
        setTimeout(() => {
            const firstInput = document.getElementById('npc-name');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    createBackdrop() {
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
        
        this.devModeManager.tileEditor.selectedTile = null;
        this.devModeManager.npcEditor.selectedNPC = null;
        this.devModeManager.tileEditor.popupSelectedTileType = null;
    }

    cleanup() {
        // Remove popup elements from DOM
        if (this.popup && this.popup.parentNode) {
            this.popup.parentNode.removeChild(this.popup);
            this.popup = null;
        }

        if (this.backdrop && this.backdrop.parentNode) {
            this.backdrop.parentNode.removeChild(this.backdrop);
            this.backdrop = null;
        }

        if (this.tileTypeSelector && this.tileTypeSelector.parentNode) {
            this.tileTypeSelector.parentNode.removeChild(this.tileTypeSelector);
            this.tileTypeSelector = null;
        }

        // Close any open grids
        this.hideTileGrid();
        this.hidePopupTileGrid();

        // Hide expansion mode UI
        if (this.expansionModeUI && this.expansionModeUI.parentNode) {
            this.expansionModeUI.parentNode.removeChild(this.expansionModeUI);
            this.expansionModeUI = null;
        }
    }
}
