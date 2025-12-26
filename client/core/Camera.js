export class Camera {
        /**
         * Converte coordenada X do mundo para tela
         */
        worldToScreenX(worldX) {
            return worldX * this.tileSize - this.x;
        }

        /**
         * Converte coordenada Y do mundo para tela
         */
        worldToScreenY(worldY) {
            return worldY * this.tileSize - this.y;
        }
    constructor(config) {
        this.x = 0;
        this.y = 0;
        this.z = 1;
        this.width = config.width;
        this.height = config.height;
        this.tileSize = config.tileSize || 64;
        this.smooth = config.smooth !== false;
        this.followSpeed = config.followSpeed || 5;
    }
    
    update(target) {
        if (!target) return;
        
        // Usa posição renderizada (interpolada) para câmera suave
        const pos = target.getRenderPosition ? target.getRenderPosition() : target;

        // Centraliza a câmera no centro do tile do player, alinhando sempre ao grid
        const centerTileX = Math.round(pos.x);
        const centerTileY = Math.round(pos.y);
        const targetX = centerTileX * this.tileSize - Math.floor(this.width / 2) + Math.floor(this.tileSize / 2);
        const targetY = centerTileY * this.tileSize - Math.floor(this.height / 2) + Math.floor(this.tileSize / 2);

        if (this.smooth) {
            this.x += (targetX - this.x) * 0.15;
            this.y += (targetY - this.y) * 0.15;
        } else {
            this.x = targetX;
            this.y = targetY;
        }

        this.z = pos.z || target.z || 1;
    }
    
    worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.tileSize - this.x,
            y: worldY * this.tileSize - this.y
        };
    }
    
    screenToWorld(screenX, screenY) {
        return {
            x: Math.floor((screenX + this.x) / this.tileSize),
            y: Math.floor((screenY + this.y) / this.tileSize)
        };
    }
    
    /**
     * Aplica transformação da câmera ao contexto do canvas
     */
    apply(ctx) {
        ctx.translate(-this.x, -this.y);
    }
    
    /**
     * Obtém viewport atual da câmera
     */
    getViewport() {
        return {
            x: this.x,
            y: this.y,
            z: this.z,
            width: this.width,
            height: this.height
        };
    }
}
