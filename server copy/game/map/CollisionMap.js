export class CollisionMap {
    constructor(mapData) {
        this.collisionGrid = new Map();
        this.buildCollisionGrid(mapData);
    }
    
    buildCollisionGrid(mapData) {
        // mapData pode ser array de tiles ou objeto com propriedade tiles
        const tiles = Array.isArray(mapData) ? mapData : (mapData.tiles || []);
        
        tiles.forEach(tile => {
            const key = `${tile.x},${tile.y}`;
            this.collisionGrid.set(key, tile.walkable);
        });
    }
    
    isWalkable(x, y) {
        const key = `${x},${y}`;
        return this.collisionGrid.get(key) !== false;
    }
    
    setWalkable(x, y, walkable) {
        const key = `${x},${y}`;
        this.collisionGrid.set(key, walkable);
    }
}
