/**
 * wildPokemonHandler
 * 
 * Processa requisições relacionadas a Pokémon selvagens
 */

import { WildPokemonClientEvents, WildPokemonServerEvents } from '../../shared/protocol/WildPokemonProtocol.js';
import { Logger } from '../utils/Logger.js';
import { registerDefeatedMonster } from './scanHandler.js';

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
            const { wildPokemonId, damage, skillName, attackerId, crits, critMultiplier, critChance, critDamage } = data || {};
            if (!wildPokemonId || !damage) return;
            const wild = gameWorld.wildPokemonManager.wildPokemons.get(wildPokemonId);
            if (!wild) return;
            const morreu = wild.takeDamage(damage);
            let critLog = '';
            if (crits && crits > 0) {
                critLog = ` [CRITs=${crits} x${critMultiplier} | chance=${critChance}% | critDmg=${critDamage}%]`;
            }
            logger.info(`[WILD] ${client.player.name} causou ${damage} de dano ao Pokémon selvagem ${wild.name} (id=${wild.id}) com ${skillName || 'ataque'}${critLog}`);
            // Se morreu, registra para o scanner
            if (morreu) {
                // 1. Register for scanner
                registerDefeatedMonster(client.player.dbId || client.player.id, {
                    name: wild.name,
                    level: wild.level || 1
                });
                // 2. Give EXP and handle level up
                const { PokemonEntities } = require('../game/entities/PokemonEntities.js');
                const expGain = (PokemonEntities[wild.name] && PokemonEntities[wild.name].exp) || 1;
                if (typeof client.player.gainExpAndCheckLevelUp === 'function') {
                    const leveledUp = client.player.gainExpAndCheckLevelUp(expGain);
                    // Sempre envia XP e HP atualizados ao client
                    if (client.send) {
                        client.send('player_status', {
                            hp: client.player.hp,
                            maxHp: client.player.maxHp,
                            exp: client.player.exp,
                            level: client.player.level
                        });
                    }
                    // Se upou, salva no banco e avisa o client Unity
                    if (leveledUp) {
                        gameWorld.savePlayer(client.player);
                        if (client.send) {
                            client.send('player_up_level', { level: client.player.level });
                        }
                    }
                }
            }
            // Broadcast update para todos os players
            gameWorld.wildPokemonManager.broadcastUpdate(wild);
            // (Opcional) Se morreu, pode fazer despawn ou lógica extra
            // if (morreu) gameWorld.wildPokemonManager.despawnPokemon(wild.id);
        }
    };
}
