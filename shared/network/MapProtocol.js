/**
 * MapProtocol - Converte dados do servidor para formato do client
 * Transforma formato [9913,S] [9912,S] em objetos de tile
 */
export class MapProtocol {
    /**
     * Parse formato de texto do servidor para tiles
     * Formato: [spriteId,flags] [spriteId,flags] ...
     * Exemplo: [9913,S] [9912,S] [9912,W]
     */
    static parseMapViewport(rawData, centerX, centerY, z, viewportSize = 20) {
        const tiles = [];
        
        if (!rawData || typeof rawData !== 'string') {
            return { tiles, centerX, centerY, z };
        }
        
        // Regex para extrair tiles no formato [spriteId,flags]
        const tilePattern = /\[(\d+),([A-Z]+)\]/g;
        let match;
        let index = 0;
        
        // Calcula posição inicial do viewport
        const halfSize = Math.floor(viewportSize / 2);
        const startX = centerX - halfSize;
        const startY = centerY - halfSize;
        
        // Processa cada tile
        while ((match = tilePattern.exec(rawData)) !== null) {
            const spriteId = parseInt(match[1]);
            const flags = match[2];
            
            // Calcula posição no grid
            const x = startX + (index % viewportSize);
            const y = startY + Math.floor(index / viewportSize);
            
            tiles.push({
                x,
                y,
                z,
                spriteId,
                walkable: flags.includes('S'), // 'S' = Sand/walkable
                type: this.getTileType(spriteId, flags)
            });
            
            index++;
        }
        
        return {
            centerX,
            centerY,
            z,
            tiles
        };
    }
    
    /**
     * Determina tipo de tile baseado em spriteId e flags
     */
    static getTileType(spriteId, flags) {
        // Mapeamento básico
        if (spriteId >= 9910 && spriteId <= 9920) return 'sand';
        if (spriteId >= 100 && spriteId < 200) return 'grass';
        if (spriteId >= 200 && spriteId < 300) return 'water';
        if (spriteId >= 300 && spriteId < 400) return 'stone';
        
        return 'unknown';
    }
    
    /**
     * Serializa tiles para envio ao cliente
     */
    static serializeTiles(tiles) {
        return {
            tiles: tiles.map(tile => ({
                x: tile.x,
                y: tile.y,
                z: tile.z || 0,
                spriteId: tile.spriteId || 100,
                walkable: tile.walkable !== false,
                type: tile.type || 'grass'
            }))
        };
    }
}
