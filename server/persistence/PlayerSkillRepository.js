export class PlayerSkillRepository {
    constructor(database) {
        this.db = database;
    }
    
    async findByPlayerId(playerId) {
        const sql = 'SELECT * FROM player_skills WHERE player_id = ? ORDER BY skillid';
        return await this.db.query(sql, [playerId]);
    }
    
    async findByPlayerIdAndSkill(playerId, skillId) {
        const sql = 'SELECT * FROM player_skills WHERE player_id = ? AND skillid = ?';
        return await this.db.queryOne(sql, [playerId, skillId]);
    }
    
    async create(playerId, skillId, value = 0, count = 0) {
        const sql = `
            INSERT INTO player_skills (player_id, skillid, value, count)
            VALUES (?, ?, ?, ?)
        `;
        return await this.db.insert(sql, [playerId, skillId, value, count]);
    }
    
    async update(playerId, skillId, value, count) {
        const sql = `
            UPDATE player_skills SET value = ?, count = ?
            WHERE player_id = ? AND skillid = ?
        `;
        return await this.db.update(sql, [value, count, playerId, skillId]);
    }
    
    async addExperience(playerId, skillId, count) {
        const sql = `
            UPDATE player_skills SET count = count + ?
            WHERE player_id = ? AND skillid = ?
        `;
        return await this.db.update(sql, [count, playerId, skillId]);
    }
    
    async initializeSkills(playerId) {
        // Inicializa skills padrão (0-6: fist, club, sword, axe, distance, shielding, fishing)
        const skills = [0, 1, 2, 3, 4, 5, 6];
        for (const skillId of skills) {
            await this.create(playerId, skillId, 10, 0);
        }
    }
}
