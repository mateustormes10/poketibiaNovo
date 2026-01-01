/**
 * WildPokemonRenderer
 * 
 * Renderiza Pokémon selvagens no mapa
 * - Nome acima
 * - Barra de HP colorida (verde/amarelo/vermelho)
 * - Sprite temporária (quadrado preto 64x64)
 */

import { Camera } from '../core/Camera.js';

export class WildPokemonRenderer {
    constructor() {
        this.tileSize = 64; // Tamanho do tile
        this.sprites = new Map(); // Cache de imagens
    }

    /**
     * Renderiza todos os Pokémon selvagens
     * @param {CanvasRenderingContext2D} ctx - Contexto do canvas
     * @param {Map} wildPokemons - Mapa de Pokémon selvagens
     * @param {Camera} camera - Câmera do jogo
     */
    render(ctx, wildPokemons, camera) {
        if (!wildPokemons || wildPokemons.size === 0) {
            return;
        }

        let rendered = 0;
        for (const wildPokemon of wildPokemons.values()) {
            this.renderWildPokemon(ctx, wildPokemon, camera);
            rendered++;
        }
    
    }

    /**
     * Renderiza um Pokémon selvagem individual
     * @param {CanvasRenderingContext2D} ctx - Contexto do canvas
     * @param {Object} wildPokemon - Dados do Pokémon
     * @param {Camera} camera - Câmera do jogo
     */
    async renderWildPokemon(ctx, wildPokemon, camera) {
        // ...posição e checagem de tela...
        const viewport = camera.getViewport();
        const startX = Math.floor(viewport.x / 64);
        const startY = Math.floor(viewport.y / 64);
        const screenX = (wildPokemon.x - startX) * this.tileSize;
        const screenY = (wildPokemon.y - startY) * this.tileSize;
        if (!this.isOnScreen(screenX, screenY, ctx.canvas.width, ctx.canvas.height)) return;

        // 1. Renderiza spriteDead se morto, senão normal
        let rendered = false;
        if (wildPokemon.isDead && Array.isArray(wildPokemon.spriteDead)) {
            // Renderiza spriteDead nas posições corretas:
            // [0] central, [1] esquerda, [2] cima, [3] diagonal cima-esquerda
            if (wildPokemon.spriteDead[0]) rendered |= await this.renderSpriteImage(ctx, wildPokemon.spriteDead[0], screenX, screenY); // central
            if (wildPokemon.spriteDead[1]) rendered |= await this.renderSpriteImage(ctx, wildPokemon.spriteDead[1], screenX - this.tileSize, screenY); // esquerda
            if (wildPokemon.spriteDead[2]) rendered |= await this.renderSpriteImage(ctx, wildPokemon.spriteDead[2], screenX, screenY - this.tileSize); // cima
            if (wildPokemon.spriteDead[3]) rendered |= await this.renderSpriteImage(ctx, wildPokemon.spriteDead[3], screenX - this.tileSize, screenY - this.tileSize); // diagonal cima-esquerda
        } else {
            const spritesArr = this.getSpritesForDirection(wildPokemon);
            if (Array.isArray(spritesArr) && spritesArr.length > 0 && spritesArr[0]) {
                // Central
                rendered |= await this.renderSpriteImage(ctx, spritesArr[0], screenX, screenY);
                // Esquerda da central
                if (spritesArr[1]) rendered |= await this.renderSpriteImage(ctx, spritesArr[1], screenX - this.tileSize, screenY);
                // Acima da central
                if (spritesArr[2]) rendered |= await this.renderSpriteImage(ctx, spritesArr[2], screenX, screenY - this.tileSize);
                // Diagonal (acima e esquerda)
                if (spritesArr[3]) rendered |= await this.renderSpriteImage(ctx, spritesArr[3], screenX - this.tileSize, screenY - this.tileSize);
            }
        }
        if (!rendered) this.renderSpritePlaceholder(ctx, screenX, screenY);

        // 2. Renderiza nome e barra de HP apenas se não estiver morto e não for ghost
        if (!wildPokemon.isDead && !wildPokemon._noNameBar) {
            this.renderName(ctx, wildPokemon, screenX, screenY);
            this.renderHealthBar(ctx, wildPokemon, screenX, screenY);
        }
    }

