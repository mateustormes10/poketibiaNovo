/**
 * WildPokemonDTO
 * 
 * Estrutura padronizada para Pokémon selvagem
 */

export class WildPokemonDTO {
    /**
     * Cria um DTO de Pokémon selvagem
     */
    static create(wildPokemon) {
        return {
            id: wildPokemon.id,
            name: wildPokemon.name,
            level: wildPokemon.level,
            hp: wildPokemon.hp,
            maxHp: wildPokemon.maxHp,
            x: wildPokemon.x,
            y: wildPokemon.y,
            z: wildPokemon.z
        };
    }

    /**
     * Valida um Pokémon selvagem
     */
    static validate(pokemon) {
        return (
            pokemon &&
            typeof pokemon.id === 'number' &&
            typeof pokemon.name === 'string' &&
            typeof pokemon.hp === 'number' &&
            typeof pokemon.maxHp === 'number' &&
            typeof pokemon.x === 'number' &&
            typeof pokemon.y === 'number' &&
            typeof pokemon.z === 'number'
        );
    }
}
