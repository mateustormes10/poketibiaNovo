import { PokemonEntities } from '../game/entities/PokemonEntities.js';
import { PlayerPokemonRepository } from '../persistence/PlayerPokemonRepository.js';
import { PlayerActivePokemonRepository } from '../persistence/PlayerActivePokemonRepository.js';
import { WildPokemonRepository } from '../persistence/WildPokemonRepository.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('PokemonService');

export class PokemonService {
    constructor(database) {
        this.playerPokemonRepository = new PlayerPokemonRepository(database);
        this.playerActivePokemonRepository = new PlayerActivePokemonRepository(database);
        this.wildPokemonRepository = new WildPokemonRepository(database);
    }
    
    // Pokémons base
    async getPokemonByName(name) {
        return PokemonEntities[name] || null;
    }
    async getAllPokemons() {
        return Object.values(PokemonEntities);
    }
    
    // Pokémons do jogador
    async getPlayerPokemons(playerId) {
        return await this.playerPokemonRepository.findByPlayerId(playerId);
    }
    
    async catchPokemon(playerId, pokemonName) {
        const pokemon = PokemonEntities[pokemonName];
        if (!pokemon) {
            throw new Error('Pokemon not found');
        }
        const playerPokemon = await this.playerPokemonRepository.create({
            player_id: playerId,
            pokemon_id: pokemonName,
            level: 1,
            experience: 0,
            current_hp: pokemon.maxHp,
            current_mana: 0 // Defina se necessário
        });
        logger.info(`Player ${playerId} caught ${pokemon.name}`);
        return playerPokemon;
    }
    
    async releasePokemon(playerPokemonId) {
        await this.playerPokemonRepository.delete(playerPokemonId);
        logger.info(`Pokemon ${playerPokemonId} released`);
    }
    
    // Pokémons ativos (equipe)
    async getActivePokemons(playerId) {
        return await this.playerActivePokemonRepository.findByPlayerId(playerId);
    }
    
    async addToActiveSlot(playerId, pokemonName, slot) {
        const pokemon = PokemonEntities[pokemonName];
        if (!pokemon) {
            throw new Error('Pokemon not found');
        }
        return await this.playerActivePokemonRepository.addToSlot(playerId, pokemonName, slot);
    }
    
    async removeFromActiveSlot(playerId, slot) {
        return await this.playerActivePokemonRepository.removeFromSlot(playerId, slot);
    }
    
    // Pokémons selvagens
    async getWildPokemonsInArea(x, y, z, range, worldId = 0) {
        return await this.wildPokemonRepository.findInArea(x, y, z, range, worldId);
    }
    
    async spawnWildPokemon(pokemonId, x, y, z, worldId = 0) {
        const pokemon = await this.wildPokemonRepository.spawn(pokemonId, x, y, z, worldId);
        logger.info(`Wild ${pokemon.pokemon_name} spawned at ${x},${y},${z}`);
        return pokemon;
    }
    
    async killWildPokemon(wildPokemonId) {
        await this.wildPokemonRepository.setDead(wildPokemonId);
        logger.info(`Wild pokemon ${wildPokemonId} killed`);
    }
}
