import { tiles, tilemap, updateTilemap, saveTilemap, redrawTile } from '../tilemap.js';
import { npcs } from '../npc.js';

export class UndoRedoSystem {
    constructor(devModeManager) {
        this.devModeManager = devModeManager;
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50; // Maximum number of undo steps to keep
    }

    pushUndoState(action) {
        // Add the action to the undo stack
        this.undoStack.push(action);
        
        // Clear redo stack since we have a new action
        this.redoStack = [];
        
        // Limit undo stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift(); // Remove oldest entry
        }
        
        // Update UI buttons
        this.devModeManager.ui.updateUndoRedoButtons();
    }    undo() {
        if (this.undoStack.length === 0) {
            return;
        }
          const action = this.undoStack.pop();
        this.redoStack.push(action);
        
        this.executeUndo(action);
        
        // Update UI buttons
        this.devModeManager.ui.updateUndoRedoButtons();
        
        // Save changes after undo
        this.devModeManager.debouncedSave();
    }    redo() {
        if (this.redoStack.length === 0) {
            return;
        }
          const action = this.redoStack.pop();
        this.undoStack.push(action);
        
        this.executeRedo(action);
        
        // Update UI buttons
        this.devModeManager.ui.updateUndoRedoButtons();
        
        // Save changes after redo
        this.devModeManager.debouncedSave();
    }

    executeUndo(action) {
        switch (action.type) {
            case 'create':
                // Undo tile creation by deleting it
                const tileToDelete = tiles.find(t => t.position.x === action.x && t.position.y === action.y);
                if (tileToDelete) {
                    this.devModeManager.tileEditor.deleteTileQuiet(tileToDelete);
                }
                break;
                
            case 'delete':
                // Undo tile deletion by recreating it
                this.devModeManager.tileEditor.createNewTileQuiet(action.x, action.y, action.originalTileType, action.originalWalkable);
                break;
                
            case 'modify':
                // Undo tile modification by reverting to original state
                const tileToRevert = tiles.find(t => t.position.x === action.x && t.position.y === action.y);
                if (tileToRevert) {
                    this.devModeManager.tileEditor.modifyTileQuiet(tileToRevert, action.originalTileType, action.originalWalkable);
                }
                break;
                
            case 'walkability':
                // Undo walkability change
                const tileToRevertWalkability = tiles.find(t => t.position.x === action.x && t.position.y === action.y);
                if (tileToRevertWalkability) {
                    this.devModeManager.tileEditor.modifyTileQuiet(tileToRevertWalkability, action.originalTileType, action.originalWalkable);
                }
                break;
                
            case 'batch':
                // Undo batch operation by undoing each individual action in reverse order
                for (let i = action.actions.length - 1; i >= 0; i--) {
                    this.executeUndo(action.actions[i]);
                }
                break;
                
            case 'npc_modify':
                // Undo NPC modification
                const npcToRevert = this.devModeManager.npcEditor.selectedNPC;
                if (npcToRevert && npcToRevert.uuid === action.npcId) {
                    npcToRevert.name = action.originalName;
                    npcToRevert.position.x = action.originalX;
                    npcToRevert.position.y = action.originalY;
                }
                break;
                
            case 'object_place':
            case 'object_remove':
                // Delegate object undo to building manager
                this.devModeManager.buildingManager.undoObjectAction(action);
                break;
        }
    }

    executeRedo(action) {
        switch (action.type) {
            case 'create':
                // Redo tile creation
                this.devModeManager.tileEditor.createNewTileQuiet(action.x, action.y, action.newTileType, action.newWalkable);
                break;
                
            case 'delete':
                // Redo tile deletion
                const tileToDelete = tiles.find(t => t.position.x === action.x && t.position.y === action.y);
                if (tileToDelete) {
                    this.devModeManager.tileEditor.deleteTileQuiet(tileToDelete);
                }
                break;
                
            case 'modify':
                // Redo tile modification
                const tileToModify = tiles.find(t => t.position.x === action.x && t.position.y === action.y);
                if (tileToModify) {
                    this.devModeManager.tileEditor.modifyTileQuiet(tileToModify, action.newTileType, action.newWalkable);
                }
                break;
                
            case 'walkability':
                // Redo walkability change
                const tileToModifyWalkability = tiles.find(t => t.position.x === action.x && t.position.y === action.y);
                if (tileToModifyWalkability) {
                    this.devModeManager.tileEditor.modifyTileQuiet(tileToModifyWalkability, action.newTileType, action.newWalkable);
                }
                break;
                
            case 'batch':
                // Redo batch operation by redoing each individual action
                for (const subAction of action.actions) {
                    this.executeRedo(subAction);
                }
                break;
                
            case 'npc_modify':
                // Redo NPC modification
                const npcToModify = this.devModeManager.npcEditor.selectedNPC;
                if (npcToModify && npcToModify.uuid === action.npcId) {
                    npcToModify.name = action.newName;
                    npcToModify.position.x = action.newX;
                    npcToModify.position.y = action.newY;
                }
                break;
                
            case 'object_place':
            case 'object_remove':
                // Delegate object redo to building manager
                this.devModeManager.buildingManager.redoObjectAction(action);
                break;
        }
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.devModeManager.ui.updateUndoRedoButtons();
    }
}
