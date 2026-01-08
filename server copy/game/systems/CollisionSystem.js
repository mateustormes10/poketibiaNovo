export class CollisionSystem {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
    }
    
    checkCollision(x, y, z) {
        // Verifica colisão com tiles
        if (!this.gameWorld.mapManager.isWalkable(x, y, z)) {
            return { collision: true, type: 'tile' };
        }
        
        // Verifica colisão com entidades
        const entity = this.getEntityAt(x, y, z);
        if (entity) {
            return { collision: true, type: 'entity', entity };
        }
        
        return { collision: false };
    }
    
    getEntityAt(x, y, z) {
        // Usa spatial grid para busca O(1)
        return this.gameWorld.getEntityAt(x, y, z);
    }
    
    isAreaClear(x, y, z, width, height) {
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const check = this.checkCollision(x + dx, y + dy, z);
                if (check.collision) {
                    return false;
                }
            }
        }
        return true;
    }
}
