export class GuildRepository {
    constructor(database) {
        this.db = database;
    }

    async ensureTables() {
        await this.db.query(`
            CREATE TABLE IF NOT EXISTS guilds (
                id INT AUTO_INCREMENT PRIMARY KEY,
                world_id INT NOT NULL DEFAULT 0,
                name VARCHAR(255) NOT NULL,
                ownerid INT NOT NULL,
                creationdata INT NOT NULL,
                motd VARCHAR(255) NOT NULL DEFAULT '',
                UNIQUE KEY uk_guild (name, world_id),
                FOREIGN KEY (ownerid) REFERENCES players(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await this.db.query(`
            CREATE TABLE IF NOT EXISTS guild_invites (
                player_id INT NOT NULL,
                guild_id INT NOT NULL,
                PRIMARY KEY (player_id, guild_id),
                FOREIGN KEY (player_id) REFERENCES players(id),
                FOREIGN KEY (guild_id) REFERENCES guilds(id)
            ) ENGINE=InnoDB;
        `);

        await this.db.query(`
            CREATE TABLE IF NOT EXISTS guild_ranks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                level INT NOT NULL,
                FOREIGN KEY (guild_id) REFERENCES guilds(id)
            ) ENGINE=InnoDB;
        `);
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

    async listByWorld(worldId = 0) {
        const sql = `
            SELECT
                g.id,
                g.world_id,
                g.name,
                g.ownerid,
                g.motd,
                p.name AS owner_name,
                (
                    SELECT COUNT(*)
                    FROM players pl
                    JOIN guild_ranks gr ON gr.id = pl.rank_id
                    WHERE gr.guild_id = g.id AND pl.deleted = 0
                ) AS member_count
            FROM guilds g
            JOIN players p ON p.id = g.ownerid
            WHERE g.world_id = ?
            ORDER BY g.name ASC
        `;
        return await this.db.query(sql, [worldId]);
    }

    async getGuildMembers(guildId) {
        const sql = `
            SELECT
                pl.id AS player_id,
                pl.name AS player_name,
                pl.level,
                pl.online,
                pl.guildnick,
                gr.id AS rank_id,
                gr.name AS rank_name,
                gr.level AS rank_level
            FROM players pl
            JOIN guild_ranks gr ON gr.id = pl.rank_id
            WHERE gr.guild_id = ? AND pl.deleted = 0
            ORDER BY gr.level DESC, pl.name ASC
        `;
        return await this.db.query(sql, [guildId]);
    }

    async getPlayerGuild(playerId) {
        const sql = `
            SELECT
                g.id AS guild_id,
                g.world_id,
                g.name AS guild_name,
                g.ownerid,
                g.motd,
                gr.id AS rank_id,
                gr.name AS rank_name,
                gr.level AS rank_level
            FROM players pl
            JOIN guild_ranks gr ON gr.id = pl.rank_id
            JOIN guilds g ON g.id = gr.guild_id
            WHERE pl.id = ? AND pl.deleted = 0
            LIMIT 1
        `;
        return await this.db.queryOne(sql, [playerId]);
    }

    async findRankById(rankId) {
        const sql = 'SELECT * FROM guild_ranks WHERE id = ?';
        return await this.db.queryOne(sql, [rankId]);
    }

    async findRankByGuildAndLevel(guildId, level) {
        const sql = 'SELECT * FROM guild_ranks WHERE guild_id = ? AND level = ? ORDER BY id ASC LIMIT 1';
        return await this.db.queryOne(sql, [guildId, level]);
    }

    async findInvite(playerId, guildId) {
        const sql = 'SELECT * FROM guild_invites WHERE player_id = ? AND guild_id = ?';
        return await this.db.queryOne(sql, [playerId, guildId]);
    }

    async findInvitesDetailedByGuildId(guildId) {
        const sql = `
            SELECT
                gi.player_id,
                gi.guild_id,
                p.name AS player_name,
                p.level AS player_level
            FROM guild_invites gi
            JOIN players p ON p.id = gi.player_id
            WHERE gi.guild_id = ?
            ORDER BY p.level DESC, p.name ASC
        `;
        return await this.db.query(sql, [guildId]);
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
