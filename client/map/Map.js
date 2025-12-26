/**
 * Classe GameMap - Armazena matriz 2D de tiles do viewport
 * Representa apenas a área visível enviada pelo servidor
 */
export class GameMap {
    constructor(tileSize = 64) {
        this.tileSize = tileSize;
        this.tiles = new Map(); // "x,y,z" -> tileData (Map nativo ES6)
        this.viewport = {
            minX: 0,
            minY: 0,
            maxX: 0,
            maxY: 0,
            z: 0
        };
    }
    
    /**
     * Atualiza mapa com dados do servidor
     * @param {Object} mapData - { centerX, centerY, z, tiles: [{x, y, type, spriteId, ...}] }
     */
    updateFromServer(mapData) {
        if (!mapData || !mapData.tiles) {
            console.warn('[GameMap] No map data received from server');
            return;
        }
        
        
        // Limpa tiles antigos
        this.tiles.clear();
        
        // Atualiza viewport
        this.viewport.z = mapData.z || 0;
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        // Processa tiles recebidos
        mapData.tiles.forEach(tile => {
            const key = `${tile.x},${tile.y},${tile.z || mapData.z}`;
            
            // Suporta tanto ground (array do editor) quanto spriteIds (array do servidor)
            const spriteArray = tile.ground || tile.spriteIds || [tile.spriteId || 100];
            
            this.tiles.set(key, {
                x: tile.x,
                y: tile.y,
                z: tile.z || mapData.z,
                type: tile.type || 'grass',
                spriteId: spriteArray[0] || 100, // Sprite principal (primeira)
                spriteIds: spriteArray, // Array completo de sprites empilhadas
                walkable: tile.walkable !== false,
                spawn: tile.spawn || null,
                entities: tile.entities || []
            });
            
            // Atualiza bounds
            if (tile.x < minX) minX = tile.x;
            if (tile.x > maxX) maxX = tile.x;
            if (tile.y < minY) minY = tile.y;
            if (tile.y > maxY) maxY = tile.y;
        });
        
        this.viewport.minX = minX;
        this.viewport.minY = minY;
        this.viewport.maxX = maxX;
        this.viewport.maxY = maxY;
        
        // Sinaliza que o mapa foi atualizado
        this.updated = true;
    }
    
    /**
     * Obtém tile em posição específica
     */
    getTile(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.tiles.get(key);
    }
    
    /**
     * Obtém todos os tiles em uma área
     */
    getTilesInArea(x, y, z, width, height) {
        const tiles = [];
        
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const tile = this.getTile(x + dx, y + dy, z);
                if (tile) {
                    tiles.push(tile);
                }
            }
        }
        
        return tiles;
    }
    
    /**
     * Obtém matriz completa (para iteração)
     */
    getAllTiles() {
        return Array.from(this.tiles.values());
    }
    
    /**
     * Obtém bounds do viewport
     */
    getViewport() {
        return { ...this.viewport };
    }
    
    /**
     * Verifica se tile existe
     */
    hasTile(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.tiles.has(key);
    }
    
    /**
     * Limpa mapa
     */
    clear() {
        this.tiles.clear();
    }
    
    /**
     * Estatísticas
     */
    getStats() {
        return {
            tileCount: this.tiles.size,
            viewport: this.viewport,
            tileSize: this.tileSize
        };
    }
}
