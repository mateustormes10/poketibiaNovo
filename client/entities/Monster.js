export class Monster {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        
        // Posição autoritativa
        this.x = data.x;
        this.y = data.y;
        this.z = data.z;
        
        // Posição renderizada
        this.renderX = data.x;
        this.renderY = data.y;
        this.prevX = data.x;
        this.prevY = data.y;
        
        // Interpolação
        this.moveProgress = 1;
        this.moveSpeed = 0.3;
        this.isMoving = false;
        
        this.hp = data.hp;
        this.maxHp = data.maxHp;
        this.level = data.level;
        this.sprite = data.sprite || 'monster';
        this.hostile = data.hostile !== false;
        this.direction = data.direction || 'down';
        
        // Animação
        this.animationFrame = 0;
        this.animationTime = 0;
        this.animationSpeed = 0.2;
    }
    
    update(data) {
        if (data.hp !== undefined) {
            this.hp = data.hp;
            this.isDead = this.hp <= 0;
        }
        if (data.maxHp !== undefined) this.maxHp = data.maxHp;
        if (data.direction !== undefined) this.direction = data.direction;

        if (data.x !== undefined && data.y !== undefined) {
            if (data.x !== this.x || data.y !== this.y) {
                this.startMove(data.x, data.y);
            }
        }

        if (data.z !== undefined) this.z = data.z;
    }
    
    startMove(newX, newY) {
        this.prevX = this.x;
        this.prevY = this.y;
        this.x = newX;
        this.y = newY;
        this.moveProgress = 0;
        this.isMoving = true;
    }
    
    interpolate(deltaTime) {
        if (this.isMoving && this.moveProgress < 1) {
            this.moveProgress += deltaTime / this.moveSpeed;
            
            if (this.moveProgress >= 1) {
                this.moveProgress = 1;
                this.isMoving = false;
                this.renderX = this.x;
                this.renderY = this.y;
            } else {
                const t = this.easeOutCubic(this.moveProgress);
                this.renderX = this.prevX + (this.x - this.prevX) * t;
                this.renderY = this.prevY + (this.y - this.prevY) * t;
            }
        }
        
        if (this.isMoving) {
            this.animationTime += deltaTime;
            if (this.animationTime >= this.animationSpeed) {
                this.animationTime = 0;
                this.animationFrame = (this.animationFrame + 1) % 4;
            }
        }
    }
    
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    getRenderPosition() {
        return {
            x: this.renderX,
            y: this.renderY,
            z: this.z
        };
    }
}