    /**
     * Renderiza sprite temporária (quadrado preto)
     */
    renderSpritePlaceholder(ctx, screenX, screenY) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        // Borda branca para destacar
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
    }

    getSpritesForDirection(wildPokemon) {
        // Decide qual array usar baseado na direção
        const dir = (wildPokemon.direction || 'down').toLowerCase();
        if (dir === 'up' && Array.isArray(wildPokemon.sprite_up)) return wildPokemon.sprite_up;
        if (dir === 'down' && Array.isArray(wildPokemon.sprite_down)) return wildPokemon.sprite_down;
        if (dir === 'left' && Array.isArray(wildPokemon.sprite_left)) return wildPokemon.sprite_left;
        if (dir === 'right' && Array.isArray(wildPokemon.sprite_right)) return wildPokemon.sprite_right;
        // Fallback: qualquer array disponível
        if (Array.isArray(wildPokemon.sprite_down)) return wildPokemon.sprite_down;
        if (Array.isArray(wildPokemon.sprite_up)) return wildPokemon.sprite_up;
        if (Array.isArray(wildPokemon.sprite_left)) return wildPokemon.sprite_left;
        if (Array.isArray(wildPokemon.sprite_right)) return wildPokemon.sprite_right;
        return null;
    }

    async renderSpriteImage(ctx, spriteId, screenX, screenY) {
        if (!spriteId) return false;
        const spriteKey = String(spriteId);
        let img = this.sprites.get(spriteKey);
        if (!img) {
            // Corrige caminho: se for spriteDead, tira o 'pokemons/'
            let path = '';
            if (spriteKey.startsWith('pokemon_dead/')) {
                path = `assets/sprites/${spriteKey}.png`;
            } else {
                path = `assets/sprites/pokemons/${spriteKey}.png`;
            }
            img = await this.loadSpriteWithPath(spriteKey, path);
            if (img) {
                this.sprites.set(spriteKey, img);
                console.log(`[WildPokemonRenderer] Sprite carregada: ${path}`);
            } else {
                console.warn(`[WildPokemonRenderer] Falha ao carregar sprite: ${path}`);
            }
        }
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, screenX, screenY, this.tileSize, this.tileSize);
            return true;
        }
        return false;
    }

    async loadSpriteWithPath(spriteKey, path) {
        return new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = path;
        });
    }

    loadSprite(spriteId) {
        return new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = `assets/sprites/pokemons/${String(spriteId)}.png`;
        });
    }

    /**
     * Renderiza nome do Pokémon
     */
    renderName(ctx, wildPokemon, screenX, screenY) {
        const centerX = screenX + this.tileSize / 2;
        const nameY = screenY - 25; // Acima do sprite

        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Sombra preta mais sutil (contorno)
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx !== 0 || dy !== 0) {
                    ctx.strokeText(wildPokemon.name, centerX + dx, nameY + dy);
                }
            }
        }
        ctx.restore();

        // Texto principal branco
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(wildPokemon.name, centerX, nameY);
    }

    /**
     * Renderiza barra de HP colorida
     */
    renderHealthBar(ctx, wildPokemon, screenX, screenY) {
        const barWidth = this.tileSize - 10;
        const barHeight = 8;
        const barX = screenX + 5;
        const barY = screenY - 10; // Logo abaixo do nome

        const hpPercent = wildPokemon.hp / wildPokemon.maxHp;

        // Determina cor baseado no HP
        let barColor;
        if (hpPercent > 0.6) {
            barColor = '#00FF00'; // Verde
        } else if (hpPercent > 0.3) {
            barColor = '#FFFF00'; // Amarelo
        } else {
            barColor = '#FF0000'; // Vermelho
        }

        // Fundo da barra (preto)
        ctx.fillStyle = '#000000';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Barra de HP colorida
        ctx.fillStyle = barColor;
        const currentBarWidth = barWidth * hpPercent;
        ctx.fillRect(barX, barY, currentBarWidth, barHeight);

        // Borda da barra
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Texto de HP (opcional)
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        const hpText = `${wildPokemon.hp}/${wildPokemon.maxHp}`;
        ctx.fillText(hpText, barX + barWidth / 2, barY + barHeight / 2 + 1);
    }

    /**
     * Verifica se está na tela
     */
    isOnScreen(x, y, canvasWidth, canvasHeight) {
        const margin = this.tileSize * 2;
        return (
            x > -margin &&
            x < canvasWidth + margin &&
            y > -margin &&
            y < canvasHeight + margin
        );
    }
}
