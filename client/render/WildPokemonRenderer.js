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

        for (const wildPokemon of wildPokemons.values()) {
            this.renderWildPokemon(ctx, wildPokemon, camera);
        }
    }

    /**
     * Renderiza um Pokémon selvagem individual
     * @param {CanvasRenderingContext2D} ctx - Contexto do canvas
     * @param {Object} wildPokemon - Dados do Pokémon
     * @param {Camera} camera - Câmera do jogo
     */
    renderWildPokemon(ctx, wildPokemon, camera) {
        // Calcula startX/startY do viewport (mesmo que TileRenderer)
        const viewport = camera.getViewport();
        const startX = Math.floor(viewport.x / 64);
        const startY = Math.floor(viewport.y / 64);
        
        // Calcula posição na tela (mesmo sistema que SpriteRenderer)
        const screenX = (wildPokemon.x - startX) * this.tileSize;
        const screenY = (wildPokemon.y - startY) * this.tileSize;

        // Não renderiza se estiver fora da tela
        if (!this.isOnScreen(screenX, screenY, ctx.canvas.width, ctx.canvas.height)) {
            return;
        }

        // 1. Renderiza sprite (quadrado preto temporário)
        this.renderSprite(ctx, screenX, screenY);

        // 2. Renderiza nome acima
        this.renderName(ctx, wildPokemon, screenX, screenY);

        // 3. Renderiza barra de HP abaixo do nome
        this.renderHealthBar(ctx, wildPokemon, screenX, screenY);
    }

    /**
     * Renderiza sprite temporária (quadrado preto)
     */
    renderSprite(ctx, screenX, screenY) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        
        // Borda branca para destacar
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
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

        // Sombra do texto
        ctx.fillStyle = '#000000';
        ctx.fillText(wildPokemon.name, centerX + 1, nameY + 1);

        // Texto principal
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
