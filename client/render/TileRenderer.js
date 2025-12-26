import { TileSet } from './TileSet.js';
import { resolveTileLayer } from '../utils/resolveTileLayer.js';

/**
 * TileRenderer - Renderiza mapa baseado em matriz de tiles
 * Percorre matriz e desenha tile por tile considerando câmera
 */
import { GameConstants } from '../../shared/constants/GameConstants.js';

export class TileRenderer {
    constructor(tileSize = GameConstants.TILE_SIZE) {
        this.tileSize = tileSize;
        this.tileSet = new TileSet();
        this.debugMode = false;
    }
    
    /**
     * Inicializa tileset
     */
    async init(tilesetPath) {
        if (tilesetPath) {
            await this.tileSet.loadTileset(tilesetPath, this.tileSize);
        }
    }
    
    /**
     * Renderiza mapa completo
     * @param {CanvasRenderingContext2D} ctx
     * @param {Map} map - Instância da classe Map
     * @param {Camera} camera - Câmera para transformação
     */
    // Renderiza apenas tiles ground
    renderGround(ctx, map, camera) {
        if (!map) return;
        const viewport = camera.getViewport();
        const startX = Math.floor(viewport.x / this.tileSize);
        const startY = Math.floor(viewport.y / this.tileSize);
        const endX = Math.ceil((viewport.x + viewport.width) / this.tileSize);
        const endY = Math.ceil((viewport.y + viewport.height) / this.tileSize);
        const currentZ = map.viewport.z;
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const tile = map.getTile(x, y, currentZ);
                if (tile) {
                    const layer = resolveTileLayer(tile.spriteId);
                    if (layer !== 'overlay') {
                        const screenX = (x - startX) * this.tileSize;
                        const screenY = (y - startY) * this.tileSize;
                        this.renderTileAt(ctx, tile, screenX, screenY);
                    }
                } else if (this.debugMode) {
                    const screenX = (x - startX) * this.tileSize;
                    const screenY = (y - startY) * this.tileSize;
                    this.renderEmptyTileAt(ctx, screenX, screenY);
                }
            }
        }
    }

    // Renderiza apenas tiles overlay (qualquer spriteId overlay)
    renderOverlay(ctx, map, camera) {
        if (!map) return;
        const viewport = camera.getViewport();
        const startX = Math.floor(viewport.x / this.tileSize);
        const startY = Math.floor(viewport.y / this.tileSize);
        const endX = Math.ceil((viewport.x + viewport.width) / this.tileSize);
        const endY = Math.ceil((viewport.y + viewport.height) / this.tileSize);
        const currentZ = map.viewport.z;
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const tile = map.getTile(x, y, currentZ);
                if (tile) {
                    // Se QUALQUER spriteId do tile for overlay, desenha como overlay
                    const spriteIds = tile.spriteIds || (tile.spriteId ? [tile.spriteId] : []);
                    const hasOverlay = spriteIds.some(id => resolveTileLayer(id) === 'overlay');
                    if (hasOverlay) {
                        const screenX = (x - startX) * this.tileSize;
                        const screenY = (y - startY) * this.tileSize;
                        this.renderTileAt(ctx, tile, screenX, screenY);
                    }
                }
            }
        }
    }
    
    /**
     * Renderiza um tile em coordenadas de tela específicas
     */
    renderTileAt(ctx, tile, screenX, screenY) {
        // Desenha todas as sprites (layers) do tile - SUPORTA STACKED SPRITES
        if (tile.spriteIds && tile.spriteIds.length > 0) {
            // Filtra valores 'up' e 'down' (string) e só permite números válidos
            tile.spriteIds.filter(id => typeof id === 'number' && !isNaN(id)).forEach(spriteId => {
                this.tileSet.drawTile(ctx, spriteId, screenX, screenY, this.tileSize);
            });
        } else if (
            typeof tile.spriteId === 'number' && !isNaN(tile.spriteId)
        ) {
            // Sprite única (fallback)
            this.tileSet.drawTile(ctx, tile.spriteId, screenX, screenY, this.tileSize);
        } else if (
            typeof tile.spriteId === 'string' &&
            (tile.spriteId === 'up' || tile.spriteId === 'down')
        ) {
            // Não renderiza nada para 'up' ou 'down'
            // (mantém o espaço vazio)
        }
        
        // OVERLAY: Non-walkable tiles (vermelho transparente)
        if (!tile.walkable && this.debugMode) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        }
        
        // OVERLAY: Spawn tiles (verde transparente)
        if ((tile.spawn || (tile.entities && tile.entities.length > 0)) && this.debugMode) {
            ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        }
        
        // Debug: mostra informações do tile
        if (this.debugMode) {
            this.renderTileDebugAt(ctx, tile, screenX, screenY);
        }
    }
    
    /**
     * Renderiza um tile individual (legado - usa coordenadas do mundo)
     */
    renderTile(ctx, tile) {
        const worldX = tile.x * this.tileSize;
        const worldY = tile.y * this.tileSize;
        this.renderTileAt(ctx, tile, worldX, worldY);
    }
    
    /**
     * Renderiza tile vazio em coordenadas de tela (debug)
     */
    renderEmptyTileAt(ctx, screenX, screenY) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        
        ctx.strokeStyle = '#333333';
        ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
    }
    
    /**
     * Renderiza informações de debug em coordenadas de tela
     */
    renderTileDebugAt(ctx, tile, screenX, screenY) {
        // Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
        
        // Coordenadas
        ctx.fillStyle = 'white';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${tile.x},${tile.y}`, screenX + this.tileSize / 2, screenY + 10);
        
        // Sprite IDs (mostra array se múltiplas)
        if (tile.spriteIds && tile.spriteIds.length > 1) {
            ctx.fillText(`[${tile.spriteIds.join(',')}]`, screenX + this.tileSize / 2, screenY + 20);
        } else {
            ctx.fillText(`ID:${tile.spriteId}`, screenX + this.tileSize / 2, screenY + 20);
        }
        
        // Spawn indicator
        if (tile.spawn) {
            ctx.fillStyle = 'yellow';
            ctx.fillText(`S:${tile.spawn}`, screenX + this.tileSize / 2, screenY + 30);
        }
    }
    
    /**
     * Renderiza informações de debug do tile (legado - coordenadas do mundo)
     */
    renderTileDebug(ctx, tile, worldX, worldY) {
        this.renderTileDebugAt(ctx, tile, worldX, worldY);
    }
    
    /**
     * Renderiza grid do mapa (debug)
     */
    renderGrid(ctx, map, camera) {
        ctx.save();
        camera.apply(ctx);
        
        const viewport = camera.getViewport();
        const startX = Math.floor(viewport.x / this.tileSize) * this.tileSize;
        const startY = Math.floor(viewport.y / this.tileSize) * this.tileSize;
        const endX = viewport.x + viewport.width;
        const endY = viewport.y + viewport.height;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Linhas verticais
        for (let x = startX; x <= endX; x += this.tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        
        // Linhas horizontais
        for (let y = startY; y <= endY; y += this.tileSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    /**
     * Ativa/desativa modo debug
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`[TileRenderer] Debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }
    
    /**
     * Obtém TileSet para customização
     */
    getTileSet() {
        return this.tileSet;
    }
}
