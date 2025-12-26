import { GameConstants } from '../../shared/constants/GameConstants.js';

// Carregamento dinâmico do índice de sprites
let spritesIndex = null;
async function loadSpritesIndex() {
    if (spritesIndex) return spritesIndex;
    const res = await fetch('assets/sprites/sprites_index.json');
    spritesIndex = await res.json();
    return spritesIndex;
}
import { SpritePlayerList, getPlayerSprites } from '../config/SpritePlayerList.js';




export class SpriteRenderer {

        /**
         * Renderiza uma sprite de skill por id no canvas
         * @param {CanvasRenderingContext2D} ctx
         * @param {string|number} spriteId
         * @param {number} x
         * @param {number} y
         */
        renderSpriteById(ctx, spriteId, x, y) {
            const img = this.sprites.get(spriteId.toString());
            if (img && img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, x, y, this.tileSize, this.tileSize);
            } else if (!this.sprites.has(spriteId.toString())) {
                // Tenta carregar na hora
                this.loadSpriteFromIndex(
                    spriteId,
                    (imgLoaded) => {
                        this.sprites.set(spriteId.toString(), imgLoaded);
                    },
                    () => {
                        console.warn(`[SpriteRenderer] Falha ao carregar spriteId ${spriteId}`);
                    }
                );
            } else {
                console.log(`[SpriteRenderer] SpriteId ${spriteId} ainda não carregado.`);
            }
        }
    constructor(ctx, camera) {
        this.ctx = ctx;
        this.camera = camera;
        this.tileSize = GameConstants.TILE_SIZE;
        this.sprites = new Map();
    }

    // Busca a sprite usando o índice de subpastas (assíncrono)
    async loadSpriteFromIndex(spriteId, onLoad, onError) {
        const index = await loadSpritesIndex();
        let img = new Image();
        let folder = index[spriteId] !== undefined ? index[spriteId] : '';
        let path = 'assets/sprites/';
        if (folder && folder.length > 0) {
            path += folder + '/';
        }
        path += spriteId + '.png';
        console.log(`[SpriteRenderer] Caminho para spriteId ${spriteId}: ${path}`);
        img.onload = () => {
            if (onLoad) onLoad(img);
        };
        img.onerror = () => {
            if (onError) onError();
        };
        img.src = path;
    }
    
    /**
     * Pré-carrega todas as sprites de players do SpritePlayerList
     * @returns {Promise<void>}
     */
    async preloadPlayerSprites() {
        try {
            const spritesToLoad = new Set();
            // Coleta todos os IDs únicos de sprites
            for (const lookType in SpritePlayerList) {
                const directions = SpritePlayerList[lookType];
                for (const direction in directions) {
                    const frames = directions[direction];
                    for (const frame of frames) {
                        for (const spriteId of frame) {
                            if (spriteId !== 0) {
                                spritesToLoad.add(spriteId);
                            }
                        }
                    }
                }
            }
            // Carrega todas as sprites usando o índice
            const loadPromises = Array.from(spritesToLoad).map(spriteId => {
                return new Promise((resolve) => {
                    this.loadSpriteFromIndex(
                        spriteId,
                        (img) => {
                            this.sprites.set(spriteId.toString(), img);
                            resolve();
                        },
                        () => {
                            // Falhou
                            console.warn(`[SpriteRenderer] Failed to load sprite: ${spriteId}.png`);
                            resolve();
                        }
                    );
                });
            });
            await Promise.all(loadPromises);
            console.log(`[SpriteRenderer] Loaded ${spritesToLoad.size} player sprites`);
        } catch (error) {
            console.warn('[SpriteRenderer] Error in preloadPlayerSprites:', error);
        }
    }
    
    renderEntity(entity, startX, startY) {
        // Usa posição renderizada se disponível (interpolada)
        const pos = entity.getRenderPosition ? entity.getRenderPosition() : {
            x: entity.x,
            y: entity.y,
            z: entity.z
        };
        
        // Calcula posição NA TELA (mesmo sistema que tiles)
        const screenPos = {
            x: (pos.x - startX) * this.tileSize,
            y: (pos.y - startY) * this.tileSize
        };
        
        // Se for player ou NPC, usa sistema de 3 sprites (lookaddons)
        if (entity.type === 'player' || entity.type === 'npc') {
            this.renderPlayer({
                ...entity,
                sprite: entity.lookaddons || entity.sprite || 'default'
            }, screenPos);
        } else {
            // Outras entidades usam sprite única
            const sprite = this.sprites.get(entity.sprite);
            if (sprite && sprite.complete) {
                this.ctx.drawImage(
                    sprite,
                    screenPos.x,
                    screenPos.y,
                    this.tileSize,
                    this.tileSize
                );
            } else {
                // Placeholder com indicador de movimento
                this.renderPlaceholder(entity, screenPos);
            }
        }
        
        // Indicador visual de predição (opcional)
        if (entity.isPredicting) {
            this.renderPredictionIndicator(screenPos);
        }
        
        // Renderiza nome
        if (entity.name) {
            this.renderName(entity.name, screenPos);
        }
    }
    
    renderPlayer(player, screenPos) {
        // Obtém as 3 sprites do frame atual
        const sprites = getPlayerSprites(
            player.sprite || 'default',
            player.direction || 'down',
            player.animationFrame || 0
        );
        let rendered = false;
        
        // Renderiza cada camada: [central, esquerda, acima]
        for (let i = 0; i < sprites.length; i++) {
            const spriteId = sprites[i];
            if (spriteId === 0) continue;
            const spriteImg = this.sprites.get(spriteId.toString());
            if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
                let posX = screenPos.x;
                let posY = screenPos.y;
                if (i === 1) {
                    posX -= this.tileSize;
                } else if (i === 2) {
                    posY -= this.tileSize;
                }
                this.ctx.drawImage(
                    spriteImg,
                    posX,
                    posY,
                    this.tileSize,
                    this.tileSize
                );
                rendered = true;
            } else if (!this.sprites.has(spriteId.toString())) {
                // Se não está no cache, tenta carregar na hora usando o índice
                this.loadSpriteFromIndex(
                    spriteId,
                    (img) => {
                        this.sprites.set(spriteId.toString(), img);
                        // Não redesenha agora, será desenhado no próximo frame
                    },
                    () => {
                        // Falhou, não faz nada
                    }
                );
            }
        }
        
        // Se nenhuma sprite foi renderizada, mostra placeholder
        if (!rendered) {
            this.renderPlaceholder(player, screenPos);
        }
    }
    
    renderPlaceholder(entity, screenPos) {
        const colors = {
            player: '#00ff00',
            npc: '#ffff00',
            monster: '#ff0000'
        };
        
        this.ctx.fillStyle = colors[entity.type] || '#ffffff';
        this.ctx.fillRect(
            screenPos.x + 8,
            screenPos.y + 8,
            this.tileSize - 16,
            this.tileSize - 16
        );
    }
    
    renderName(name, screenPos) {
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        const x = screenPos.x + this.tileSize / 2;
        const y = screenPos.y - 5;
        // Sombra preta mais sutil (contorno)
        this.ctx.save();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#000';
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx !== 0 || dy !== 0) {
                    this.ctx.strokeText(name, x + dx, y + dy);
                }
            }
        }
        this.ctx.restore();
        // Texto principal branco
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(name, x, y);
    }
    
    renderHealthBar(entity, screenPos) {
        const barWidth = this.tileSize;
        const barHeight = 4;
        const hpPercent = entity.hp / entity.maxHp;
        
        // Fundo
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(
            screenPos.x,
            screenPos.y + this.tileSize + 2,
            barWidth,
            barHeight
        );
        
        // HP atual
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(
            screenPos.x,
            screenPos.y + this.tileSize + 2,
            barWidth * hpPercent,
            barHeight
        );
    }
    
    renderPredictionIndicator(screenPos) {
        // Indicador sutil de predição (círculo semi-transparente)
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(
            screenPos.x + this.tileSize / 2,
            screenPos.y + this.tileSize / 2,
            this.tileSize / 2 - 2,
            0,
            Math.PI * 2
        );
        this.ctx.stroke();
        this.ctx.restore();
    }
}
