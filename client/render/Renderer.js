import { TileRenderer } from './TileRenderer.js';
import { SpriteRenderer } from './SpriteRenderer.js';
import { HUD } from './UI/HUD.js';
import { DeathModal } from './UI/DeathModal.js';
import { ChatBox } from './UI/ChatBox.js';
import { NpcDialog } from './UI/NpcDialog.js';
import { OutfitSelector } from './UI/OutfitSelector.js';
import { UIManager } from './UI/UIManager.js';
import { GameConstants } from '../../shared/constants/GameConstants.js';
import { resolveTileLayer } from '../utils/resolveTileLayer.js';

export class Renderer {
    constructor(canvas, camera, wsClient) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = camera;
        this.wsClient = wsClient;
        
        this.tileRenderer = new TileRenderer(GameConstants.TILE_SIZE);
        this.spriteRenderer = new SpriteRenderer(this.ctx, camera);
        this.uiManager = new UIManager(this.ctx, canvas);
        this.hud = new HUD(this.ctx, canvas, this.uiManager);
        this.deathModal = new DeathModal(this.ctx, canvas);
        this.chatBox = new ChatBox(this.ctx, canvas, this.uiManager);
        this.npcDialog = new NpcDialog(this.ctx, canvas, wsClient);
        this.outfitSelector = new OutfitSelector(this.ctx, canvas, wsClient);
        this.showGrid = false;
        this.wildPokemonManager = null; // Será definido depois
    }
    
    async init() {
        this.ctx.imageSmoothingEnabled = false;
        
        // Inicializa tile renderer
        // Pode carregar tileset de imagem aqui se disponível
        // await this.tileRenderer.init('assets/tileset.png');
        await this.tileRenderer.init(); // Usa fallback de cores
        
        // Pré-carrega sprites de players em background (não bloqueia renderização)
        this.spriteRenderer.preloadPlayerSprites().catch(error => {
            console.warn('[Renderer] Failed to preload player sprites, using fallback:', error);
        });
    }
    
    clear() {
        // Salva estado
        this.ctx.save();
        // Reset de qualquer transformação
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Limpa TODO o canvas de (0,0) até (width, height)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Restaura estado
        this.ctx.restore();
    }
    
    render(gameState) {
        // Limpa canvas
        this.clear();

        // Parâmetros do viewport
        const map = gameState.map;
        if (!map) return;
        const viewport = this.camera.getViewport();
        const tileSize = this.tileRenderer.tileSize;
        const startX = Math.floor(viewport.x / tileSize);
        const startY = Math.floor(viewport.y / tileSize);
        const endX = startX + Math.ceil(viewport.width / tileSize) - 1;
        const endY = startY + Math.ceil(viewport.height / tileSize) - 1;
        const currentZ = map.viewport.z;

        // Detecta tile especial sob o player e notifica o servidor
        const player = gameState.player;
        if (player && gameState.protocolHandler) {
            const playerTile = map.getTile(player.x, player.y, player.z);
            if (playerTile && playerTile.spriteIds) {
                if (playerTile.spriteIds.some(id => typeof id === 'string' && id.includes('UP(4)'))) {
                    gameState.protocolHandler.sendChangeFloor('up', player.x, player.y, player.z);
                }
                if (playerTile.spriteIds.some(id => typeof id === 'string' && id.includes('DOWN(3)'))) {
                    gameState.protocolHandler.sendChangeFloor('down', player.x, player.y, player.z);
                }
            }
        }

        // Organiza entidades por linha Y
        const entities = gameState.getEntitiesInView(this.camera);
        const entitiesByY = {};
        entities.forEach(entity => {
            const y = entity.y;
            if (!entitiesByY[y]) entitiesByY[y] = [];
            entitiesByY[y].push(entity);
        });

        // Ordem correta: ground, player, overlay
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const tile = map.getTile(x, y, currentZ);
                const screenX = (x - startX) * tileSize;
                const screenY = (y - startY) * tileSize;

                // 1. Renderiza ground (sempre)
                if (tile) {
                    const spriteIds = tile.spriteIds || (tile.spriteId ? [tile.spriteId] : []);
                    const groundIds = spriteIds.filter(id => resolveTileLayer(id) !== 'overlay');
                    if (groundIds.length > 0) {
                        // Renderiza apenas ground
                        const groundTile = { ...tile, spriteIds: groundIds };
                        this.tileRenderer.renderTileAt(this.ctx, groundTile, screenX, screenY);
                    }
                }

                // 2. Renderiza entidade (player, NPC, etc)
                let entity = null;
                if (entitiesByY[y]) {
                    entity = entitiesByY[y].find(e => e.x === x);
                    if (entity) {
                        this.spriteRenderer.renderEntity(entity, startX, startY);
                    }
                }

                // 3. Renderiza overlay (sempre por cima do player)
                if (tile) {
                    const spriteIds = tile.spriteIds || (tile.spriteId ? [tile.spriteId] : []);
                    const overlayIds = spriteIds.filter(id => resolveTileLayer(id) === 'overlay');
                    if (overlayIds.length > 0) {
                        // Renderiza apenas overlay
                        const overlayTile = { ...tile, spriteIds: overlayIds };
                        this.tileRenderer.renderTileAt(this.ctx, overlayTile, screenX, screenY);
                    }
                }
            }
        }
        if (this.showGrid) {
            this.tileRenderer.renderGrid(this.ctx, map, this.camera);
        }
        
        // 3. Renderiza UI (POR ÚLTIMO - sobre tudo)
        this.hud.render(gameState, this.wildPokemonManager);
        
        // 4. Renderiza chat
        this.chatBox.render();
        
        // 5. Renderiza indicador de modo de edição
        this.uiManager.renderEditModeIndicator();
        
        // 6. Renderiza diálogo de NPC (se visível)
        this.npcDialog.render();
        
        // 7. Renderiza modal de morte (se visível - bloqueia tudo)
        this.deathModal.render();

        // 8. Renderiza OutfitSelector (UI de troca de sprite)
        this.outfitSelector.render(this.spriteRenderer);
    }
}
