export class WildPokemonRepository {
    constructor(database) {
        this.db = database;
    }
    
    async findById(id) {
        const sql = `
            SELECT wp.*, p.name as pokemon_name, p.hp, p.max_hp, p.aggressive,
                   p.sprite_up, p.sprite_down, p.sprite_left, p.sprite_right
            FROM wild_pokemons wp
            JOIN pokemons p ON wp.pokemon_id = p.id
            WHERE wp.id = ?
        `;
        return await this.db.queryOne(sql, [id]);
    }
    
    async findInArea(x, y, z, range, worldId = 0) {
        const sql = `
            SELECT wp.*, p.name as pokemon_name, p.hp, p.max_hp, p.aggressive
            FROM wild_pokemons wp
            JOIN pokemons p ON wp.pokemon_id = p.id
            WHERE wp.x BETWEEN ? AND ?
              AND wp.y BETWEEN ? AND ?
              AND wp.z = ?
              AND wp.world_id = ?
              AND wp.alive = 1
        `;
        return await this.db.query(sql, [
            x - range, x + range,
            y - range, y + range,
            z, worldId
        ]);
    }
    
    async findByWorldId(worldId = 0) {
        const sql = `
            SELECT wp.*, p.name as pokemon_name
            FROM wild_pokemons wp
            JOIN pokemons p ON wp.pokemon_id = p.id
            WHERE wp.world_id = ? AND wp.alive = 1
        `;
        return await this.db.query(sql, [worldId]);
    }
    
    async spawn(pokemonId, x, y, z, worldId = 0, respawnTime = 0) {
        const sql = `
            INSERT INTO wild_pokemons (pokemon_id, x, y, z, world_id, respawn_time, alive)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        `;
        const id = await this.db.insert(sql, [pokemonId, x, y, z, worldId, respawnTime]);
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
