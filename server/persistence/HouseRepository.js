export class HouseRepository {
    constructor(database) {
        this.db = database;
    }
    
    // Houses
    async findById(id, worldId = 0) {
        const sql = 'SELECT * FROM houses WHERE id = ? AND world_id = ?';
        return await this.db.queryOne(sql, [id, worldId]);
    }
    
    async findByOwner(ownerId, worldId = 0) {
        const sql = 'SELECT * FROM houses WHERE owner = ? AND world_id = ?';
        return await this.db.query(sql, [ownerId, worldId]);
    }
    
    async findByTown(townId, worldId = 0) {
        const sql = 'SELECT * FROM houses WHERE town = ? AND world_id = ?';
        return await this.db.query(sql, [townId, worldId]);
    }
    
    async updateOwner(id, worldId, ownerId) {
        const sql = 'UPDATE houses SET owner = ?, paid = UNIX_TIMESTAMP() WHERE id = ? AND world_id = ?';
        return await this.db.update(sql, [ownerId, id, worldId]);
    }
    
    async clearHouse(id, worldId) {
        const sql = 'UPDATE houses SET owner = 0, paid = 0, warnings = 0 WHERE id = ? AND world_id = ?';
        return await this.db.update(sql, [id, worldId]);
    }
    
    // House Lists (guest list, subowners, etc)
    async findLists(houseId, worldId = 0) {
        const sql = 'SELECT * FROM house_lists WHERE house_id = ? AND world_id = ?';
        return await this.db.query(sql, [houseId, worldId]);
    }
    
    async updateList(houseId, worldId, listId, list) {
        const sql = `
            INSERT INTO house_lists (house_id, world_id, listid, list)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE list = ?
        `;
        return await this.db.insert(sql, [houseId, worldId, listId, list, list]);
    }
    
    // House Auctions
    async findAuction(houseId, worldId = 0) {
        const sql = 'SELECT * FROM house_auctions WHERE house_id = ? AND world_id = ?';
        return await this.db.queryOne(sql, [houseId, worldId]);
    }
    
    async createAuction(houseId, worldId, playerId, bid, bidLimit, endtime) {
        const sql = `
            INSERT INTO house_auctions (house_id, world_id, player_id, bid, bid_limit, endtime)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE player_id = ?, bid = ?
        `;
        return await this.db.insert(sql, [
            houseId, worldId, playerId, bid, bidLimit, endtime,
            playerId, bid
        ]);
    }
    
    async deleteAuction(houseId, worldId) {
        const sql = 'DELETE FROM house_auctions WHERE house_id = ? AND world_id = ?';
        return await this.db.delete(sql, [houseId, worldId]);
    }
}
