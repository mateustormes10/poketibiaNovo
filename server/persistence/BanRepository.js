export class BanRepository {
    constructor(database) {
        this.db = database;
    }
    
    async findById(id) {
        const sql = 'SELECT * FROM bans WHERE id = ?';
        return await this.db.queryOne(sql, [id]);
    }
    
    async findActive() {
        const sql = 'SELECT * FROM bans WHERE active = 1 AND expires > UNIX_TIMESTAMP()';
        return await this.db.query(sql);
    }
    
    async findByValue(value, type) {
        const sql = 'SELECT * FROM bans WHERE value = ? AND type = ? AND active = 1';
        return await this.db.query(sql, [value, type]);
    }
    
    async create(banData) {
        const sql = `
            INSERT INTO bans (type, value, param, expires, added, admin_id, comment, reason, action_type)
            VALUES (?, ?, ?, ?, UNIX_TIMESTAMP(), ?, ?, ?, ?)
        `;
        const id = await this.db.insert(sql, [
            banData.type,
            banData.value,
            banData.param || 4294967295,
            banData.expires,
            banData.admin_id || 0,
            banData.comment || '',
            banData.reason || 0,
            banData.action_type || 0
        ]);
        return await this.findById(id);
    }
    
    /**
     * Cria um ban (alias para create)
     */
    async createBan(banData) {
        return await this.create(banData);
    }
    
    async deactivate(id) {
        const sql = 'UPDATE bans SET active = 0 WHERE id = ?';
        return await this.db.update(sql, [id]);
    }
    
    async delete(id) {
        const sql = 'DELETE FROM bans WHERE id = ?';
        return await this.db.delete(sql, [id]);
    }
    
    async isPlayerBanned(playerId) {
        const sql = `
            SELECT * FROM bans 
            WHERE value = ? AND type = 2 AND active = 1 AND expires > UNIX_TIMESTAMP()
        `;
        const result = await this.db.queryOne(sql, [playerId]);
        return result !== null;
    }
    
    async isAccountBanned(accountId) {
        const sql = `
            SELECT * FROM bans 
            WHERE value = ? AND type = 3 AND active = 1 AND expires > UNIX_TIMESTAMP()
        `;
        const result = await this.db.queryOne(sql, [accountId]);
        return result !== null;
    }
    
    async isIpBanned(ip) {
        const sql = `
            SELECT * FROM bans 
            WHERE value = ? AND type = 1 AND active = 1 AND expires > UNIX_TIMESTAMP()
        `;
        const result = await this.db.queryOne(sql, [ip]);
        return result !== null;
    }
}
