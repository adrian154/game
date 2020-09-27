
// Enums
const Tiles = {
    WATER: 0,
    GRASS: 1
};

Object.freeze(Tiles);

// Constants
const TICKS_PER_SEC = 20;
const TIMESTEP = 1 / TICKS_PER_SEC;
const TIMESTEP_MS = 1000 * TIMESTEP;

// Helper methods
const make2DArray = function(xSize, ySize) {
    let result = new Array(xSize);
    for(let i = 0; i < xSize; i++) {
        result[i] = new Array(ySize);
        for(let j = 0; j < ySize; j++) {
            result[i][j] = undefined;
        }
    }
    return result;
};

module.exports = {
    make2DArray: make2DArray,
    Tiles: Tiles,
    TIMESTEP: TIMESTEP,
    TICKS_PER_SEC: TICKS_PER_SEC
};