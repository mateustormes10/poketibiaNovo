import { Logger } from '../../utils/Logger.js';

const logger = new Logger('ChunkManager');

/**
 * Gerenciador de Chunks para streaming de mapa
 * Carrega/descarrega chunks conforme posição dos jogadores
 */
export class ChunkManager {
    constructor(chunkSize = 64) {
        this.chunkSize = chunkSize; // Tamanho do chunk em tiles
        this.loadedChunks = new Map(); // "x,y,z" -> Chunk
        this.chunkRefCount = new Map(); // Contador de referências
        this.chunkLoadDistance = 2; // Quantos chunks carregar em cada direção
    }
    
    /**
     * Converte coordenadas de mundo para coordenadas de chunk
     */
    worldToChunk(x, y, z) {
        return {
            cx: Math.floor(x / this.chunkSize),
            cy: Math.floor(y / this.chunkSize),
            cz: z
        };
    }
    
    /**
     * Cria chave única para chunk
     */
    getChunkKey(cx, cy, cz) {
        return `${cx},${cy},${cz}`;
    }
    
    /**
     * Carrega chunks ao redor de uma posição
     */
    async loadChunksAround(x, y, z, mapLoader) {
        const { cx, cy, cz } = this.worldToChunk(x, y, z);
        const chunksToLoad = [];
        
        // Calcula chunks vizinhos
        for (let dy = -this.chunkLoadDistance; dy <= this.chunkLoadDistance; dy++) {
            for (let dx = -this.chunkLoadDistance; dx <= this.chunkLoadDistance; dx++) {
                const chunkKey = this.getChunkKey(cx + dx, cy + dy, cz);
                
                if (!this.loadedChunks.has(chunkKey)) {
                    chunksToLoad.push({
                        cx: cx + dx,
                        cy: cy + dy,
                        cz,
                        key: chunkKey
                    });
                }
                
                // Incrementa contador de referências
                const refCount = this.chunkRefCount.get(chunkKey) || 0;
                this.chunkRefCount.set(chunkKey, refCount + 1);
            }
        }
        
        // Carrega chunks em paralelo
        if (chunksToLoad.length > 0) {
            logger.debug(`Loading ${chunksToLoad.length} chunks around (${x}, ${y}, ${z})`);
            
            await Promise.all(
                chunksToLoad.map(chunk => this.loadChunk(chunk, mapLoader))
            );
        }
        
        return chunksToLoad.length;
    }
    
    /**
     * Carrega um chunk específico
     */
    async loadChunk(chunkData, mapLoader) {
        const { cx, cy, cz, key } = chunkData;
        
        try {
            // Carrega dados do chunk
            const chunk = await mapLoader.loadChunk(cx, cy, cz, this.chunkSize);
            
            if (chunk) {
                this.loadedChunks.set(key, chunk);
                logger.debug(`Chunk loaded: ${key}`);
            }
        } catch (error) {
            logger.error(`Failed to load chunk ${key}:`, error.message);
        }
    }
    
    /**
     * Descarrega chunks longe de todas as posições ativas
     */
    unloadDistantChunks(activePositions) {
        const chunksToUnload = [];
        
        // Cria set de chunks que devem estar carregados
        const requiredChunks = new Set();
        
        activePositions.forEach(pos => {
            const { cx, cy, cz } = this.worldToChunk(pos.x, pos.y, pos.z);
            
            for (let dy = -this.chunkLoadDistance; dy <= this.chunkLoadDistance; dy++) {
                for (let dx = -this.chunkLoadDistance; dx <= this.chunkLoadDistance; dx++) {
                    const key = this.getChunkKey(cx + dx, cy + dy, cz);
                    requiredChunks.add(key);
                }
            }
        });
        
        // Remove chunks desnecessários
        for (const [key, chunk] of this.loadedChunks) {
            if (!requiredChunks.has(key)) {
                chunksToUnload.push(key);
            }
        }
        
        // Descarrega chunks
        chunksToUnload.forEach(key => {
            this.loadedChunks.delete(key);
            this.chunkRefCount.delete(key);
            logger.debug(`Chunk unloaded: ${key}`);
        });
        
        return chunksToUnload.length;
    }
    
