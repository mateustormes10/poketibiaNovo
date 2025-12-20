import { Logger } from '../utils/Logger.js';

const logger = new Logger('SaveService');

export class SaveService {
    constructor(gameWorld, interval = 60000) {
        this.gameWorld = gameWorld;
        this.interval = interval;
        this.timer = null;
    }
    
    start() {
        logger.info(`Auto-save started (interval: ${this.interval}ms)`);
        
        this.timer = setInterval(() => {
            this.saveAll();
        }, this.interval);
    }
    
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        logger.info('Auto-save stopped');
    }
    
    async saveAll() {
        logger.info('Saving all players...');
        
        let saved = 0;
        for (const player of this.gameWorld.players.values()) {
            try {
                await this.savePlayer(player);
                saved++;
            } catch (error) {
                logger.error(`Error saving player ${player.id}:`, error);
            }
        }
        
        logger.info(`Saved ${saved} players`);
    }
    
    async savePlayer(player) {
        // Implementar salvamento do player
        return true;
    }
}
