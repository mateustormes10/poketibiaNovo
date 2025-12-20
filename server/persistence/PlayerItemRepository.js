export class PlayerItemRepository {
    constructor(database) {
        this.db = database;
    }
    
    // Player Items (Inventário)
    async findItemsByPlayerId(playerId) {
        const sql = 'SELECT * FROM player_items WHERE player_id = ? ORDER BY sid';
        return await this.db.query(sql, [playerId]);
    }
    
    async addItem(playerId, itemData) {
        const sql = `
            INSERT INTO player_items (player_id, sid, pid, itemtype, count, attributes)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await this.db.insert(sql, [
            playerId,
            itemData.sid,
            itemData.pid || 0,
            itemData.itemtype,
            itemData.count || 1,
            itemData.attributes || Buffer.from('')
        ]);
    }
    
    async updateItem(playerId, sid, count) {
        const sql = 'UPDATE player_items SET count = ? WHERE player_id = ? AND sid = ?';
        return await this.db.update(sql, [count, playerId, sid]);
    }
    
    async removeItem(playerId, sid) {
        const sql = 'DELETE FROM player_items WHERE player_id = ? AND sid = ?';
        return await this.db.delete(sql, [playerId, sid]);
    }
    
    async clearItems(playerId) {
        const sql = 'DELETE FROM player_items WHERE player_id = ?';
        return await this.db.delete(sql, [playerId]);
    }
    
    // Depot Items (Banco)
    async findDepotItemsByPlayerId(playerId) {
        const sql = 'SELECT * FROM player_depotitems WHERE player_id = ? ORDER BY sid';
        return await this.db.query(sql, [playerId]);
    }
    
    async addDepotItem(playerId, itemData) {
        const sql = `
            INSERT INTO player_depotitems (player_id, sid, pid, itemtype, count, attributes)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await this.db.insert(sql, [
            playerId,
            itemData.sid,
            itemData.pid || 0,
            itemData.itemtype,
            itemData.count || 1,
            itemData.attributes || Buffer.from('')
        ]);
    }
    
    async removeDepotItem(playerId, sid) {
        const sql = 'DELETE FROM player_depotitems WHERE player_id = ? AND sid = ?';
        return await this.db.delete(sql, [playerId, sid]);
    }
}
