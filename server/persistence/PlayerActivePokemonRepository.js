export class PlayerActivePokemonRepository {
    constructor(database) {
        this.db = database;
    }
    
    async findByPlayerId(playerId) {
        const sql = `
            SELECT pap.*, p.name as pokemon_name, p.sprite_up, p.sprite_down,
                   p.sprite_left, p.sprite_right, p.hp, p.max_hp
            FROM player_active_pokemons pap
            JOIN pokemons p ON pap.pokemon_id = p.id
            WHERE pap.player_id = ?
            ORDER BY pap.slot
        `;
        return await this.db.query(sql, [playerId]);
    }
    
    async findByPlayerIdAndSlot(playerId, slot) {
        const sql = `
            SELECT pap.*, p.name as pokemon_name
            FROM player_active_pokemons pap
            JOIN pokemons p ON pap.pokemon_id = p.id
            WHERE pap.player_id = ? AND pap.slot = ?
        `;
        return await this.db.queryOne(sql, [playerId, slot]);
    }
    
    async addToSlot(playerId, pokemonId, slot, nickname = null) {
        const sql = `
            INSERT INTO player_active_pokemons (player_id, pokemon_id, slot, nickname, x, y, direction)
            VALUES (?, ?, ?, ?, 0, 0, 'down')
            ON DUPLICATE KEY UPDATE pokemon_id = ?, nickname = ?
        `;
        await this.db.insert(sql, [playerId, pokemonId, slot, nickname, pokemonId, nickname]);
        return await this.findByPlayerIdAndSlot(playerId, slot);
    }
    
    async updatePosition(playerId, slot, x, y) {
        const sql = 'UPDATE player_active_pokemons SET x = ?, y = ? WHERE player_id = ? AND slot = ?';
        return await this.db.update(sql, [x, y, playerId, slot]);
    }
    
    async updateDirection(playerId, slot, direction) {
        const sql = 'UPDATE player_active_pokemons SET direction = ? WHERE player_id = ? AND slot = ?';
        return await this.db.update(sql, [direction, playerId, slot]);
    }
    
    async removeFromSlot(playerId, slot) {
        const sql = 'DELETE FROM player_active_pokemons WHERE player_id = ? AND slot = ?';
        return await this.db.delete(sql, [playerId, slot]);
    }
    
    async clearAll(playerId) {
        const sql = 'DELETE FROM player_active_pokemons WHERE player_id = ?';
        return await this.db.delete(sql, [playerId]);
    }
    
    async swapSlots(playerId, slot1, slot2) {
        // Swap temporário usando slot negativo
        const sql1 = 'UPDATE player_active_pokemons SET slot = -1 WHERE player_id = ? AND slot = ?';
        const sql2 = 'UPDATE player_active_pokemons SET slot = ? WHERE player_id = ? AND slot = ?';
        const sql3 = 'UPDATE player_active_pokemons SET slot = ? WHERE player_id = ? AND slot = -1';
        
        await this.db.update(sql1, [playerId, slot1]);
        await this.db.update(sql2, [slot1, playerId, slot2]);
        await this.db.update(sql3, [slot2, playerId]);
    }
}
