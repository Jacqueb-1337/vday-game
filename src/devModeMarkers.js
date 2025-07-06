// Dev Mode Markers - Updated to work with new DevModeManager
import { devModeManager } from './DevModeManager.js';

export function drawDevModeMarkers(scene, tiles) {
    // The new DevModeManager handles visualization automatically
    // This function is kept for compatibility but delegates to the manager
    if (devModeManager.isActive) {
        devModeManager.refresh();
    }
}
