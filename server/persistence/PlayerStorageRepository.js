export class PlayerStorageRepository {
    constructor(database) {
        this.db = database;
    }
    
    async findByPlayerId(playerId) {
        const sql = 'SELECT * FROM player_storage WHERE player_id = ?';
        return await this.db.query(sql, [playerId]);
    }
    
    async findByKey(playerId, storageKey) {
        const sql = 'SELECT * FROM player_storage WHERE player_id = ? AND storage_key = ?';
        return await this.db.queryOne(sql, [playerId, storageKey]);
    }
    
    async getValue(playerId, storageKey) {
        const result = await this.findByKey(playerId, storageKey);
        return result ? result.value : null;
    }
    
    async set(playerId, storageKey, value) {
        const sql = `
            INSERT INTO player_storage (player_id, storage_key, value)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE value = ?
        `;
        return await this.db.insert(sql, [playerId, storageKey, value, value]);
    }
    
    async delete(playerId, storageKey) {
        const sql = 'DELETE FROM player_storage WHERE player_id = ? AND storage_key = ?';
        return await this.db.delete(sql, [playerId, storageKey]);
    }
    
    async clearAll(playerId) {
        const sql = 'DELETE FROM player_storage WHERE player_id = ?';
        return await this.db.delete(sql, [playerId]);
    }
}
