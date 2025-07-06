import * as THREE from 'three';
import { camera } from '../camera.js';
import { renderer } from '../render.js';
import { npcs } from '../npc.js';

export class NPCEditor {
    constructor(devModeManager) {
        this.devModeManager = devModeManager;
        this.selectedNPC = null;
    }

    handleNPCClick(event) {
        // Get mouse position relative to canvas
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        
        // Raycast to find clicked NPC
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        // Check for NPC clicks
        if (npcs && npcs.length > 0) {
            const npcIntersects = raycaster.intersectObjects(npcs);
            if (npcIntersects.length > 0) {
                const clickedNPC = npcIntersects[0].object;
                this.selectNPC(clickedNPC);
                return true; // NPC was clicked
            }
        }
        
        return false; // No NPC was clicked
    }

    selectNPC(npc) {
        this.selectedNPC = npc;
        this.devModeManager.ui.showNPCPopup(npc);
    }

    saveNPCChanges() {
        if (!this.selectedNPC) return;
        
        try {
            // Get values from form
            const name = document.getElementById('npc-name').value.trim();
            const x = parseFloat(document.getElementById('npc-x').value);
            const y = parseFloat(document.getElementById('npc-y').value);
            const texture = document.getElementById('npc-texture').value.trim();
            const greeting = document.getElementById('npc-greeting').value.trim();
            const responsesText = document.getElementById('npc-responses').value.trim();
            const customPropsText = document.getElementById('npc-custom').value.trim();
            
            // Store original values for undo
            const originalName = this.selectedNPC.name || 'Unnamed NPC';
            const originalX = this.selectedNPC.position.x;
            const originalY = this.selectedNPC.position.y;
            
            // Update NPC properties
            this.selectedNPC.name = name;
            this.selectedNPC.position.x = x;
            this.selectedNPC.position.y = y;
            
            // Update texture if changed
            if (texture && texture !== this.selectedNPC.material?.map?.image?.src) {
                const textureLoader = new THREE.TextureLoader();
                textureLoader.load(texture, (tex) => {
                    tex.magFilter = THREE.NearestFilter;
                    tex.minFilter = THREE.NearestFilter;
                    tex.generateMipmaps = false;
                    this.selectedNPC.material.map = tex;
                    this.selectedNPC.material.needsUpdate = true;
                }, undefined, (error) => {
                    console.warn(`Failed to load NPC texture: ${texture}`, error);
                });
            }
            
            // Parse responses
            let responses = [];
            if (responsesText) {
                try {
                    responses = JSON.parse(responsesText);
                } catch (error) {
                    console.warn('Invalid JSON for responses:', error);
                    responses = [responsesText]; // Fallback to single response
                }
            }
            
            // Parse custom properties
            let customProps = {};
            if (customPropsText) {
                try {
                    customProps = JSON.parse(customPropsText);
                } catch (error) {
                    console.warn('Invalid JSON for custom properties:', error);
                }
            }
            
            // Save dialogue data
            this.saveDialogueData(name, greeting, responses);
            
            // Save NPC data to npcs.json
            this.saveNPCData();
            
            // Add undo state for NPC modification
            this.devModeManager.undoRedo.pushUndoState({
                type: 'npc_modify',
                npcId: this.selectedNPC.uuid,
                originalName: originalName,
                originalX: originalX,
                originalY: originalY,
                newName: name,
                newX: x,
                newY: y,
                customProps: customProps
            });
              this.devModeManager.ui.closePopup();
            
        } catch (error) {
            alert('Error saving NPC changes: ' + error.message);
            console.error('NPC save error:', error);
        }
    }

    saveDialogueData(npcName, greeting, responses) {
        // Load existing dialogue data
        fetch('dialogue.json')
            .then(response => response.json())
            .then(dialogueData => {
                // Update dialogue for this NPC
                dialogueData[npcName] = {
                    greeting: greeting,
                    responses: responses
                };
                
                // Save back to file (in NW.js environment)
                if (typeof require !== 'undefined') {
                    const fs = require('fs');
                    const path = require('path');                    const dialoguePath = path.join(process.cwd(), 'dialogue.json');
                    
                    fs.writeFileSync(dialoguePath, JSON.stringify(dialogueData, null, 2));
                }
            })
            .catch(error => {
                console.warn('Could not save dialogue data:', error);
                // Create new dialogue file if it doesn't exist
                const newDialogueData = {};
                newDialogueData[npcName] = {
                    greeting: greeting,
                    responses: responses
                };
                
                if (typeof require !== 'undefined') {
                    const fs = require('fs');
                    const path = require('path');                    const dialoguePath = path.join(process.cwd(), 'dialogue.json');
                    
                    fs.writeFileSync(dialoguePath, JSON.stringify(newDialogueData, null, 2));
                }
            });
    }

    saveNPCData() {
        // Save current NPC positions and properties to npcs.json
        const npcData = npcs.map(npc => ({
            name: npc.name || 'Unnamed NPC',
            x: npc.position.x,
            y: npc.position.y,
            texture: npc.material?.map?.image?.src || ''
        }));
        
        if (typeof require !== 'undefined') {
            const fs = require('fs');
            const path = require('path');            const npcsPath = path.join(process.cwd(), 'npcs.json');
            
            fs.writeFileSync(npcsPath, JSON.stringify(npcData, null, 2));
        }
    }

    getNPCCustomProperties(npc) {
        // Extract custom properties from NPC (excluding standard ones)
        const customProps = {};
        
        // Add any custom userData properties
        if (npc.userData) {
            Object.keys(npc.userData).forEach(key => {
                if (!['name', 'x', 'y', 'texture'].includes(key)) {
                    customProps[key] = npc.userData[key];
                }
            });
        }
        
        return JSON.stringify(customProps, null, 2);
    }
}
