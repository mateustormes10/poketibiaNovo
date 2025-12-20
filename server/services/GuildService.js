import { GuildRepository } from '../persistence/GuildRepository.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('GuildService');

export class GuildService {
    constructor(database) {
        this.guildRepository = new GuildRepository(database);
    }
    
    async createGuild(name, ownerId, worldId = 0) {
        const existing = await this.guildRepository.findByName(name, worldId);
        if (existing) {
            throw new Error('Guild name already exists');
        }
        
        const guild = await this.guildRepository.create({
            name,
            ownerid: ownerId,
            world_id: worldId,
            motd: ''
        });
        
        // Cria ranks padrão
        await this.guildRepository.createRank(guild.id, 'Leader', 3);
        await this.guildRepository.createRank(guild.id, 'Vice-Leader', 2);
        await this.guildRepository.createRank(guild.id, 'Member', 1);
        
        logger.info(`Guild created: ${name} by player ${ownerId}`);
        return guild;
    }
    
    async getGuildById(guildId) {
        return await this.guildRepository.findById(guildId);
    }
    
    async updateMotd(guildId, motd) {
        await this.guildRepository.update(guildId, motd);
        logger.info(`Guild ${guildId} MOTD updated`);
    }
    
    async invitePlayer(playerId, guildId) {
        await this.guildRepository.createInvite(playerId, guildId);
        logger.info(`Player ${playerId} invited to guild ${guildId}`);
    }
    
    async acceptInvite(playerId, guildId) {
        await this.guildRepository.deleteInvite(playerId, guildId);
        logger.info(`Player ${playerId} joined guild ${guildId}`);
    }
    
    async deleteGuild(guildId) {
        await this.guildRepository.delete(guildId);
        logger.info(`Guild ${guildId} deleted`);
    }
}
