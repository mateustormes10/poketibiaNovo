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
import { TileActions } from '../utils/TileActions.js';

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
        this.removedPlayers = new Set();
        if (wsClient && typeof wsClient.on === 'function') {
            wsClient.on('removePlayer', ({ id }) => {
                this.removedPlayers.add(id);
            });
        }
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
        // Remove players marked for removal before rendering
        if (gameState.players) {
            for (const id of this.removedPlayers) {
                gameState.players.delete(id);
            }
        }
        // Antes de renderizar, reseta estado de renderização/interpolação dos players que não devem ser visíveis
        if (gameState.players && gameState.localPlayer) {
            const localPlayer = gameState.localPlayer;
            for (const [id, p] of gameState.players) {
                const localTile = gameState.map.getTile(localPlayer.x, localPlayer.y, localPlayer.z);
                const otherTile = gameState.map.getTile(p.x, p.y, p.z);
                const isLocalInHouse = localTile && (localTile.type === 'house' || localTile.type === 'HOUSE' || localTile.type === 'construcao' || localTile.type === 'CONSTRUCAO');
                const isLocalNormal = !localTile || !localTile.type || localTile.type === '';
                const isOtherNormal = !otherTile || !otherTile.type || otherTile.type === '';
                let canSee = true;
                if (isLocalInHouse && p.z !== localPlayer.z) {
                    canSee = false;
                }
                if (!isLocalInHouse && p.z !== localPlayer.z && !(isLocalNormal && isOtherNormal)) {
                    canSee = false;
                }
                if (!canSee) {
                    p.isMoving = false;
                    p.moveProgress = 1;
                    p.renderX = p.x;
                    p.renderY = p.y;
                    p.prevX = p.x;
                    p.prevY = p.y;
                }
            }
        }
            // DEBUG: Verifica se mapDown2 chegou do server
            console.log('[DEBUG] mapDown2:', gameState.mapDown2);
        // (Bloco antigo de renderização do andar de baixo removido para evitar confusão)
                // DEBUG: Loga informações do mapUp recebido
                if (gameState.mapUp) {
                    console.log('[DEBUG] mapUp recebido:', gameState.mapUp);
                    if (gameState.mapUp.tiles) {
                        const tilesZUp = gameState.mapUp.tiles.filter(t => t.z === (gameState.map ? gameState.map.viewport.z + 1 : undefined));
                        console.log(`[DEBUG] mapUp.tiles.length = ${gameState.mapUp.tiles.length}, tiles z+1 =`, tilesZUp);
                    }
                }
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

        // Organiza entidades por linha Y
        const entities = gameState.getEntitiesInView(this.camera);
        const entitiesByY = {};
        entities.forEach(entity => {
            const y = entity.y;
            if (!entitiesByY[y]) entitiesByY[y] = [];
            entitiesByY[y].push(entity);
        });


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

        
        // Atualiza player no TileRenderer para animação de tiles
        this.tileRenderer.setPlayer(player);


        // Renderiza mapa e players de todos os andares visíveis (z-2, z-1, z, z+1, z+2)
        const playerZ = (gameState.localPlayer && typeof gameState.localPlayer.z === 'number') ? gameState.localPlayer.z : currentZ;
        const minZ = Math.max(0, playerZ - 2);
        const maxZ = playerZ + 2;
        for (let z = minZ; z <= maxZ; z++) {
            // Seleciona o mapa correto para cada z
            let mapForZ = map;
            if (z === playerZ - 1 && gameState.mapDown) {
                mapForZ = new map.constructor();
                mapForZ.updateFromServer(gameState.mapDown);
            } else if (z === playerZ - 2 && gameState.mapDown2) {
                mapForZ = new map.constructor();
                mapForZ.updateFromServer(gameState.mapDown2);
            } else if (z === playerZ + 1 && gameState.mapUp) {
                mapForZ = new map.constructor();
                mapForZ.updateFromServer(gameState.mapUp);
            }
            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    const screenX = (x - startX) * tileSize;
                    const screenY = (y - startY) * tileSize;
                    const tile = mapForZ.getTile(x, y, z);
                    if (tile && tile.spriteId && tile.spriteId !== 0 && tile.spriteId !== '0' && tile.spriteId !== undefined && tile.spriteId !== null) {
                        const spriteIds = tile.spriteIds || (tile.spriteId ? [tile.spriteId] : []);
                        const groundIds = spriteIds.filter(id => resolveTileLayer(id) !== 'overlay' && id !== 0 && id !== '0' && id !== undefined && id !== null);
                        if (groundIds.length > 0) {
                            const groundTile = { ...tile, spriteIds: groundIds };
                            this.ctx.save();
                            this.ctx.globalAlpha = 1.0;
                            this.tileRenderer.renderTileAt(this.ctx, groundTile, screenX, screenY);
                            this.ctx.restore();
                        }
                    }
                }
            }
            // Renderiza players desse andar, filtrando house/construção
            if (gameState.players) {
                const localPlayer = gameState.localPlayer;
                for (const [id, p] of gameState.players) {
                    if (!localPlayer) continue;
                    const localTile = map.getTile(localPlayer.x, localPlayer.y, localPlayer.z);
                    const otherTile = map.getTile(p.x, p.y, p.z);
                    const isLocalInHouse = localTile && (localTile.type === 'house' || localTile.type === 'HOUSE' || localTile.type === 'construcao' || localTile.type === 'CONSTRUCAO');
                    const isLocalNormal = !localTile || !localTile.type || localTile.type === '';
                    const isOtherNormal = !otherTile || !otherTile.type || otherTile.type === '';
                    let canSee = true;
                    // Se o localPlayer está em house/construção, só vê quem está no mesmo andar
                    if (isLocalInHouse && p.z !== localPlayer.z) {
                        canSee = false;
                    }
                    // Se o localPlayer está em tile normal, só vê players de outros andares se ambos estão em tile normal
                    if (!isLocalInHouse && p.z !== localPlayer.z && !(isLocalNormal && isOtherNormal)) {
                        canSee = false;
                    }
                    if (!canSee) {
                        // Força reset do estado de renderização/interpolação para remover fantasma
                        p.isMoving = false;
                        p.moveProgress = 1;
                        p.renderX = p.x;
                        p.renderY = p.y;
                        p.prevX = p.x;
                        p.prevY = p.y;
                        continue;
                    }
                    if (p.z === z) {
                        const screenPos = this.camera.worldToScreen(p.x, p.y);
                        this.spriteRenderer.renderPlayer(p, screenPos);
                    }
                }
            }
        }


        
        // aqui termina o problema pra arrumarmos

        // 2. Renderiza TODO o andar superior (mapUp) como overlay se existir
        if (gameState.mapUp && gameState.localPlayer) {
            // Só renderiza se o player NÃO estiver em tile house/construcao
            const player = gameState.localPlayer;
            const tileAtual = map.getTile(player.x, player.y, player.z);
            const isInHouseOrConstrucao = tileAtual && (
                tileAtual.type === 'house' ||
                tileAtual.type === 'HOUSE' ||
                tileAtual.type === 'construcao' ||
                tileAtual.type === 'CONSTRUCAO'
            );
            if (!isInHouseOrConstrucao) {
                // Se o player está no z=3, renderiza o andar superior (z=4) por cima do z=3, sem opacidade
                const mapUp = new gameState.map.constructor();
                mapUp.updateFromServer(gameState.mapUp);
                if (player.z === 3) {
                    for (let y = startY; y <= endY; y++) {
                        for (let x = startX; x <= endX; x++) {
                            const tileZ4 = mapUp.getTile(x, y, 4); // z=4
                            if (tileZ4) {
                                const spriteIds = tileZ4.spriteIds || (tileZ4.spriteId ? [tileZ4.spriteId] : []);
                                // Só renderiza se houver spriteIds e não for 0
                                if (spriteIds.length > 0 && !spriteIds.every(id => id === 0)) {
                                    let overlayTile = { ...tileZ4, spriteIds };
                                    this.ctx.save();
                                    this.ctx.globalAlpha = 1.0;
                                    this.tileRenderer.renderTileAt(this.ctx, overlayTile, (x - startX) * tileSize, (y - startY) * tileSize);
                                    this.ctx.restore();
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Renderiza overlay do andar atual (sempre por cima do player) não mexer tem nd haver aqui
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const tile = map.getTile(x, y, currentZ);
                const screenX = (x - startX) * tileSize;
                const screenY = (y - startY) * tileSize;
                if (tile) {
                    const spriteIds = tile.spriteIds || (tile.spriteId ? [tile.spriteId] : []);
                    const overlayIds = spriteIds.filter(id => resolveTileLayer(id) === 'overlay');
                    if (overlayIds.length > 0) {
                        let overlayTile = { ...tile, spriteIds: overlayIds };
                        // --- INJETA idleAnimation DO PORTAL SE HOUVER INSTÂNCIA NA POSIÇÃO ---
                        if (overlayIds.includes(197)) {
                            const portalInstances = TileActions?.[197]?.instances;
                            if (portalInstances) {
                                const portal = portalInstances.find(inst => inst.x === tile.x && inst.y === tile.y && inst.z === tile.z);
                                if (portal && portal.idleAnimation) {
                                    overlayTile = { ...overlayTile, idleAnimation: portal.idleAnimation };
                                }
                            }
                        }
                        // Todos overlays do andar atual SEM opacidade
                        this.ctx.save();
                        this.ctx.globalAlpha = 1.0;
                        this.tileRenderer.renderTileAt(this.ctx, overlayTile, screenX, screenY);
                        this.ctx.restore();
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
