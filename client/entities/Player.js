export class Player {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        // ...existing code...
        this.x = data.x;
        this.y = data.y;
        this.z = data.z;
        this.renderX = data.x;
        this.renderY = data.y;
        this.prevX = data.x;
        this.prevY = data.y;
        this.moveProgress = 1;
        this.moveSpeed = 0.08; // 0.08s por tile (~200ms)
        this.isMoving = false;
        this.predictedDirection = null;
        this.predictionStartTime = 0;
        this.isPredicting = false;
        this.hp = data.hp;
        this.maxHp = data.maxHp;
        this.level = data.level;
        this.vocation = data.vocation || 0;
        this.sprite = data.sprite || 'default';
        this.direction = data.direction || 'down';
        this.pokemons = data.pokemons || [];
        this.goldCoin = data.goldCoin || 0;
        this.type = 'player';
        this.animationFrame = 0;
        this.animationTime = 0;
        this.animationSpeed = 0.15;
    }
    
    update(data) {
        // Atualiza dados básicos
        if (data.hp !== undefined) this.hp = data.hp;
        if (data.maxHp !== undefined) this.maxHp = data.maxHp;
        if (data.level !== undefined) this.level = data.level;
        if (data.vocation !== undefined) this.vocation = data.vocation;
        if (data.sprite !== undefined) this.sprite = data.sprite;
        if (data.direction !== undefined) this.direction = data.direction;
        if (data.pokemons !== undefined) {
            this.pokemons = data.pokemons;
            console.log(`[Player] Updated pokemons for ${this.name}:`, this.pokemons);
        }
        
        // Se a posição mudou, inicia interpolação
        if (data.x !== undefined && data.y !== undefined) {
            if (data.x !== this.x || data.y !== this.y) {
                this.startMove(data.x, data.y);
            }
        }
        
        if (data.z !== undefined) {
            this.z = data.z;
            // Força requisição de mapa do novo andar imediatamente
            setTimeout(() => {
                if (window.game && window.game.wsClient) {
                    window.game.requestMapUpdate && window.game.requestMapUpdate();
                    console.log(`[Player] z atualizado para ${this.z}, requisitando novo mapa imediatamente...`);
                }
            }, 50); // pequeno delay para garantir que z foi atualizado
        }
    }
    
    startMove(newX, newY) {
        // Guarda posição anterior
        this.prevX = this.x;
        this.prevY = this.y;
        
        // Atualiza posição autoritativa
        this.x = newX;
        this.y = newY;
        
        // Reseta progresso de movimento
        this.moveProgress = 0;
        this.isMoving = true;
        
        // Cancela predição se estava ativa
        this.isPredicting = false;
    }
    
    interpolate(deltaTime) {
        // Interpolação de movimento
        if (this.isMoving && this.moveProgress < 1) {
            this.moveProgress += deltaTime / this.moveSpeed;
            
            if (this.moveProgress >= 1) {
                this.moveProgress = 1;
                this.isMoving = false;
                this.renderX = this.x;
                this.renderY = this.y;
            } else {
                // Interpolação suave (ease-out)
                const t = this.easeOutCubic(this.moveProgress);
                this.renderX = this.prevX + (this.x - this.prevX) * t;
                this.renderY = this.prevY + (this.y - this.prevY) * t;
            }
        }
        
        // Atualiza animação de sprite
        this.updateAnimation(deltaTime);
    }
    
    updateAnimation(deltaTime) {
        // Só anima se estiver se movendo ou predizendo
        if (this.isMoving || this.isPredicting) {
            this.animationTime += deltaTime;
            if (this.animationTime >= this.animationSpeed) {
                this.animationTime = 0;
                // Ciclo de 3 frames: 0 -> 1 -> 2
                this.animationFrame = (this.animationFrame + 1) % 3;
            }
        } else {
            // Parado usa frame 0
            this.animationFrame = 0;
            this.animationTime = 0;
        }
    }
    
    // Predição visual de animação (não de posição!)
    startPrediction(direction) {
        this.predictedDirection = direction;
        this.isPredicting = true;
        this.predictionStartTime = performance.now();
        this.direction = direction;
    }
    
    cancelPrediction() {
        this.isPredicting = false;
        this.predictedDirection = null;
    }
    
    // Função de suavização (ease-out cubic)
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
