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
    getVisibleTiles(player, width = 30, height = 15) {
        // Centralização precisa: garante player no centro para width/height pares e ímpares
        const halfW = Math.floor((width - 1) / 2);
        const halfH = Math.floor((height - 1) / 2);
        // Para width par, o player fica 1 tile mais à esquerda (corrige somando +1 ao startX)
        const startX = player.x - halfW - (width % 2 === 0 ? 1 : 0);
        const startY = player.y - halfH - (height % 2 === 0 ? 1 : 0);
        const areaWidth = width;
        const areaHeight = height;

        // Log detalhado
        // Obtém tiles do ChunkManager
        const tiles = this.gameWorld.mapManager.chunkManager.getTilesInArea(
            startX,
            startY,
            player.z,
            areaWidth,
            areaHeight
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
