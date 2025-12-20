export class Chunk {
    constructor(x, y, z, size = 64) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.size = size;
        this.tiles = [];
        this.loaded = false;
    }
    
    load(tileData) {
        this.tiles = tileData;
        this.loaded = true;
    }
    
    unload() {
        this.tiles = [];
        this.loaded = false;
    }
    
    getTile(localX, localY) {
        const index = localY * this.size + localX;
        return this.tiles[index];
    }
    
    setTile(localX, localY, tile) {
        const index = localY * this.size + localX;
        this.tiles[index] = tile;
    }
}
