export class PlayerDeathRepository {
    constructor(database) {
        this.db = database;
    }
    
    async findById(id) {
        const sql = 'SELECT * FROM player_deaths WHERE id = ?';
        return await this.db.queryOne(sql, [id]);
    }
    
    async findByPlayerId(playerId, limit = 10) {
        const sql = `
            SELECT * FROM player_deaths 
            WHERE player_id = ? 
            ORDER BY date DESC 
            LIMIT ?
        `;
        return await this.db.query(sql, [playerId, limit]);
    }
    
    async create(playerId, level) {
        const sql = `
            INSERT INTO player_deaths (player_id, date, level)
            VALUES (?, UNIX_TIMESTAMP(), ?)
        `;
        const id = await this.db.insert(sql, [playerId, level]);
        return await this.findById(id);
    }
    
    async delete(id) {
        const sql = 'DELETE FROM player_deaths WHERE id = ?';
        return await this.db.delete(sql, [id]);
    }
    
    // Killers
    async createKiller(deathId, finalHit = 0, unjustified = 0) {
        const sql = `
            INSERT INTO killers (death_id, final_hit, unjustified)
            VALUES (?, ?, ?)
        `;
        return await this.db.insert(sql, [deathId, finalHit, unjustified]);
    }
    
    async findKillersByDeathId(deathId) {
        const sql = 'SELECT * FROM killers WHERE death_id = ?';
        return await this.db.query(sql, [deathId]);
    }
    
    // Environment Killers (mortes por ambiente, não por player)
    async createEnvironmentKiller(killId, name) {
        const sql = 'INSERT INTO environment_killers (kill_id, name) VALUES (?, ?)';
        return await this.db.insert(sql, [killId, name]);
    }
    
    async getPlayerDeathHistory(playerId, limit = 10) {
        const sql = `
            SELECT pd.*, k.final_hit, ek.name as killer_name
            FROM player_deaths pd
            LEFT JOIN killers k ON pd.id = k.death_id
            LEFT JOIN environment_killers ek ON k.id = ek.kill_id
            WHERE pd.player_id = ?
            ORDER BY pd.date DESC
            LIMIT ?
        `;
        return await this.db.query(sql, [playerId, limit]);
    }
}
