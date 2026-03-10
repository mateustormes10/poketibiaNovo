import { PokemonEntities } from '../game/entities/PokemonEntities.js';
import { MovementSystem } from '../game/systems/MovementSystem.js';
import { ServerEvents } from '../../shared/protocol/actions.js';
import { Logger } from '../utils/Logger.js';
import { I18n } from '../localization/i18n.js';
import { getMaxStamina } from '../utils/PlayerStats.js';

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

        // Detection: repetitive movement patterns (anti-bot)
        try {
            const now = Date.now();
            if (client && client._moveRateLimitedUntilMs && now < client._moveRateLimitedUntilMs) {
                return;
            }

            const shouldDrop = this.gameWorld?.detectionService?.onPlayerMove?.(client, data, player);
            if (shouldDrop) {
                return;
            }
        } catch {
            // ignore
        }

        // Houses (Modelo A): valida entrada/saída/área (server-authoritative)
        try {
            const cityForHouse = data.mapaAtual || player.city || player.mapaAtual || (player.name && player.name.split('_')[0]) || 'CidadeInicial';
            const to = { x: data?.x, y: data?.y, z: data?.z };
            const from = { x: player.x, y: player.y, z: player.z };

            if (typeof to.x === 'number' && typeof to.y === 'number' && typeof to.z === 'number') {
                const res = this.gameWorld.houseService?.validateMove
                    ? this.gameWorld.houseService.validateMove({ player, city: cityForHouse, from, to })
                    : null;

                // validateMove é async: resolve promise se existir
                if (res && typeof res.then === 'function') {
                    // eslint-disable-next-line no-void
                    return void res.then((r) => {
                        if (!r?.allowed) {
                            const reason = r?.reason || 'blocked';
                            const msgKey = reason === 'house_in_auction'
                                ? 'movement.house_in_auction'
                                : reason === 'not_allowed'
                                    ? 'movement.house_no_permission'
                                    : reason === 'house_unowned'
                                        ? 'movement.house_unowned_blocked'
                                        : 'movement.blocked_by_house';
                            const msg = I18n.t(client?.lang, msgKey);
                            client.send('system_message', { message: msg, color: 'yellow' });
                            // Corrige client-side prediction: informa a posição autoritativa atual.
                            client.send('move_reject', { x: player.x, y: player.y, z: player.z });
                            return;
                        }
                        // continua fluxo normal após validação
                        this._handleMoveAfterHouseValidation(client, data, player);
                    }).catch(() => {
                        this._handleMoveAfterHouseValidation(client, data, player);
                    });
                }
                if (res && res.allowed === false) {
                    client.send('system_message', { message: I18n.t(client?.lang, 'movement.blocked_by_house'), color: 'yellow' });
                    client.send('move_reject', { x: player.x, y: player.y, z: player.z });
                    return;
                }
            }
        } catch {
            // ignore - não bloqueia o movimento se houver erro de validação
        }

        // Continuação normal (sem await)
        return this._handleMoveAfterHouseValidation(client, data, player);

    }

    _handleMoveAfterHouseValidation(client, data, player) {

                // Regra atual: stamina NÃO pode impedir o player de andar.
                // Ela apenas concede bônus de velocidade no client.
        // Checa colisão de mapa antes de atualizar posição
        const { direction } = data;
        let city = data.mapaAtual || player.city || player.mapaAtual || (player.name && player.name.split('_')[0]) || 'CidadeInicial';
        if (
            typeof data.x === 'number' &&
            typeof data.y === 'number' &&
            typeof data.z === 'number'
        ) {
            // Segurança: impede teleporte/pulo de tiles (client não pode avançar > 1 tile por pacote)
            const dx = Math.abs(data.x - player.x);
            const dy = Math.abs(data.y - player.y);
            const dz = Math.abs(data.z - player.z);
            if (dx > 1 || dy > 1 || dz > 1) {
                client.send('move_reject', { x: player.x, y: player.y, z: player.z });
                return;
            }

            // 1. Checa colisão de mapa
            if (
                this.gameWorld.mapManager &&
                typeof this.gameWorld.mapManager.isWalkable === 'function' &&
                !this.gameWorld.mapManager.isWalkable(city, data.z, data.x, data.y)
            ) {
                client.send('system_message', { message: I18n.t(client?.lang, 'movement.blocked_by_collision'), color: 'red' });
                client.send('move_reject', { x: player.x, y: player.y, z: player.z });
                return;
            }

            // 2. Checa colisão simples por coordenada (sem SpatialGrid)
            // Players
            for (const [id, otherPlayer] of this.gameWorld.players) {
                if (otherPlayer.id !== player.id && otherPlayer.x === data.x && otherPlayer.y === data.y && otherPlayer.z === data.z) {
                    client.send('system_message', { message: I18n.t(client?.lang, 'movement.blocked_player_on_tile'), color: 'red' });
                    client.send('move_reject', { x: player.x, y: player.y, z: player.z });
                    return;
                }
            }
            // NPCs
            for (const [id, npc] of this.gameWorld.npcs) {
                if (npc.x === data.x && npc.y === data.y && npc.z === data.z) {
                    client.send('system_message', { message: I18n.t(client?.lang, 'movement.blocked_npc_on_tile'), color: 'red' });
                    client.send('move_reject', { x: player.x, y: player.y, z: player.z });
                    return;
                }
            }
            // Monsters
            if (this.gameWorld.monsters) {
                for (const [id, monster] of this.gameWorld.monsters) {
                    if (monster.x === data.x && monster.y === data.y && monster.z === data.z) {
                        client.send('system_message', { message: I18n.t(client?.lang, 'movement.blocked_monster_on_tile'), color: 'red' });
                        client.send('move_reject', { x: player.x, y: player.y, z: player.z });
                        return;
                    }
                }
            }
            // WildPokemons
            if (this.gameWorld.wildPokemonManager && this.gameWorld.wildPokemonManager.wildPokemons) {
                for (const [id, wild] of this.gameWorld.wildPokemonManager.wildPokemons) {
                    if (wild.x === data.x && wild.y === data.y && wild.z === data.z && wild.hp > 0) {
                        client.send('system_message', { message: I18n.t(client?.lang, 'movement.blocked_wild_pokemon_on_tile'), color: 'red' });
                        client.send('move_reject', { x: player.x, y: player.y, z: player.z });
                        return;
                    }
                }
            }

            // 3. Atualiza posição SOMENTE se mudou
            if (player.x !== data.x || player.y !== data.y || player.z !== data.z) {
                player.x = data.x;
                player.y = data.y;
                player.z = data.z;

                // Quests: location objectives
                try {
                    this.gameWorld?.questManager?.onPlayerMoved?.(player);
                } catch {}

                // Subtrai 2 pontos de stamina a cada passo
                if (!player.conditions) player.conditions = {};
                const maxStamina = getMaxStamina(player);
                let staminaAtual = maxStamina;
                if (typeof player.conditions.stamina === 'number') {
                    staminaAtual = player.conditions.stamina;
                } else if (typeof player.conditions.stamina === 'string') {
                    staminaAtual = parseFloat(player.conditions.stamina) || maxStamina;
                }
                staminaAtual = Math.max(0, staminaAtual - 0.5);
                player.conditions.stamina = staminaAtual;
                // Opcional: log para debug
                // console.log(`[STAMINA] Player ${player.name} perdeu 2 stamina ao andar. Novo valor: ${staminaAtual}`);
            }
        }
        else {
            // Pacote inválido: sem coordenadas numéricas.
            client.send('move_reject', { x: player.x, y: player.y, z: player.z });
            return;
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
