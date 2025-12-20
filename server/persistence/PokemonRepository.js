export class PokemonRepository {
    constructor(database) {
        this.db = database;
    }
    
    async findById(id) {
        const sql = 'SELECT * FROM pokemons WHERE id = ?';
        return await this.db.queryOne(sql, [id]);
    }
    
    async findByName(name) {
        const sql = 'SELECT * FROM pokemons WHERE name = ?';
        return await this.db.queryOne(sql, [name]);
    }
    
    async findAll() {
        const sql = 'SELECT * FROM pokemons ORDER BY name';
        return await this.db.query(sql);
    }
    
    async create(pokemonData) {
        const sql = `
            INSERT INTO pokemons (
                name, hp, max_hp, max_mana, aggressive, speed,
                attack_base, defense_base, elements, weak_elements,
                strong_elements, skills, sprite_up, sprite_down,
                sprite_left, sprite_right
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const id = await this.db.insert(sql, [
            pokemonData.name,
            pokemonData.hp,
            pokemonData.max_hp,
            pokemonData.max_mana,
            pokemonData.aggressive ? 1 : 0,
            pokemonData.speed,
            pokemonData.attack_base,
            pokemonData.defense_base,
            JSON.stringify(pokemonData.elements),
            JSON.stringify(pokemonData.weak_elements),
            JSON.stringify(pokemonData.strong_elements),
            JSON.stringify(pokemonData.skills),
            JSON.stringify(pokemonData.sprite_up),
            JSON.stringify(pokemonData.sprite_down),
            JSON.stringify(pokemonData.sprite_left),
            JSON.stringify(pokemonData.sprite_right)
        ]);
        return await this.findById(id);
    }
    
    async update(id, pokemonData) {
        const sql = `
            UPDATE pokemons SET
                name = ?, hp = ?, max_hp = ?, max_mana = ?,
                aggressive = ?, speed = ?, attack_base = ?,
                defense_base = ?
            WHERE id = ?
        `;
        await this.db.update(sql, [
            pokemonData.name,
            pokemonData.hp,
            pokemonData.max_hp,
            pokemonData.max_mana,
            pokemonData.aggressive ? 1 : 0,
            pokemonData.speed,
            pokemonData.attack_base,
            pokemonData.defense_base,
            id
        ]);
        return await this.findById(id);
    }
    
    async delete(id) {
        const sql = 'DELETE FROM pokemons WHERE id = ?';
        return await this.db.delete(sql, [id]);
    }
}
