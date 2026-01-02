import { TileRenderer } from './TileRenderer.js';
import { SpriteRenderer } from './SpriteRenderer.js';
import { HUD } from './UI/HUD.js';
import { DeathModal } from './UI/DeathModal.js';
import { ChatBox } from './UI/ChatBox.js';
import { InfoMenuUI } from './UI/InfoMenuUI.js';
import { NpcDialog } from './UI/NpcDialog.js';
import { OutfitSelector } from './UI/OutfitSelector.js';
import { UIManager } from './UI/UIManager.js';
import { GameConstants } from '../../shared/constants/GameConstants.js';
import { resolveTileLayer } from '../utils/resolveTileLayer.js';
import { TileActions } from '../utils/TileActions.js';
import { WildPokemonRenderer } from './WildPokemonRenderer.js';

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
        this.infoMenuUI = new InfoMenuUI(this.ctx, canvas, this.uiManager);
        this.npcDialog = new NpcDialog(this.ctx, canvas, wsClient);
        this.outfitSelector = new OutfitSelector(this.ctx, canvas, wsClient);
        this.showGrid = false;
        this.wildPokemonManager = null; // Será definido depois
        this.wildPokemonRenderer = new WildPokemonRenderer();
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
    
    render(gameState, skillEffectManager, inventoryManager) {
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

        const player = gameState.localPlayer;
        const tileAtual = map.getTile(player.x, player.y, player.z);
        const isInHouseOrConstrucao = tileAtual && (
                tileAtual.type === 'house' ||
                tileAtual.type === 'HOUSE' ||
                tileAtual.type === 'construcao' ||
                tileAtual.type === 'CONSTRUCAO'
        );
        
        // Renderização condicional para múltiplos andares (z >= 3 mostra z, z-1, z-2)
        const entityZ = (gameState.localPlayer && typeof gameState.localPlayer.z === 'number') ? gameState.localPlayer.z : currentZ;

        // Organiza entidades por linha Y e múltiplos andares visíveis
        let zsVisiveis;
        if (entityZ >= 3) {
            zsVisiveis = [3, 4, 5];
        } else {
            zsVisiveis = [entityZ];
        }
        // Busca entidades de todos os andares visíveis
        const entities = gameState.getEntitiesInView(this.camera, zsVisiveis);
        const entitiesByY = {};
        entities.forEach(entity => {
            const y = entity.y;
            if (!entitiesByY[y]) entitiesByY[y] = [];
            entitiesByY[y].push(entity);
        });
        

        
        if (entityZ >= 3) {
            // Renderiza do mais baixo para o mais alto (z-2, z-1, z)
            for (let dz = 2; dz >= 0; dz--) {
                const z = entityZ - dz;
                // Seleciona o mapa correto para cada z
                let mapForZ = map;
                if (z === entityZ - 1 && gameState.mapDown) {
                    mapForZ = new map.constructor();
                    mapForZ.updateFromServer(gameState.mapDown);
                } else if (z === entityZ - 2 && gameState.mapDown2) {
                    mapForZ = new map.constructor();
                    mapForZ.updateFromServer(gameState.mapDown2);
                }
                for (let y = startY; y <= endY; y++) {
                    for (let x = startX; x <= endX; x++) {
                        const screenX = (x - startX) * tileSize;
                        const screenY = (y - startY) * tileSize;
                        const tile = mapForZ.getTile(x, y, z);
                        // Bloqueia renderização se o tile acima for construcao/house
                        let blockAbove = false;
                        if (dz < 2) {
                            const tileAbove = map.getTile(x, y, z+1);
                            if (tileAbove && (tileAbove.type === 'construcao' || tileAbove.type === 'CONSTRUCAO' || tileAbove.type === 'house' || tileAbove.type === 'HOUSE')) {
                                blockAbove = true;
                            }
                        }
                        if (!blockAbove && tile && tile.spriteId && tile.spriteId !== 0 && tile.spriteId !== '0' && tile.spriteId !== undefined && tile.spriteId !== null) {
                            let spriteIds = tile.spriteIds || (tile.spriteId ? [tile.spriteId] : []);
                            if (spriteIds.length > 1) {
                                spriteIds = spriteIds.filter(id => id !== 0 && id !== '0');
                            }
                            const groundIds = spriteIds.filter(id => resolveTileLayer(id) !== 'overlay' && id !== undefined && id !== null);
                            if (groundIds.length > 0) {
                                // Renderiza o chão SEM o portal primeiro
                                let groundTileBase = { ...tile, spriteIds: groundIds.filter(id => id !== 197) };
                                this.ctx.save();
                                this.ctx.globalAlpha = 1.0;
                                this.tileRenderer.renderTileAt(this.ctx, groundTileBase, screenX, screenY);
                                this.ctx.restore();

                                // Agora renderiza o portal animado por cima, se existir
                                if (groundIds.includes(197)) {
                                    let portalTile = { ...tile, spriteIds: [197] };
                                    const portalInstances = TileActions?.[197]?.instances;
                                    if (portalInstances) {
                                        const portal = portalInstances.find(inst => inst.x === tile.x && inst.y === tile.y && inst.z === tile.z);
                                        if (portal && portal.idleAnimation) {
                                            portalTile = { ...portalTile, idleAnimation: portal.idleAnimation };
                                        }
                                    }
                                    this.ctx.save();
                                    this.ctx.globalAlpha = 1.0;
                                    this.tileRenderer.renderTileAt(this.ctx, portalTile, screenX, screenY);
                                    this.ctx.restore();
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // Para outros andares (ex: z=2), renderiza apenas o mapa atual (sem overlay de z superiores)
            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    const screenX = (x - startX) * tileSize;
                    const screenY = (y - startY) * tileSize;
                    const tile = map.getTile(x, y, currentZ);
                    if (tile && tile.spriteId && tile.spriteId !== 0 && tile.spriteId !== '0' && tile.spriteId !== undefined && tile.spriteId !== null) {
                        let spriteIds = tile.spriteIds || (tile.spriteId ? [tile.spriteId] : []);
                        if (spriteIds.length > 1) {
                            spriteIds = spriteIds.filter(id => id !== 0 && id !== '0');
                        }
                        const groundIds = spriteIds.filter(id => resolveTileLayer(id) !== 'overlay' && id !== undefined && id !== null);
                        if (groundIds.length > 0) {
                            // Renderiza o chão SEM o portal primeiro
                            let groundTileBase = { ...tile, spriteIds: groundIds.filter(id => id !== 197) };
                            this.ctx.save();
                            this.ctx.globalAlpha = 1.0;
                            this.tileRenderer.renderTileAt(this.ctx, groundTileBase, screenX, screenY);
                            this.ctx.restore();

                            // Agora renderiza o portal animado por cima, se existir
                            if (groundIds.includes(197)) {
                                let portalTile = { ...tile, spriteIds: [197] };
                                const portalInstances = TileActions?.[197]?.instances;
                                if (portalInstances) {
                                    const portal = portalInstances.find(inst => inst.x === tile.x && inst.y === tile.y && inst.z === tile.z);
                                    if (portal && portal.idleAnimation) {
                                        portalTile = { ...portalTile, idleAnimation: portal.idleAnimation };
                                    }
                                }
                                this.ctx.save();
                                this.ctx.globalAlpha = 1.0;
                                this.tileRenderer.renderTileAt(this.ctx, portalTile, screenX, screenY);
                                this.ctx.restore();
                            }
                        }
                    }
                }
            }
        }


        // 1. Renderiza corpos mortos de pokémons selvagens (spriteDead) ANTES dos jogadores
        if (this.wildPokemonManager && this.wildPokemonRenderer) {
            for (let z of zsVisiveis) {
                const wildsDead = Array.from(this.wildPokemonManager.getAll().values()).filter(wp => wp.z === z && wp.isDead);
                for (const wild of wildsDead) {
                    this.ctx.save();
                    if (z !== entityZ) {
                        this.ctx.globalAlpha = 0.8;
                        this.wildPokemonRenderer.renderWildPokemon(this.ctx, { ...wild, _noNameBar: true }, this.camera);
                    } else {
                        this.ctx.globalAlpha = 1.0;
                        this.wildPokemonRenderer.renderWildPokemon(this.ctx, wild, this.camera);
                    }
                    this.ctx.restore();
                }
            }
        }

        // 2. Renderiza entidades (inclui jogadores, npcs, monstros vivos)
        if(entityZ <= 3){
            this.renderEntitiesByFloors(entitiesByY, startX, startY, zsVisiveis, endX, endY, entityZ);
        }

        // 3. Renderiza pokémons selvagens vivos (não mortos) DEPOIS dos jogadores
        if (this.wildPokemonManager && this.wildPokemonRenderer) {
            for (let z of zsVisiveis) {
                const wildsAlive = Array.from(this.wildPokemonManager.getAll().values()).filter(wp => wp.z === z && !wp.isDead);
                for (const wild of wildsAlive) {
                    let wildMap = map;
                    if (z === entityZ - 1 && gameState.mapDown) {
                        wildMap = new map.constructor();
                        wildMap.updateFromServer(gameState.mapDown);
                    } else if (z === entityZ - 2 && gameState.mapDown2) {
                        wildMap = new map.constructor();
                        wildMap.updateFromServer(gameState.mapDown2);
                    }
                    const wildTile = wildMap.getTile(wild.x, wild.y, wild.z);
                    const isWildInConstrucao = wildTile && (
                        wildTile.type === 'house' ||
                        wildTile.type === 'HOUSE' ||
                        wildTile.type === 'construcao' ||
                        wildTile.type === 'CONSTRUCAO'
                    );
                    this.ctx.save();
                    if (z !== entityZ && !isWildInConstrucao) {
                        this.ctx.globalAlpha = 0.8;
                        this.wildPokemonRenderer.renderWildPokemon(this.ctx, { ...wild, _noNameBar: true }, this.camera);
                    } else if (z === entityZ) {
                        this.ctx.globalAlpha = 1.0;
                        this.wildPokemonRenderer.renderWildPokemon(this.ctx, wild, this.camera);
                    }
                    this.ctx.restore();
                }
            }
        }

        if(entityZ <= 3){
            this.renderEntitiesByFloors(entitiesByY, startX, startY, zsVisiveis, endX, endY, entityZ);
        }

         // 3. Renderiza portais e overlays dos tiles
        const zsVisiveisOrdem = [...zsVisiveis].sort((a, b) => a - b); // menor z primeiro
        for (let z of zsVisiveisOrdem) {
            // Seleciona o mapa correto para cada z
            let mapForZ = map;
            if (z === entityZ - 1 && gameState.mapDown) {
                mapForZ = new map.constructor();
                mapForZ.updateFromServer(gameState.mapDown);
            } else if (z === entityZ - 2 && gameState.mapDown2) {
                mapForZ = new map.constructor();
                mapForZ.updateFromServer(gameState.mapDown2);
            } else if (z === entityZ + 1 && gameState.mapUp) {
                mapForZ = new map.constructor();
                mapForZ.updateFromServer(gameState.mapUp);
            }
            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    const tile = mapForZ.getTile(x, y, z);
                    const screenX = (x - startX) * tileSize;
                    const screenY = (y - startY) * tileSize;
                    if (tile) {
                        const spriteIds = tile.spriteIds || (tile.spriteId ? [tile.spriteId] : []);
                        const overlayIds = spriteIds.filter(id => resolveTileLayer(id) === 'overlay');
                        if (overlayIds.length > 0) {
                            // Se está no mesmo andar do player, renderiza todos overlays
                            if (z === entityZ) {
                                let overlayTile = { ...tile, spriteIds: overlayIds };
                                if (overlayIds.includes(197)) {
                                    const portalInstances = TileActions?.[197]?.instances;
                                    if (portalInstances) {
                                        const portal = portalInstances.find(inst => inst.x === tile.x && inst.y === tile.y && inst.z === tile.z);
                                        if (portal && portal.idleAnimation) {
                                            overlayTile = { ...overlayTile, idleAnimation: portal.idleAnimation };
                                        }
                                    }
                                }
                                this.ctx.save();
                                this.ctx.globalAlpha = 1.0;
                                this.tileRenderer.renderTileAt(this.ctx, overlayTile, screenX, screenY);
                                this.ctx.restore();
                            } else {
                                // Se está em outro andar, NÃO renderiza overlays de house/construcao
                                if (!tile.type || (
                                    tile.type.toLowerCase() !== 'house' && tile.type.toLowerCase() !== 'construcao'
                                )) {
                                    let overlayTile = { ...tile, spriteIds: overlayIds };
                                    if (overlayIds.includes(197)) {
                                        const portalInstances = TileActions?.[197]?.instances;
                                        if (portalInstances) {
                                            const portal = portalInstances.find(inst => inst.x === tile.x && inst.y === tile.y && inst.z === tile.z);
                                            if (portal && portal.idleAnimation) {
                                                overlayTile = { ...overlayTile, idleAnimation: portal.idleAnimation };
                                            }
                                        }
                                    }
                                    this.ctx.save();
                                    this.ctx.globalAlpha = 1.0;
                                    this.tileRenderer.renderTileAt(this.ctx, overlayTile, screenX, screenY);
                                    this.ctx.restore();
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. Renderiza TODO o andar superior (mapUp) como overlay se existir
        if (gameState.mapUp && gameState.localPlayer) {
            // Só renderiza se o player NÃO estiver em tile house/construcao
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
                    // Após o overlay do mapa superior, renderiza entidades de z=4 (e z=5 se desejar)
                    this.renderEntitiesByFloors(entitiesByY, startX, startY, [4, 5], endX, endY, entityZ);
                }
            }
        }

       

        if(entityZ > 3){
            this.renderEntitiesByFloors(entitiesByY, startX, startY, zsVisiveis, endX, endY, entityZ);
        }

        if (this.showGrid) {
            this.tileRenderer.renderGrid(this.ctx, map, this.camera);
        }
        
        // 3. Renderiza UI (POR ÚLTIMO - sobre tudo)
        this.hud.render(gameState, this.wildPokemonManager);
        
        // 4. Renderiza chat
        this.chatBox.render();

        // 4.1 Renderiza InfoMenuUI
        this.infoMenuUI.render();
        
        // 5. Renderiza indicador de modo de edição
        this.uiManager.renderEditModeIndicator();
        
        // --- Efeito visual de skill ao redor do player ---
        if (skillEffectManager) {
            skillEffectManager.render(this.ctx);
        }
        // 3. Renderiza HUD novamente para garantir que a UI fique acima dos sprites (caso algum sprite sobrescreva)
        this.hud.render(gameState, this.wildPokemonManager);
        // 4. Renderiza inventário por último (acima de tudo)
        if (inventoryManager) {
            inventoryManager.render();
        }
        // 5. Renderiza diálogo de NPC (se visível)
        this.npcDialog.render();
        // 6. Renderiza modal de morte (se visível - bloqueia tudo)
        this.deathModal.render();
        // 7. Renderiza OutfitSelector (UI de troca de sprite)
        this.outfitSelector.render(this.spriteRenderer);

    }

    renderEntitiesByFloors(entitiesByY, startX, startY, zsVisiveis,endX,endY, playerZ, overlayNpcs = true) {
        for (let z of zsVisiveis) {
            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    let entity = null;
                    if (entitiesByY[y]) {
                        entity = entitiesByY[y].find(e => e.x === x && e.z === z);
                        if (entity) {
                            if (entity.type === 'player') {
                                // Renderiza player
                                this.spriteRenderer.renderEntity(entity, startX, startY);
                            } else if (entity.type === 'npc') {
                                // Renderiza NPC
                                if (overlayNpcs && playerZ === entity.z) {
                                    this.spriteRenderer.renderEntity(entity, startX, startY);
                                }
                            } else if (entity.type === 'monster') {
                                // Renderiza pokémon selvagem (ou monstro)
                                this.spriteRenderer.renderEntity(entity, startX, startY);
                            } else {
                                // Outros tipos, se houver
                                this.spriteRenderer.renderEntity(entity, startX, startY);
                            }
                        }
                    }
                }
            }
        }
    }
}
