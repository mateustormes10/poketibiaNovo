import { PokemonEntities } from '../game/entities/PokemonEntities.js';
import { MovementSystem } from '../game/systems/MovementSystem.js';
import { ServerEvents } from '../../shared/protocol/actions.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('Movement');

export class MovementHandler {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
        this.movementSystem = new MovementSystem(gameWorld);
    }
    
    handleMove(client, data) {
        // Loga as coordenadas recebidas do client
		logger.debug(
			`[RECEIVED MOVE] direção=${data?.direction}, x=${data?.x}, y=${data?.y}, z=${data?.z}, mapaAtual=${data?.mapaAtual}`
		);

        // Busca o player pelo playerId do pacote, se existir, senão usa client.player
        let player = client.player;
        if (data.playerId && this.gameWorld.players && this.gameWorld.players.has(data.playerId)) {
            player = this.gameWorld.players.get(data.playerId);
        }
        if (!player) return;

                // Trava: impede movimento se stamina <= 0
                let staminaAtual = 100;
                if (player.conditions && typeof player.conditions.stamina === 'number') {
                    staminaAtual = player.conditions.stamina;
                } else if (player.conditions && typeof player.conditions.stamina === 'string') {
                    staminaAtual = parseFloat(player.conditions.stamina) || 100;
                }
                if (staminaAtual <= 0) {
                    client.send('system_message', { message: 'Você está exausto! Espere a stamina recarregar para andar.', color: 'yellow' });
                    return;
                }
        // Checa colisão de mapa antes de atualizar posição
        const { direction } = data;
        let city = data.mapaAtual || player.city || player.mapaAtual || (player.name && player.name.split('_')[0]) || 'CidadeInicial';
        if (
            typeof data.x === 'number' &&
            typeof data.y === 'number' &&
            typeof data.z === 'number'
        ) {
            // 1. Checa colisão de mapa
            if (
                this.gameWorld.mapManager &&
                typeof this.gameWorld.mapManager.isWalkable === 'function' &&
                !this.gameWorld.mapManager.isWalkable(city, data.z, data.x, data.y)
            ) {
                client.send('system_message', { message: 'Movimento bloqueado por colisão!', color: 'red' });
                return;
            }

            // 2. Checa colisão simples por coordenada (sem SpatialGrid)
            // Players
            for (const [id, otherPlayer] of this.gameWorld.players) {
                if (otherPlayer.id !== player.id && otherPlayer.x === data.x && otherPlayer.y === data.y && otherPlayer.z === data.z) {
                    client.send('system_message', { message: 'Movimento bloqueado: outro jogador está neste tile!', color: 'red' });
                    return;
                }
            }
            // NPCs
            for (const [id, npc] of this.gameWorld.npcs) {
                if (npc.x === data.x && npc.y === data.y && npc.z === data.z) {
                    client.send('system_message', { message: 'Movimento bloqueado: um NPC está neste tile!', color: 'red' });
                    return;
                }
            }
            // Monsters
            if (this.gameWorld.monsters) {
                for (const [id, monster] of this.gameWorld.monsters) {
                    if (monster.x === data.x && monster.y === data.y && monster.z === data.z) {
                        client.send('system_message', { message: 'Movimento bloqueado: um monstro está neste tile!', color: 'red' });
                        return;
                    }
                }
            }
            // WildPokemons
            if (this.gameWorld.wildPokemonManager && this.gameWorld.wildPokemonManager.wildPokemons) {
                for (const [id, wild] of this.gameWorld.wildPokemonManager.wildPokemons) {
                    if (wild.x === data.x && wild.y === data.y && wild.z === data.z && wild.hp > 0) {
                        client.send('system_message', { message: 'Movimento bloqueado: um Pokémon selvagem está neste tile!', color: 'red' });
                        return;
                    }
                }
            }

            // 3. Atualiza posição SOMENTE se mudou
            if (player.x !== data.x || player.y !== data.y || player.z !== data.z) {
                player.x = data.x;
                player.y = data.y;
                player.z = data.z;

                // Subtrai 2 pontos de stamina a cada passo
                if (!player.conditions) player.conditions = {};
                let staminaAtual = 100;
                if (typeof player.conditions.stamina === 'number') {
                    staminaAtual = player.conditions.stamina;
                } else if (typeof player.conditions.stamina === 'string') {
                    staminaAtual = parseFloat(player.conditions.stamina) || 100;
                }
                staminaAtual = Math.max(0, staminaAtual - 0.5);
                player.conditions.stamina = staminaAtual;
                // Opcional: log para debug
                // console.log(`[STAMINA] Player ${player.name} perdeu 2 stamina ao andar. Novo valor: ${staminaAtual}`);
            }
        }
        if (direction) {
            player.direction = direction;
        }

        // Log detalhado do movimento
		logger.debug(`Player ${player.name} moveu para (${player.x},${player.y},${player.z})`);

        // Se o player está transformado em pokémon, atualiza a sprite conforme a direção
        if (player && player.sprite && Array.isArray(player.sprite)) {
            // Descobre o nome do pokémon atual
            const pokeName = player.pokemonName || player.name;
            const pokeData = PokemonEntities[pokeName];
            if (pokeData && direction) {
                let outfitName = pokeName; // sempre string, nome do pokémon/outfit
                let spriteArr = pokeData[`sprite_${direction}`] || pokeData['sprite_down'];
                player.sprite = spriteArr;
                client.send('player_outfit_update', { playerId: player.id, lookaddons: outfitName });
            }
        }


        // Atualiza streaming de mapa
        // Lógica de mapa removida do servidor

        // Cria delta de movimento
        const moveDelta = {
            playerId: player.id,
            x: player.x,
            y: player.y,
            z: player.z,
            direction: player.direction
        };

        // Notifica o cliente (sempre envia movimento próprio)
        client.send(ServerEvents.PLAYER_MOVE, moveDelta);

        // Envia gameState atualizado (pode ser pesado). Throttle leve para evitar travadas.
        const now = Date.now();
        const lastSent = client._lastGameStateSentAt || 0;
        if (now - lastSent >= 120) {
            const gameState = this.gameWorld.getGameState(player);
            client.send('gameState', gameState);
            client._lastGameStateSentAt = now;
        }

        // Notifica jogadores na área (apenas delta)
        const playersInRange = this.gameWorld.getPlayersInArea(
            player.x,
            player.y,
            player.z,
            15
        );
        // Envia para outros jogadores próximos (exceto self)
        playersInRange.forEach(p => {
            if (p.id !== player.id) {
                // TODO: Broadcast para outros clientes
                // wsServer.sendToPlayer(p.id, ServerEvents.PLAYER_MOVE, moveDelta);
            }
        });


        
    }
}
