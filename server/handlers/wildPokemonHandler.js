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
        ,
        /**
         * Player informa dano em Pokémon selvagem
         */
        'wild_pokemon_damage': (client, data) => {
            if (!client.player) return;
            const { wildPokemonId, damage, skillName, attackerId } = data || {};
            if (!wildPokemonId || !damage) return;
            const wild = gameWorld.wildPokemonManager.wildPokemons.get(wildPokemonId);
            if (!wild) return;
            const morreu = wild.takeDamage(damage);
            logger.info(`[WILD] ${client.player.name} causou ${damage} de dano ao Pokémon selvagem ${wild.name} (id=${wild.id}) com ${skillName || 'ataque'}`);
            // Broadcast update para todos os players
            gameWorld.wildPokemonManager.broadcastUpdate(wild);
            // (Opcional) Se morreu, pode fazer despawn ou lógica extra
            // if (morreu) gameWorld.wildPokemonManager.despawnPokemon(wild.id);
        }
    };
}
