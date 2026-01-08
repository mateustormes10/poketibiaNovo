import { TickManager } from './TickManager.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('GameLoop');

export class GameLoop {
    constructor(gameWorld, tickRate = 10) {
        this.gameWorld = gameWorld;
        this.tickRate = tickRate;
        this.tickDuration = 1000 / tickRate;
        this.running = false;
        this.tickManager = new TickManager();
    }
    
    start() {
        if (this.running) return;
        
        this.running = true;
        this.lastTickTime = Date.now();
        logger.info(`Game loop started (tick: ${this.tickRate} TPS, ${this.tickDuration}ms)`);
        this.loop();
    }
    
    loop() {
        if (!this.running) return;
        const now = Date.now();
        const deltaTime = (now - this.lastTickTime) / 1000;
        this.lastTickTime = now;
        this.update(deltaTime);
        const elapsed = Date.now() - now;
        const sleepTime = Math.max(0, this.tickDuration - elapsed);
        setTimeout(() => this.loop(), sleepTime);
    }
    
    update(deltaTime) {
        // Tick do servidor: processa lógica, resolve colisões, atualiza entidades
        this.tickManager.tick(deltaTime);
        this.gameWorld.update(deltaTime);
        // O envio de deltas para os clientes é feito por evento, não por polling fixo
    }
    
    stop() {
        this.running = false;
        logger.info('Game loop stopped');
    }
}
