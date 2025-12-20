/**
 * WildPokemonManager
 * 
 * Gerencia estado dos Pokémon selvagens no cliente
 * Recebe updates do servidor e mantém cache local
 */

import { WildPokemonClientEvents, WildPokemonServerEvents } from '../../shared/protocol/WildPokemonProtocol.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('WildPokemonManager');

export class WildPokemonManager {
    constructor(wsClient) {
        this.wsClient = wsClient;
        this.wildPokemons = new Map(); // id -> wildPokemon data
        
        // console.log('[WildPokemonManager] Criado');
        // logger.info('[WILD] WildPokemonManager criado');
    }

    /**
     * Solicita lista inicial de Pokémon selvagens
     */
    requestWildPokemonList() {
        // logger.debug('[WILD] Solicitando lista de Pokémon selvagens');
        this.wsClient.send(WildPokemonClientEvents.REQUEST_WILD_POKEMON_LIST, {});
    }

    /**
     * Recebe lista completa de Pokémon selvagens
     * @param {Object} data - { wildPokemons: [...] }
     */
    receiveWildPokemonList(data) {
        // console.log('[WildPokemonManager] Recebendo lista:', data);
        // logger.info(`[WILD] Recebendo lista de ${data.wildPokemons.length} Pokémon selvagens`);
        
        this.wildPokemons.clear();
        
        for (const wildPokemon of data.wildPokemons) {
            this.wildPokemons.set(wildPokemon.id, wildPokemon);
            // console.log(`[WildPokemonManager] ${wildPokemon.name} (id=${wildPokemon.id}) em (${wildPokemon.x}, ${wildPokemon.y}, ${wildPokemon.z})`);
            // logger.debug(`[WILD] ${wildPokemon.name} (id=${wildPokemon.id}) em (${wildPokemon.x}, ${wildPokemon.y}, ${wildPokemon.z})`);
        }
        
        // console.log(`[WildPokemonManager] ${this.wildPokemons.size} Pokémon selvagens carregados`);
        // logger.info(`[WILD] ${this.wildPokemons.size} Pokémon selvagens carregados`);
    }

    /**
     * Recebe spawn de novo Pokémon selvagem
     * @param {Object} data - Dados do Pokémon
     */
    receiveSpawn(data) {
        this.wildPokemons.set(data.id, data);
        logger.info(`[WILD] Novo Pokémon spawned: ${data.name} (id=${data.id}) em (${data.x}, ${data.y}, ${data.z})`);
    }

    /**
     * Recebe atualização de Pokémon selvagem
     * @param {Object} data - Dados atualizados
     */
    receiveUpdate(data) {
        const existing = this.wildPokemons.get(data.id);
        
        if (existing) {
            // Log ANTES de atualizar
            // if (existing.x !== data.x || existing.y !== data.y) {
            //     console.log(`[WildPokemonManager] ${data.name} (id=${data.id}) moveu de (${existing.x}, ${existing.y}) para (${data.x}, ${data.y})`);
            //     logger.debug(`[WILD] ${data.name} moveu para (${data.x}, ${data.y})`);
            // }
            
            // Atualiza dados
            this.wildPokemons.set(data.id, data);
        } else {
            // Se não existe, adiciona (caso tenha perdido o spawn)
            // console.log(`[WildPokemonManager] Adicionando pokémon desconhecido: ${data.name} (id=${data.id}) em (${data.x}, ${data.y})`);
            this.wildPokemons.set(data.id, data);
            logger.warn(`[WILD] Recebeu update de Pokémon desconhecido: ${data.name} (id=${data.id})`);
        }
    }

    /**
     * Recebe despawn de Pokémon selvagem
     * @param {Object} data - { id }
     */
    receiveDespawn(data) {
        const wildPokemon = this.wildPokemons.get(data.id);
        
        if (wildPokemon) {
            this.wildPokemons.delete(data.id);
            logger.info(`[WILD] Pokémon despawned: ${wildPokemon.name} (id=${data.id})`);
        }
    }

    /**
     * Retorna todos os Pokémon selvagens
     * @returns {Map}
     */
    getAll() {
        return this.wildPokemons;
    }

    /**
     * Retorna Pokémon selvagem por ID
     * @param {number} id - ID do Pokémon
     * @returns {Object|null}
     */
    getById(id) {
        return this.wildPokemons.get(id) || null;
    }

    /**
     * Retorna Pokémon selvagens no mesmo andar
     * @param {number} z - Andar
     * @returns {Array}
     */
    getByFloor(z) {
        const result = [];
        for (const wildPokemon of this.wildPokemons.values()) {
            if (wildPokemon.z === z) {
                result.push(wildPokemon);
            }
        }
        return result;
    }
}