    /**
     * Obtém tile em uma posição
     */
    getTile(x, y, z) {
        const { cx, cy, cz } = this.worldToChunk(x, y, z);
        const chunkKey = this.getChunkKey(cx, cy, cz);
        const chunk = this.loadedChunks.get(chunkKey);
        
        if (!chunk) {
            return null;
        }
        
        // Calcula posição local no chunk
        const localX = x - (cx * this.chunkSize);
        const localY = y - (cy * this.chunkSize);
        
        return chunk.getTile(localX, localY);
    }
    
    /**
     * Obtém tiles em uma área
     */
    getTilesInArea(x, y, z, width, height) {
        const tiles = [];
        
        console.log(`[ChunkManager] getTilesInArea: x=${x}, y=${y}, z=${z}, width=${width}, height=${height}`);
        console.log(`[ChunkManager] Currently loaded chunks: ${this.loadedChunks.size}`);
        
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const worldX = x + dx;
                const worldY = y + dy;
                const tile = this.getTile(worldX, worldY, z);
                
                if (tile) {
                    // Serializa tile para envio ao cliente (mantém spriteIds array)
                    tiles.push({
                        x: worldX,
                        y: worldY,
                        z: z,
                        spriteId: tile.spriteId || 100,
                        spriteIds: tile.spriteIds || [tile.spriteId || 100], // Array de layers
                        walkable: tile.walkable !== false,
                        type: tile.type || 'ground'
                    });
                }
            }
        }
        
        console.log(`[ChunkManager] Found ${tiles.length} tiles in area`);
        
        return tiles;
    }
    
    /**
     * Obtém todos os tiles de um chunk
     */
    getChunkTiles(x, y, z) {
        const { cx, cy, cz } = this.worldToChunk(x, y, z);
        const chunkKey = this.getChunkKey(cx, cy, cz);
        const chunk = this.loadedChunks.get(chunkKey);
        
        return chunk ? chunk.tiles : [];
    }
    
    /**
     * Verifica se um chunk está carregado
     */
    isChunkLoaded(x, y, z) {
        const { cx, cy, cz } = this.worldToChunk(x, y, z);
        const chunkKey = this.getChunkKey(cx, cy, cz);
        return this.loadedChunks.has(chunkKey);
    }
    
    /**
     * Estatísticas do gerenciador
     */
    getStats() {
        return {
            loadedChunks: this.loadedChunks.size,
            chunkSize: this.chunkSize,
            loadDistance: this.chunkLoadDistance,
            memoryUsage: this.loadedChunks.size * this.chunkSize * this.chunkSize * 64 // Estimativa em bytes
        };
    }
    
    /**
     * Limpa todos os chunks
     */
    clear() {
        this.loadedChunks.clear();
        this.chunkRefCount.clear();
        logger.info('All chunks cleared');
    }
}

/**
 * Representa um chunk de mapa
 */
export class Chunk {
    constructor(cx, cy, cz, size) {
        this.cx = cx;
        this.cy = cy;
        this.cz = cz;
        this.size = size;
        this.tiles = [];
        this.entities = new Set();
    }
    
    /**
     * Adiciona tile ao chunk
     */
    addTile(tile) {
        this.tiles.push(tile);
    }
    
    /**
     * Obtém tile por posição local
     */
    getTile(localX, localY) {
        return this.tiles.find(t => 
            t.localX === localX && t.localY === localY
        );
    }
    
    /**
     * Adiciona entidade ao chunk
     */
    addEntity(entity) {
        this.entities.add(entity);
    }
    
    /**
     * Remove entidade do chunk
     */
    removeEntity(entityId) {
        for (const entity of this.entities) {
            if (entity.id === entityId) {
                this.entities.delete(entity);
                break;
            }
        }
    }
    
    /**
     * Serializa chunk para enviar ao cliente
     */
    serialize() {
        return {
            cx: this.cx,
            cy: this.cy,
            cz: this.cz,
            tiles: this.tiles.map(t => ({
                x: t.x,
                y: t.y,
                type: t.type,
                walkable: t.walkable,
                spriteId: t.spriteId
            }))
        };
    }
}
