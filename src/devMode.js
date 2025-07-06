import { devModeManager } from './DevModeManager.js';

let _devMode = false; // Internal variable to hold the devMode state

// Function to initialize dev mode manager with scene
export function initializeDevMode(scene) {
    devModeManager.init(scene);
}

// Define a reactive devMode property on the window object
Object.defineProperty(window, 'devMode', {
    get() {
        return _devMode;
    },
    set(value) {
        _devMode = value;
        console.log(`Dev Mode is now: ${_devMode}`);
        
        if (_devMode) {
            devModeManager.activate();
        } else {
            devModeManager.deactivate();
        }
    }
});

// Export devMode for use in other modules
export const devMode = window.devMode;
