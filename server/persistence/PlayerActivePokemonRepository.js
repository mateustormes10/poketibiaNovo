export class PlayerActivePokemonRepository {
    constructor(database) {
        this.db = database;
    }
    
    async findByPlayerId(playerId) {
        const sql = `SELECT * FROM player_active_monsters WHERE player_id = ? ORDER BY slot`;
        return await this.db.query(sql, [playerId]);
    }
    
    async findByPlayerIdAndSlot(playerId, slot) {
        const sql = `SELECT * FROM player_active_monsters WHERE player_id = ? AND slot = ?`;
        return await this.db.queryOne(sql, [playerId, slot]);
    }
    
    async addToSlot(playerId, pokemonName, slot, nickname = null) {
        const sql = `
            INSERT INTO player_active_monsters (player_id, pokemon_id, slot, nickname, x, y, direction)
            VALUES (?, ?, ?, ?, 0, 0, 'down')
            ON DUPLICATE KEY UPDATE pokemon_id = ?, nickname = ?
        `;
        await this.db.insert(sql, [playerId, pokemonName, slot, nickname, pokemonName, nickname]);
        return await this.findByPlayerIdAndSlot(playerId, slot);
    }
    
    async updatePosition(playerId, slot, x, y) {
        const sql = 'UPDATE player_active_monsters SET x = ?, y = ? WHERE player_id = ? AND slot = ?';
        return await this.db.update(sql, [x, y, playerId, slot]);
    }
    
    async updateDirection(playerId, slot, direction) {
        const sql = 'UPDATE player_active_monsters SET direction = ? WHERE player_id = ? AND slot = ?';
        return await this.db.update(sql, [direction, playerId, slot]);
    }
    
    async removeFromSlot(playerId, slot) {
        const sql = 'DELETE FROM player_active_monsters WHERE player_id = ? AND slot = ?';
        return await this.db.delete(sql, [playerId, slot]);
    }
    
    async clearAll(playerId) {
        const sql = 'DELETE FROM player_active_monsters WHERE player_id = ?';
        return await this.db.delete(sql, [playerId]);
    }
    
    async swapSlots(playerId, slot1, slot2) {
        // Swap temporário usando slot negativo
        const sql1 = 'UPDATE player_active_monsters SET slot = -1 WHERE player_id = ? AND slot = ?';
        const sql2 = 'UPDATE player_active_monsters SET slot = ? WHERE player_id = ? AND slot = ?';
        const sql3 = 'UPDATE player_active_monsters SET slot = ? WHERE player_id = ? AND slot = -1';
        
        await this.db.update(sql1, [playerId, slot1]);
        await this.db.update(sql2, [slot1, playerId, slot2]);
        await this.db.update(sql3, [slot2, playerId]);
    }
}
