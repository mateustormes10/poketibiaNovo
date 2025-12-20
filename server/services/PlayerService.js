import { PlayerRepository } from '../persistence/PlayerRepository.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('PlayerService');

export class PlayerService {
    constructor(database) {
        this.playerRepository = new PlayerRepository(database);
    }
    
    async createPlayer(playerData) {
        try {
            const player = await this.playerRepository.create(playerData);
            logger.info(`Player created: ${player.name}`);
            return player;
        } catch (error) {
            logger.error('Error creating player:', error);
            throw error;
        }
    }
    
    async loadPlayer(playerId) {
        try {
            const player = await this.playerRepository.findById(playerId);
            return player;
        } catch (error) {
            logger.error('Error loading player:', error);
            throw error;
        }
    }
    
    async savePlayer(player) {
        try {
            await this.playerRepository.save(player);
            logger.info(`Player saved: ${player.name}`);
        } catch (error) {
            logger.error('Error saving player:', error);
            throw error;
        }
    }
}
