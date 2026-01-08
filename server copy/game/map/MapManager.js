import { CollisionMap } from './CollisionMap.js';
import { ChunkManager } from './ChunkManager.js';
import { MapLoader } from './MapLoader.js';
import { Logger } from '../../utils/Logger.js';

const logger = new Logger('MapManager');

export class MapManager {
    constructor() {
        this.chunkManager = new ChunkManager(64); // 64 tiles por chunk
        this.mapLoader = new MapLoader();
        this.collisionMaps = new Map();
        this.activePlayerPositions = new Set(); // Posições de players ativos
    }
    
    async loadMaps() {
        logger.info('Loading maps...');
        
        // Carrega mapas iniciais (apenas metadata, não todos os chunks)
        for (let z = 1; z <= 5; z++) {
            try {
                // Carrega mapa completo no cache do loader
                const mapData = await this.mapLoader.loadMap(z, 'txt');
                
                // Cria mapa de colisão
                const collisionMap = new CollisionMap(mapData);
                this.collisionMaps.set(z, collisionMap);
                
                logger.info(`Map z${z} initialized (${mapData.tiles.length} tiles)`);
            } catch (error) {
                logger.error(`Failed to initialize map z${z}:`, error.message);
            }
        }
        
        logger.info('Maps initialized with chunk streaming');
    }
    
    /**
     * Registra posição de um player para streaming
     */
    async registerPlayerPosition(playerId, x, y, z) {
        const posKey = `${playerId}`;
        this.activePlayerPositions.add({ playerId, x, y, z });
        
        // Carrega chunks ao redor do player
        await this.chunkManager.loadChunksAround(x, y, z, this.mapLoader);
    }
    
    /**
     * Remove player do streaming
     */
    unregisterPlayer(playerId) {
        for (const pos of this.activePlayerPositions) {
            if (pos.playerId === playerId) {
                this.activePlayerPositions.delete(pos);
                break;
            }
        }
        
        // Descarrega chunks desnecessários
        this.unloadUnusedChunks();
    }
    
    /**
     * Atualiza posição de player e carrega/descarrega chunks
     */
    async updatePlayerPosition(playerId, x, y, z) {
        // Atualiza posição
        for (const pos of this.activePlayerPositions) {
            if (pos.playerId === playerId) {
                pos.x = x;
                pos.y = y;
                pos.z = z;
                break;
            }
        }
        
        // Carrega novos chunks se necessário
        await this.chunkManager.loadChunksAround(x, y, z, this.mapLoader);
        
        // Descarrega chunks distantes (a cada 10 movimentos)
        if (Math.random() < 0.1) {
            this.unloadUnusedChunks();
        }
    }
    
    /**
     * Descarrega chunks que não são mais necessários
     */
    unloadUnusedChunks() {
        const positions = Array.from(this.activePlayerPositions);
        const unloaded = this.chunkManager.unloadDistantChunks(positions);
        
        if (unloaded > 0) {
            logger.debug(`Unloaded ${unloaded} distant chunks`);
        }
    }
    
    /**
     * Obtém chunk do mapa para o cliente
     */
    getMapChunk(x, y, z, radius = 15) {
        const tiles = this.chunkManager.getTilesInArea(
            x - radius,
            y - radius,
            z,
            radius * 2 + 1,
            radius * 2 + 1
        );
        
        return {
            centerX: x,
            centerY: y,
            z,
            radius,
            tiles
        };
    }
    
    /**
     * Obtém tile específico
     */
    getTile(x, y, z) {
        return this.chunkManager.getTile(x, y, z);
    }
    
    /**
     * Verifica se posição é walkable
     */
    isWalkable(x, y, z) {
        const collisionMap = this.collisionMaps.get(z);
        return collisionMap ? collisionMap.isWalkable(x, y) : false;
    }
    
    getCollisionMap(z) {
        return this.collisionMaps.get(z);
    }
    
    /**
     * Estatísticas do sistema de mapas
     */
    getStats() {
        return {
            chunkManager: this.chunkManager.getStats(),
            mapLoader: this.mapLoader.getStats(),
            activePlayers: this.activePlayerPositions.size,
            loadedLevels: this.collisionMaps.size
        };
    }
    
    /**
     * Força carregamento de uma área específica
     */
    async preloadArea(x, y, z, radius) {
        logger.info(`Preloading area around (${x}, ${y}, ${z}) with radius ${radius}`);
        await this.chunkManager.loadChunksAround(x, y, z, this.mapLoader);
    }
}
