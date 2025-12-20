export class MovementSystem {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
    }
    
    moveEntity(entity, direction) {
        const newPos = this.getNewPosition(entity, direction);
        
        if (!this.canMove(entity, newPos)) {
            return false;
        }
        
        entity.x = newPos.x;
        entity.y = newPos.y;
        entity.direction = direction;
        
        return true;
    }
    
    getNewPosition(entity, direction) {
        const pos = { x: entity.x, y: entity.y, z: entity.z };
        
        switch (direction) {
            case 'up':
                pos.y -= 1;
                break;
            case 'down':
                pos.y += 1;
                break;
            case 'left':
                pos.x -= 1;
                break;
            case 'right':
                pos.x += 1;
                break;
        }
        
        return pos;
    }
    
    canMove(entity, newPos) {
        // Verifica colisão com mapa
        if (!this.gameWorld.mapManager.isWalkable(newPos.x, newPos.y, newPos.z)) {
            return false;
        }
        
        // Verifica colisão com outras entidades
        if (this.hasEntityAt(newPos.x, newPos.y, newPos.z, entity.id)) {
            return false;
        }
        
        return true;
    }
    
    hasEntityAt(x, y, z, excludeId) {
        for (const [id, player] of this.gameWorld.players) {
            if (id !== excludeId && player.x === x && player.y === y && player.z === z) {
                return true;
            }
        }
        return false;
    }
}
