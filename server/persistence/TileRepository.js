export class TileRepository {
    constructor(database) {
        this.db = database;
    }
    
    // Tiles
    async findById(id, worldId = 0) {
        const sql = 'SELECT * FROM tiles WHERE id = ? AND world_id = ?';
        return await this.db.queryOne(sql, [id, worldId]);
    }
    
    async findByPosition(x, y, z, worldId = 0) {
        const sql = 'SELECT * FROM tiles WHERE x = ? AND y = ? AND z = ? AND world_id = ?';
        return await this.db.query(sql, [x, y, z, worldId]);
    }
    
    async findByHouseId(houseId, worldId = 0) {
        const sql = 'SELECT * FROM tiles WHERE house_id = ? AND world_id = ?';
        return await this.db.query(sql, [houseId, worldId]);
    }
    
    async create(tileData) {
        const sql = `
            INSERT INTO tiles (id, world_id, house_id, x, y, z)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        return await this.db.insert(sql, [
            tileData.id,
            tileData.world_id || 0,
            tileData.house_id,
            tileData.x,
            tileData.y,
            tileData.z
        ]);
    }
    
    async delete(id, worldId = 0) {
        const sql = 'DELETE FROM tiles WHERE id = ? AND world_id = ?';
        return await this.db.delete(sql, [id, worldId]);
    }
    
    // Tile Items
    async findItemsByTileId(tileId, worldId = 0) {
        const sql = 'SELECT * FROM tile_items WHERE tile_id = ? AND world_id = ? ORDER BY sid';
        return await this.db.query(sql, [tileId, worldId]);
    }
    
    async addItem(tileId, worldId, itemData) {
        const sql = `
            INSERT INTO tile_items (tile_id, world_id, sid, pid, itemtype, count, attributes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        return await this.db.insert(sql, [
            tileId,
            worldId,
            itemData.sid,
            itemData.pid || 0,
            itemData.itemtype,
            itemData.count || 1,
            itemData.attributes || Buffer.from('')
        ]);
    }
    
    async removeItem(tileId, worldId, sid) {
        const sql = 'DELETE FROM tile_items WHERE tile_id = ? AND world_id = ? AND sid = ?';
        return await this.db.delete(sql, [tileId, worldId, sid]);
    }
    
    async clearItems(tileId, worldId = 0) {
        const sql = 'DELETE FROM tile_items WHERE tile_id = ? AND world_id = ?';
        return await this.db.delete(sql, [tileId, worldId]);
    }
}
