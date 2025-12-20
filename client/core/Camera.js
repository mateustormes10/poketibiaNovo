export class Camera {
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
        
        const targetX = pos.x * this.tileSize - this.width / 2;
        const targetY = pos.y * this.tileSize - this.height / 2;
        
        if (this.smooth) {
            // Suavização da câmera (segue o player interpolado)
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
