import { PokemonRepository } from '../persistence/PokemonRepository.js';
import { PlayerPokemonRepository } from '../persistence/PlayerPokemonRepository.js';
import { PlayerActivePokemonRepository } from '../persistence/PlayerActivePokemonRepository.js';
import { WildPokemonRepository } from '../persistence/WildPokemonRepository.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('PokemonService');

export class PokemonService {
    constructor(database) {
        this.pokemonRepository = new PokemonRepository(database);
        this.playerPokemonRepository = new PlayerPokemonRepository(database);
        this.playerActivePokemonRepository = new PlayerActivePokemonRepository(database);
        this.wildPokemonRepository = new WildPokemonRepository(database);
    }
    
    // Pokémons base
    async getPokemonById(id) {
        return await this.pokemonRepository.findById(id);
    }
    
    async getPokemonByName(name) {
        return await this.pokemonRepository.findByName(name);
    }
    
    async getAllPokemons() {
        return await this.pokemonRepository.findAll();
    }
    
    // Pokémons do jogador
    async getPlayerPokemons(playerId) {
        return await this.playerPokemonRepository.findByPlayerId(playerId);
    }
    
    async catchPokemon(playerId, pokemonId) {
        const pokemon = await this.pokemonRepository.findById(pokemonId);
        if (!pokemon) {
            throw new Error('Pokemon not found');
        }
        
        const playerPokemon = await this.playerPokemonRepository.create({
            player_id: playerId,
            pokemon_id: pokemonId,
            level: 1,
            experience: 0,
            current_hp: pokemon.max_hp,
            current_mana: pokemon.max_mana
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
    
    async addToActiveSlot(playerId, pokemonId, slot) {
        const pokemon = await this.pokemonRepository.findById(pokemonId);
        if (!pokemon) {
            throw new Error('Pokemon not found');
        }
        
        return await this.playerActivePokemonRepository.addToSlot(playerId, pokemonId, slot);
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
