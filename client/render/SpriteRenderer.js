import { GameConstants } from '../../shared/constants/GameConstants.js';

export class SpriteRenderer {
    constructor(ctx, camera) {
        this.ctx = ctx;
        this.camera = camera;
        this.tileSize = GameConstants.TILE_SIZE;
        this.sprites = new Map();
    }
    
    loadSprite(name, path) {
        const img = new Image();
        img.src = path;
        this.sprites.set(name, img);
        return img;
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
        
        // Renderiza sprite ou placeholder
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
        
        // Indicador visual de predição (opcional)
        if (entity.isPredicting) {
            this.renderPredictionIndicator(screenPos);
        }
        
        // Renderiza nome
        if (entity.name) {
            this.renderName(entity.name, screenPos);
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
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            name,
            screenPos.x + this.tileSize / 2,
            screenPos.y - 5
        );
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
