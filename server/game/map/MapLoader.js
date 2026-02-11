import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Chunk } from './ChunkManager.js';
import { Logger } from '../../utils/Logger.js';

const logger = new Logger('MapLoader');

/**
 * Carregador de mapas com suporte a múltiplos formatos
 * Suporta: .txt (formato legado), .json, Tiled (.tmj)
 */
export class MapLoader {
    constructor() {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const projectRoot = path.resolve(__dirname, '..', '..', '..');
        this.mapPath = path.resolve(projectRoot, 'client', 'assets');
        this.mapCache = new Map(); // Cache de mapas completos
    }
    
    /**
     * Detecta formato do arquivo
     */
    detectFormat(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        
        switch (ext) {
            case '.txt':
                return 'txt';
            case '.json':
                return 'json';
            case '.tmj':
                return 'tiled';
            default:
                return 'unknown';
        }
    }
    
    /**
     * Carrega mapa completo de um arquivo
     */
    async loadMap(z, format = 'txt') {
        const cacheKey = `map_z${z}`;
        
        // Verifica cache
        if (this.mapCache.has(cacheKey)) {
            logger.debug(`Map z${z} loaded from cache`);
            return this.mapCache.get(cacheKey);
        }
        
        let filePath;
        let mapData;
        
        try {
            switch (format) {
                case 'txt':
                    filePath = path.join(this.mapPath, `map_z${z}.txt`);
                    mapData = await this.loadFromTxt(filePath, z);
                    break;
                    
                case 'json':
                    filePath = path.join(this.mapPath, `map_z${z}.json`);
                    mapData = await this.loadFromJSON(filePath, z);
                    break;

                    
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
            
            // Armazena no cache
            this.mapCache.set(cacheKey, mapData);
            logger.info(`Map z${z} loaded (${format} format, ${mapData.tiles.length} tiles)`);
            
            return mapData;
            
        } catch (error) {
            logger.error(`Failed to load map z${z}:`, error.message);
            throw error;
        }
    }
    
    /**
     * Carrega chunk específico de um mapa
     */
    async loadChunk(cx, cy, cz, chunkSize) {
        // Carrega mapa completo (usa cache)
        const mapData = await this.loadMap(cz);
        
        if (!mapData) {
            return null;
        }
        
        // Cria chunk
        const chunk = new Chunk(cx, cy, cz, chunkSize);
        
        // Calcula bounds do chunk
        const startX = cx * chunkSize;
        const startY = cy * chunkSize;
        const endX = startX + chunkSize;
        const endY = startY + chunkSize;
        
        // Filtra tiles do chunk
        mapData.tiles.forEach(tile => {
            if ((tile.x >= startX) && (tile.x < endX) && 
                (tile.y >= startY) && (tile.y < endY)) {
                
                // Adiciona com coordenadas locais
                chunk.addTile({
                    ...tile,
                    localX: tile.x - startX,
                    localY: tile.y - startY
                });
            }
        });
        
        return chunk;
    }
    
    /**
     * Carrega de arquivo .txt (formato legado)
     */
    async loadFromTxt(filePath, z) {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        const tiles = [];

        let maxX = 0;
        let maxY = lines.length;

        lines.forEach((line, y) => {
            // Parse tiles no formato [ID1,ID2,...,modificador,TYPE(...)]
            const tileMatches = line.matchAll(/\[([^\]]+)\]/g);
            let x = 0;

            for (const match of tileMatches) {
                const parts = match[1].split(',');
                let modifier = null;
                let type = null;
                // Procura por TYPE(...)
                for (let i = parts.length - 1; i >= 0; i--) {
                    const part = parts[i].trim();
                    const typeMatch = part.match(/^TYPE\(([^)]+)\)$/i);
                    if (typeMatch) {
                        type = typeMatch[1].toLowerCase();
                        parts.splice(i, 1);
                    } else if (modifier === null && (part === 'S' || part === 'N')) {
                        modifier = part;
                        parts.splice(i, 1);
                    }
                }
                // Mantém UP(4)/DOWN(3) como string, outros como int
                const spriteIds = parts.map(id => {
                    if (/UP\(\d+\)/.test(id) || /DOWN\(\d+\)/.test(id)) {
                        return id;
                    }
                    const n = parseInt(id);
                    return isNaN(n) ? id : n;
                });
                // Sprite principal (primeiro ID numérico, ou string se não houver)
                const mainSpriteId = spriteIds.find(sid => typeof sid === 'number') ?? spriteIds[0];
                // Só adiciona tile se houver spriteId válido (não 0, não undefined)
                if ((mainSpriteId && mainSpriteId !== 0 && mainSpriteId !== '0' && mainSpriteId !== undefined)) {
                    tiles.push({
                        x,
                        y,
                        z,
                        localX: x,
                        localY: y,
                        type: type,
                        walkable: modifier === 'S' ? true : (modifier === 'N' ? false : undefined),
                        spriteId: mainSpriteId,
                        spriteIds: spriteIds, // Array com todas as sprites (layers)
                        modifier: modifier
                    });
                }
                x++;
            }

            if (x > maxX) maxX = x;
        });
        
        return {
            z,
            width: maxX,
            height: maxY,
            tiles,
            format: 'txt'
        };
    }
    
    /**
     * Carrega de arquivo .json (formato customizado)
     */
    async loadFromJSON(filePath, z) {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        return {
            z,
            width: data.width || 0,
            height: data.height || 0,
            tiles: data.tiles
                .filter(tile => (tile.spriteId && tile.spriteId !== 0 && tile.spriteId !== '0'))
                .map(tile => ({
                    x: tile.x,
                    y: tile.y,
                    z,
                    type: tile.type,
                    walkable: tile.hasOwnProperty('walkable') ? tile.walkable : undefined,
                    spriteId: tile.spriteId
                })),
            format: 'json',
            metadata: data.metadata || {}
        };
    }
        
    
    /**
     * Verifica se caractere é walkable
     */
    isWalkableChar(char) {
        const walkable = ['.', '=', ',', ' '];
        return walkable.includes(char);
    }
    
    
    /**
     * Verifica se GID é walkable (Tiled)
     */
    isWalkableGid(gid, tilesets) {
        // Verifica propriedades customizadas do tile no Tiled
        for (const tileset of tilesets) {
            const localId = gid - tileset.firstgid;
            const tile = tileset.tiles?.find(t => t.id === localId);
            
            if (tile?.properties) {
                const walkableProp = tile.properties.find(p => p.name === 'walkable');
                if (walkableProp) {
                    return walkableProp.value;
                }
            }
        }
        
        return true; // Default walkable
    }
    
    /**
     * Exporta mapa para JSON
     */
    async exportToJSON(z, outputPath) {
        const mapData = await this.loadMap(z);
        
        const exportData = {
            version: '1.0',
            z,
            width: mapData.width,
            height: mapData.height,
            tiles: mapData.tiles.map(t => ({
                x: t.x,
                y: t.y,
                type: t.type,
                walkable: t.walkable,
                spriteId: t.spriteId
            })),
            metadata: {
                exportedAt: new Date().toISOString(),
                format: mapData.format
            }
        };
        
        await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
        logger.info(`Map z${z} exported to ${outputPath}`);
    }
    
    /**
     * Limpa cache de mapas
     */
    clearCache() {
        this.mapCache.clear();
        logger.info('Map cache cleared');
    }
    
    /**
     * Estatísticas do loader
     */
    getStats() {
        return {
            cachedMaps: this.mapCache.size,
            memoryUsage: Array.from(this.mapCache.values())
                .reduce((sum, map) => sum + map.tiles.length * 64, 0)
        };
    }
}
