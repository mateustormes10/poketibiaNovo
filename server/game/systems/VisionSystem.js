export class VisionSystem {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
        this.defaultRange = 15;
    }
    
    getVisibleEntities(entity, range = this.defaultRange) {
        // Usa spatial grid para busca eficiente O(1)
        const entities = this.gameWorld.getEntitiesInArea(
            entity.x,
            entity.y,
            entity.z,
            range
        );
        
        const visible = {
            players: [],
            npcs: [],
            monsters: [],
            items: []
        };
        
        entities.forEach(e => {
            if (e.id === entity.id) return; // Ignora self
            
            const serialized = e.serialize();
            
            switch (e.type) {
                case 'player':
                    visible.players.push(serialized);
                    break;
                case 'npc':
                    visible.npcs.push(serialized);
                    break;
                case 'monster':
                    visible.monsters.push(serialized);
                    break;
                case 'item':
                    visible.items.push(serialized);
                    break;
            }
        });
        
        return visible;
    }
    
    /**
     * Obtém tiles visíveis ao redor do player
     */
    getVisibleTiles(player, width = 28, height = 15) {
        const halfWidth = Math.floor(width / 2);
        const halfHeight = Math.floor(height / 2);
        const startX = player.x - halfWidth;
        const startY = player.y - halfHeight;
        
        // Log detalhado
        // Obtém tiles do ChunkManager
        const tiles = this.gameWorld.mapManager.chunkManager.getTilesInArea(
            startX,
            startY,
            player.z,
            width,
            height
        );
        
        console.log(`[VisionSystem] Got ${tiles.length} tiles from ChunkManager`);
        
        const mapData = {
            centerX: player.x,
            centerY: player.y,
            z: player.z,
            tiles
        };
        
        return mapData;
    }
    
    isVisible(entity1, entity2, range) {
        if (entity1.z !== entity2.z) return false;
        
        const dx = Math.abs(entity1.x - entity2.x);
        const dy = Math.abs(entity1.y - entity2.y);
        
        return dx <= range && dy <= range;
    }
    
    getPlayersInRange(entity, range = this.defaultRange) {
        const players = [];
        
        this.gameWorld.players.forEach(player => {
            if (player.id !== entity.id && this.isVisible(entity, player, range)) {
                players.push(player);
            }
        });
        
        return players;
    }
}
