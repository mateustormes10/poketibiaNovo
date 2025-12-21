  
export class AccountRepository {
    constructor(database) {
        this.db = database;
    }

    //http
      // Retorna todos os personagens de uma conta
    async getCharacters(accountId) {
        const sql = 'SELECT * FROM players WHERE account_id = ?';
        return await this.db.query(sql, [accountId]);
    }

    // Cria um novo personagem para a conta
    async createCharacter(accountId, name) {
        const sql = 'INSERT INTO players (account_id, name, level, experience) VALUES (?, ?, 1, 0)';
        try {
            await this.db.insert(sql, [accountId, name]);
            return { success: true };
        } catch (err) {
            return { success: false, message: err.message };
        }
    }
    //websocket
    async findById(id) {
        const sql = 'SELECT * FROM accounts WHERE id = ?';
        return await this.db.queryOne(sql, [id]);
    }
    
    async findByName(name) {
        const sql = 'SELECT * FROM accounts WHERE name = ?';
        return await this.db.queryOne(sql, [name]);
    }
    
    async create(accountData) {
        const sql = `
            INSERT INTO accounts (name, password, email, premdays, group_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        const id = await this.db.insert(sql, [
            accountData.name,
            accountData.password,
            accountData.email || '',
            accountData.premdays || 0,
            accountData.group_id || 1
        ]);
        return await this.findById(id);
    }
    
    async update(id, accountData) {
        const sql = `
            UPDATE accounts 
            SET password = ?, email = ?, premdays = ?, group_id = ?, blocked = ?
            WHERE id = ?
        `;
        await this.db.update(sql, [
            accountData.password,
            accountData.email,
            accountData.premdays,
            accountData.group_id,
            accountData.blocked || 0,
            id
        ]);
        return await this.findById(id);
    }
    
    async delete(id) {
        const sql = 'DELETE FROM accounts WHERE id = ?';
        return await this.db.delete(sql, [id]);
    }
    
    async updateLastLogin(id) {
        const sql = 'UPDATE accounts SET lastday = UNIX_TIMESTAMP() WHERE id = ?';
        return await this.db.update(sql, [id]);
    }
    
    async ban(id, expires, reason) {
        const sql = 'UPDATE accounts SET blocked = 1 WHERE id = ?';
        await this.db.update(sql, [id]);
        
        // Registra o ban
        const banSql = `
            INSERT INTO bans (type, value, expires, added, comment, reason)
            VALUES (3, ?, ?, UNIX_TIMESTAMP(), ?, ?)
        `;
        return await this.db.insert(banSql, [id, expires, reason, 0]);
    }
    
    async unban(id) {
        const sql = 'UPDATE accounts SET blocked = 0 WHERE id = ?';
        return await this.db.update(sql, [id]);
    }
}
