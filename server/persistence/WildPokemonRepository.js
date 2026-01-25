export class WildPokemonRepository {
    constructor(database) {
        this.db = database;
    }
    
    async findById(id) {
        const sql = `SELECT * FROM wild_pokemons WHERE id = ?`;
        return await this.db.queryOne(sql, [id]);
    }
    
    async findInArea(x, y, z, range, worldId = 0) {
        const sql = `SELECT * FROM wild_pokemons WHERE x BETWEEN ? AND ? AND y BETWEEN ? AND ? AND z = ? AND world_id = ? AND alive = 1`;
        return await this.db.query(sql, [x - range, x + range, y - range, y + range, z, worldId]);
    }
    
    async findByWorldId(worldId = 0) {
        const sql = `SELECT * FROM wild_pokemons WHERE world_id = ? AND alive = 1`;
        return await this.db.query(sql, [worldId]);
    }
    
    async spawn(pokemonName, x, y, z, worldId = 0, respawnTime = 0) {
        const sql = `INSERT INTO wild_pokemons (pokemon_id, x, y, z, world_id, respawn_time, alive) VALUES (?, ?, ?, ?, ?, ?, 1)`;
        const id = await this.db.insert(sql, [pokemonName, x, y, z, worldId, respawnTime]);
        return await this.findById(id);
    }
    
    async updatePosition(id, x, y, z) {
        const sql = 'UPDATE wild_pokemons SET x = ?, y = ?, z = ? WHERE id = ?';
        return await this.db.update(sql, [x, y, z, id]);
    }
    
    async setDead(id) {
        const sql = 'UPDATE wild_pokemons SET alive = 0 WHERE id = ?';
        return await this.db.update(sql, [id]);
    }
    
    async respawn(id) {
        const sql = 'UPDATE wild_pokemons SET alive = 1 WHERE id = ?';
        return await this.db.update(sql, [id]);
    }
    
    async delete(id) {
        const sql = 'DELETE FROM wild_pokemons WHERE id = ?';
        return await this.db.delete(sql, [id]);
    }
    
    async deleteInArea(x, y, z, range, worldId = 0) {
        const sql = `
            DELETE FROM wild_pokemons
            WHERE x BETWEEN ? AND ?
              AND y BETWEEN ? AND ?
              AND z = ?
              AND world_id = ?
        `;
        return await this.db.delete(sql, [
            x - range, x + range,
            y - range, y + range,
            z, worldId
        ]);
    }
}
