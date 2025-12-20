/**
 * wildPokemonHandler
 * 
 * Processa requisições relacionadas a Pokémon selvagens
 */

import { WildPokemonClientEvents, WildPokemonServerEvents } from '../../shared/protocol/WildPokemonProtocol.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('WildPokemonHandler');

export function setupWildPokemonHandler(gameWorld) {
    return {
        /**
         * Player solicita lista de Pokémon selvagens
         */
        [WildPokemonClientEvents.REQUEST_WILD_POKEMON_LIST]: (client) => {
            if (!client.player) {
                logger.warn('[WILD] Cliente sem player tentou solicitar lista de Pokémon selvagens');
                return;
            }

            logger.debug(`[WILD] Player ${client.player.name} solicitou lista de Pokémon selvagens`);

            // Pega todos os Pokémon selvagens
            const wildPokemons = gameWorld.wildPokemonManager.getAllPokemons();

            // Envia lista para o cliente
            client.send(WildPokemonServerEvents.WILD_POKEMON_LIST, {
                wildPokemons
            });

            logger.debug(`[WILD] Enviando ${wildPokemons.length} Pokémon selvagens para ${client.player.name}`);
        }
    };
}
