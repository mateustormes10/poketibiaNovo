export class GuildRepository {
    constructor(database) {
        this.db = database;
    }
    
    // Guilds
    async findById(id) {
        const sql = 'SELECT * FROM guilds WHERE id = ?';
        return await this.db.queryOne(sql, [id]);
    }
    
    async findByName(name, worldId = 0) {
        const sql = 'SELECT * FROM guilds WHERE name = ? AND world_id = ?';
        return await this.db.queryOne(sql, [name, worldId]);
    }
    
    async create(guildData) {
        const sql = `
            INSERT INTO guilds (world_id, name, ownerid, creationdata, motd)
            VALUES (?, ?, ?, UNIX_TIMESTAMP(), ?)
        `;
        const id = await this.db.insert(sql, [
            guildData.world_id || 0,
            guildData.name,
            guildData.ownerid,
            guildData.motd || ''
        ]);
        return await this.findById(id);
    }
    
    async update(id, motd) {
        const sql = 'UPDATE guilds SET motd = ? WHERE id = ?';
        return await this.db.update(sql, [motd, id]);
    }
    
    async delete(id) {
        const sql = 'DELETE FROM guilds WHERE id = ?';
        return await this.db.delete(sql, [id]);
    }
    
    // Guild Ranks
    async findRanksByGuildId(guildId) {
        const sql = 'SELECT * FROM guild_ranks WHERE guild_id = ? ORDER BY level DESC';
        return await this.db.query(sql, [guildId]);
    }
    
    async createRank(guildId, name, level) {
        const sql = 'INSERT INTO guild_ranks (guild_id, name, level) VALUES (?, ?, ?)';
        return await this.db.insert(sql, [guildId, name, level]);
    }
    
    async deleteRank(id) {
        const sql = 'DELETE FROM guild_ranks WHERE id = ?';
        return await this.db.delete(sql, [id]);
    }
    
    // Guild Invites
    async findInvitesByGuildId(guildId) {
        const sql = 'SELECT * FROM guild_invites WHERE guild_id = ?';
        return await this.db.query(sql, [guildId]);
    }
    
    async createInvite(playerId, guildId) {
        const sql = 'INSERT INTO guild_invites (player_id, guild_id) VALUES (?, ?)';
        return await this.db.insert(sql, [playerId, guildId]);
    }
    
    async deleteInvite(playerId, guildId) {
        const sql = 'DELETE FROM guild_invites WHERE player_id = ? AND guild_id = ?';
        return await this.db.delete(sql, [playerId, guildId]);
    }
}
