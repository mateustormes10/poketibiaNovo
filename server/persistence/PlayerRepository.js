import { Logger } from '../utils/Logger.js';

const logger = new Logger('PlayerRepository');

export class PlayerRepository {
	constructor(database) {
		this.db = database;
	}

    async setRankId(id, rankId) {
        const sql = 'UPDATE players SET rank_id = ? WHERE id = ?';
        return await this.db.update(sql, [rankId ?? 0, id]);
    }

    async setGuildNick(id, guildnick) {
        const sql = 'UPDATE players SET guildnick = ? WHERE id = ?';
        return await this.db.update(sql, [guildnick ?? '', id]);
    }

	async updateTownId(id, townId) {
		logger.debug(`updateTownId called: id=${id}, townId=${townId}`);
		const sql = 'UPDATE players SET town_id = ? WHERE id = ?';
		const result = await this.db.update(sql, [townId, id]);
		logger.debug('updateTownId result:', result);
		return result;
	}
    
    async findById(id) {
        const sql = 'SELECT * FROM players WHERE id = ?';
        const player = await this.db.queryOne(sql, [id]);
        if (player && player.conditions) {
            try {
                player.conditions = JSON.parse(player.conditions.toString());
            } catch (e) {
                player.conditions = {};
            }
        } else {
            player.conditions = {};
        }
        return player;
    }
    
    async findByName(name) {
        const sql = 'SELECT * FROM players WHERE name = ? AND deleted = 0';
        return await this.db.queryOne(sql, [name]);
    }
    
    async findByAccountId(accountId) {
        const sql = 'SELECT * FROM players WHERE account_id = ? AND deleted = 0';
        return await this.db.query(sql, [accountId]);
    }
    
    async create(playerData) {
        const sql = `
            INSERT INTO players (
                name, account_id, group_id, town_id,
                posx, posy, posz,
                health, healthmax, mana, manamax,
                level, vocation, sex, looktype, conditions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const id = await this.db.insert(sql, [
            playerData.name,
            playerData.account_id,
            playerData.group_id || 1,
            playerData.town_id || 1,
            playerData.posx || 0,
            playerData.posy || 0,
            playerData.posz || 0,
            playerData.health || 100,
            playerData.healthmax || 100,
            playerData.mana || 100,
            playerData.manamax || 100,
            playerData.level || 1,
            playerData.vocation || 0,
            playerData.sex || 0,
            playerData.looktype || 136,
            JSON.stringify(playerData.conditions || {})
        ]);
        return await this.findById(id);
    }
    
    async update(id, playerData) {
        const sql = `
            UPDATE players SET
                posx = ?, posy = ?, posz = ?,
                health = ?, mana = ?,
                level = ?, experience = ?,
                lastlogin = UNIX_TIMESTAMP(),
                direction = ?,
                lookaddons = ?,
                conditions = ?
            WHERE id = ?
        `;
        await this.db.update(sql, [
            playerData.x,
            playerData.y,
            playerData.z,
            playerData.hp,
            playerData.mp,
            playerData.level,
            playerData.exp,
            playerData.direction || 2,
            playerData.sprite || 'default',
            JSON.stringify(playerData.conditions || {}),
            id
        ]);
        return await this.findById(id);
    }
    
    async updatePosition(id, x, y, z) {
        const sql = 'UPDATE players SET posx = ?, posy = ?, posz = ? WHERE id = ?';
        return await this.db.update(sql, [x, y, z, id]);
    }
    
    async updateHealth(id, health, mana) {
        const sql = 'UPDATE players SET health = ?, mana = ? WHERE id = ?';
        return await this.db.update(sql, [health, mana, id]);
    }
    
    async setOnline(id, online) {
        const sql = 'UPDATE players SET online = ? WHERE id = ?';
        return await this.db.update(sql, [online ? 1 : 0, id]);
    }
    
    async setLastLogout(id) {
        const sql = 'UPDATE players SET lastlogout = UNIX_TIMESTAMP(), online = 0 WHERE id = ?';
        return await this.db.update(sql, [id]);
    }
    
    async delete(id) {
        const sql = 'UPDATE players SET deleted = 1 WHERE id = ?';
        return await this.db.update(sql, [id]);
    }
    
    async getOnlinePlayers() {
        const sql = 'SELECT * FROM players WHERE online = 1';
        return await this.db.query(sql);
    }
    
    async updatePlayerOutfitAndDirection(id, lookaddons, direction) {
        const sql = 'UPDATE players SET lookaddons = ?, direction = ? WHERE id = ?';
        return await this.db.update(sql, [lookaddons, direction, id]);
    }
}

