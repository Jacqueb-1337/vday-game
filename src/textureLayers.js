export const textureLayers = {
    "tall_grass": 2,
    "grassgeneric": 0,
    "grassweeds": 0,
    "dirtpath": 0,
    "dirtpathb": 0,
    "redx": 4, // Add a layer index for markers
    "greenx": 4, // Add a layer index for markers
    "player*": 5, // Example wildcard for player textures
    // Add more texture types and their corresponding layer indices here
};

export function getLayerIndex(type) {
    if (!type) return 0; // Return default layer index if type is undefined
    for (const key in textureLayers) {
        if (key.endsWith('*')) {
            const baseKey = key.slice(0, -1);
            if (type.startsWith(baseKey)) {
                return textureLayers[key];
            }
        } else if (key === type) {
            return textureLayers[key];
        }
    }
    return 0; // Default layer index if no match is found
}
