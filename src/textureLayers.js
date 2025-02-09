export const textureLayers = {
    "tall_grass": 2,
    "grassgeneric": 0,
    "grassweeds": 0,
    "dirtpath": 0,
    "dirtpathb": 0,
    "redx": 4, // Add a layer index for markers
    "greenx": 4, // Add a layer index for markers
    "player*": 5, // Example wildcard for player textures
    "npc*": 4 // Example wildcard for NPC textures
    // Add more texture types and their corresponding layer indices here
};

export function getLayerIndex(textureType) {
    if (textureLayers.hasOwnProperty(textureType)) {
        return textureLayers[textureType];
    }

    // Check for wildcard matches
    for (const pattern in textureLayers) {
        if (pattern.endsWith('*') && textureType.startsWith(pattern.slice(0, -1))) {
            return textureLayers[pattern];
        }
    }

    // Default layer index if no match is found
    return 0;
}
