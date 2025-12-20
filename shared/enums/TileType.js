export const TileType = {
    GRASS: 'grass',
    WATER: 'water',
    SAND: 'sand',
    STONE: 'stone',
    TREE: 'tree',
    MOUNTAIN: 'mountain',
    FLOOR: 'floor',
    WALL: 'wall',
    
    isWalkable(type) {
        const walkable = [
            this.GRASS,
            this.SAND,
            this.FLOOR
        ];
        return walkable.includes(type);
    },
    
    isBlocking(type) {
        const blocking = [
            this.WATER,
            this.TREE,
            this.MOUNTAIN,
            this.WALL
        ];
        return blocking.includes(type);
    }
};
