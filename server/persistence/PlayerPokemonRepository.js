export class PlayerPokemonRepository {
    constructor(database) {
        this.db = database;
    }
    
    async findById(id) {
        const sql = `SELECT * FROM player_pokemons WHERE id = ?`;
        return await this.db.queryOne(sql, [id]);
    }
    
    async findByPlayerId(playerId) {
        const sql = `SELECT * FROM player_pokemons WHERE player_id = ? ORDER BY created_at`;
        return await this.db.query(sql, [playerId]);
    }
    
    async create(playerPokemonData) {
        const sql = `
            INSERT INTO player_pokemons (
                player_id, pokemon_id, nickname, level, experience,
                current_hp, current_mana, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, UNIX_TIMESTAMP())
        `;
        const id = await this.db.insert(sql, [
            playerPokemonData.player_id,
            playerPokemonData.pokemon_id, // agora é o nome do Pokémon
            playerPokemonData.nickname || null,
            playerPokemonData.level || 1,
            playerPokemonData.experience || 0,
            playerPokemonData.current_hp,
            playerPokemonData.current_mana
        ]);
        return await this.findById(id);
    }
    
    async update(id, pokemonData) {
        const sql = `
            UPDATE player_pokemons SET
                level = ?, experience = ?,
                current_hp = ?, current_mana = ?,
                nickname = ?
            WHERE id = ?
        `;
        await this.db.update(sql, [
            pokemonData.level,
            pokemonData.experience,
            pokemonData.current_hp,
            pokemonData.current_mana,
            pokemonData.nickname,
            id
        ]);
        return await this.findById(id);
    }
    
    async updateStats(id, hp, mana) {
        const sql = 'UPDATE player_pokemons SET current_hp = ?, current_mana = ? WHERE id = ?';
        return await this.db.update(sql, [hp, mana, id]);
    }
    
    async gainExperience(id, exp) {
        const sql = 'UPDATE player_pokemons SET experience = experience + ? WHERE id = ?';
        return await this.db.update(sql, [exp, id]);
    }
    
    async delete(id) {
        const sql = 'DELETE FROM player_pokemons WHERE id = ?';
        return await this.db.delete(sql, [id]);
    }
    
    async countByPlayerId(playerId) {
        const sql = 'SELECT COUNT(*) as total FROM player_pokemons WHERE player_id = ?';
        const result = await this.db.queryOne(sql, [playerId]);
        return result.total;
    }
}
