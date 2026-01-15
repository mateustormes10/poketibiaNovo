/**
 * GMCommandHandler
 * 
 * Sistema de comandos administrativos (GM)
 * Todos os comandos são processados exclusivamente no servidor
 * Apenas jogadores com vocation === 4 podem executar
 */

import { Logger } from '../utils/Logger.js';
import { GameConstants } from '../../shared/constants/GameConstants.js';
const logger = new Logger('GMCommandHandler');

export class GMCommandHandler {
    constructor(gameWorld, wsServer) {
        this.gameWorld = gameWorld;
        this.wsServer = wsServer;
    }

    /**
     * Verifica se o player tem permissão GM
     * @param {Object} player - Player
     * @returns {boolean}
     */
    isGM(player) {
        return player.vocation === 4;
    }

    /**
     * Parse de comando GM
     * Formato: /comando parametro(valor) parametro(valor)
     * @param {string} message - Mensagem do chat
     * @returns {Object|null} { command, params }
     */
    parseCommand(message) {
        if (!message.startsWith('/')) return null;

        // Remove o / inicial
        const text = message.substring(1);
        
        // Extrai comando (primeira palavra)
        const parts = text.split(' ');
        const command = parts[0].toLowerCase();
        
        // Extrai parâmetros (formato: param(valor))
        const params = {};
        const paramRegex = /(\w+)\(([^)]+)\)/g;
        let match;
        
        while ((match = paramRegex.exec(text)) !== null) {
            params[match[1]] = match[2];
        }
        
        return { command, params };
    }

    /**
     * Executa comando GM
     * @param {Object} client - Cliente que enviou o comando
     * @param {string} message - Mensagem original
     */
    async handleCommand(client, message) {
            const player = client.player;
            logger.info(`[GMCommandHandler] Comando recebido: ${message}`);
            if (!player) {
                logger.warn('[GMCommandHandler] client.player não existe!');
                return;
            }

            // Loga info do player GM
            logger.info(`[GMCommandHandler] GM: ${player.name} (id=${player.id}, dbId=${player.dbId}, vocation=${player.vocation})`);

            // Loga todos os players online
            logger.info('[GMCommandHandler] Players online:');
            for (const p of this.gameWorld.players.values()) {
                logger.info(`- ${p.name} (id=${p.id}, dbId=${p.dbId}, vocation=${p.vocation})`);
            }

            // Valida permissão
            if (!this.isGM(player)) {
                client.send('system_message', {
                    message: '❌ Você não tem permissão para usar comandos GM.',
                    color: 'red'
                });
                logger.warn(`[GMCommandHandler] Player ${player.name} (id=${player.id}) tentou usar comando GM sem permissão`);
                return;
            }

            // Parse do comando
            const parsed = this.parseCommand(message);
            logger.info(`[GMCommandHandler] Parse result: ${JSON.stringify(parsed)}`);
            if (!parsed) {
                client.send('system_message', {
                    message: '❌ Comando inválido.',
                    color: 'red'
                });
                logger.warn('[GMCommandHandler] Comando inválido!');
                return;
            }

            const { command, params } = parsed;

            try {
                // Roteamento de comandos
                switch (command) {
                    case 'teleport':
                        await this.handleTeleport(client, params);
                        break;
                    case 'spawn':
                        await this.handleSpawn(client, params);
                        break;
                    case 'heal':
                        await this.handleHeal(client, params);
                        break;
                    case 'kick':
                        await this.handleKick(client, params);
                        break;
                    case 'ban':
                        await this.handleBan(client, params);
                        break;
                    case 'item':
                        await this.handleItem(client, params);
                        break;
                    case 'setlevel':
                        await this.handleSetLevel(client, params);
                        break;
                    case 'broadcast':
                        await this.handleBroadcast(client, params);
                        break;
                    case 'addgold':
                        logger.info(`[GMCommandHandler] Executando addgold com params: ${JSON.stringify(params)}`);
                        await this.handleAddGold(client, params);
                        break;
                    default:
                        client.send('system_message', {
                            message: `❌ Comando desconhecido: /${command}`,
                            color: 'red'
                        });
                        logger.warn(`[GMCommandHandler] Comando desconhecido: /${command}`);
                }
            } catch (error) {
                logger.error(`[GMCommandHandler] Erro ao executar comando /${command}:`, error);
                client.send('system_message', {
                    message: `❌ Erro ao executar comando: ${error.message}`,
                    color: 'red'
                });
            }
        }

    /**
     * /teleport x(coord) y(coord) z(floor)
     */
    async handleTeleport(client, params) {
        const { cidade, andar, x, y } = params;
        if (!cidade || !andar || !x || !y) {
            client.send('system_message', {
                message: '❌ Uso: /teleport cidade(nome) andar(z) x(x) y(y)',
                color: 'red'
            });
            return;
        }

        const newCidade = cidade;
        const newAndar = parseInt(andar);
        const newX = parseInt(x);
        const newY = parseInt(y);

        // Valida coordenadas
        if (!newCidade || isNaN(newAndar) || isNaN(newX) || isNaN(newY)) {
            client.send('system_message', {
                message: '❌ Coordenadas/cidade inválidas.',
                color: 'red'
            });
            return;
        }

        // Verifica se é walkable
        if (!this.gameWorld.mapManager.isWalkable(newCidade, newAndar, newX, newY)) {
            client.send('system_message', {
                message: '⚠️ Posição não é walkable, mas teleportando mesmo assim...',
                color: 'yellow'
            });
        }

        // Teleporta
        client.player.city = newCidade;
        client.player.z = newAndar;
        client.player.x = newX;
        client.player.y = newY;

        // Atualiza spatial grid
        if (this.gameWorld.spatialGrid && typeof this.gameWorld.spatialGrid.update === 'function') {
            this.gameWorld.spatialGrid.update(client.player);
        }

        // Atualiza map manager
        if (this.gameWorld.mapManager && typeof this.gameWorld.mapManager.updatePlayerPosition === 'function') {
            this.gameWorld.mapManager.updatePlayerPosition(
                client.player.id,
                newCidade,
                newAndar,
                newX,
                newY
            );
        }

        // Envia feedback
        client.send('system_message', {
            message: `✅ Teleportado para cidade=${newCidade}, andar=${newAndar}, x=${newX}, y=${newY}`,
            color: 'green'
        });

        // Log
        logger.info(`[GM] Teleport: ${client.player.name} (id=${client.player.id}) para cidade=${newCidade}, andar=${newAndar}, x=${newX}, y=${newY}`);
        // ...existing code...
    }

     async handleAddGold(client, params) {
                const { player: playerId, quantity } = params;
                if (!playerId || !quantity) {
                    client.send('system_message', {
                        message: '❌ Uso: /addgold player(id) quantity(qtd)',
                        color: 'red'
                    });
                    return;
                }

                const targetId = parseInt(playerId);
                const amount = parseInt(quantity);
                if (isNaN(targetId) || isNaN(amount) || amount <= 0) {
                    client.send('system_message', {
                        message: '❌ Parâmetros inválidos. Exemplo: /addgold player(1) quantity(100)',
                        color: 'red'
                    });
                    return;
                }

                // Busca player pelo ID do banco (dbId)
                let targetPlayer = null;
                for (const player of this.gameWorld.players.values()) {
                    if (player.dbId == targetId) {
                        targetPlayer = player;
                        break;
                    }
                }

                if (!targetPlayer) {
                    client.send('system_message', {
                        message: `❌ Player com ID ${playerId} não encontrado ou offline.`,
                        color: 'red'
                    });
                    logger.warn(`[handleAddGold] Player alvo não encontrado ou offline: dbId=${targetId}`);
                    return;
                }

                try {
                    const newBalance = await this.gameWorld.balanceRepository.addGold(targetId, amount);
                    // Atualiza goldCoin em tempo real se player estiver online
                    targetPlayer.goldCoin = newBalance;

                    // Notifica o player alvo
                    const targetClient = this.getClientByPlayer(targetPlayer);
                    if (targetClient) {
                        targetClient.send('system_message', {
                            message: `💰 Você recebeu ${amount} gold! Novo saldo: ${newBalance}`,
                            color: 'yellow'
                        });
                    }

                    if (targetClient) {
                        targetClient.send('balance_update', { balance: newBalance });
                    }

                    // Feedback para o GM
                    client.send('system_message', {
                        message: `✅ ${amount} gold adicionados ao player ${targetPlayer.name} (ID ${playerId}). Novo saldo: ${newBalance}`,
                        color: 'green'
                    });
                    logger.info(`[GM] ${client.player.name} adicionou ${amount} gold ao player ${targetPlayer.name} (id=${playerId})`);
                } catch (error) {
                    logger.error(`[GM] Erro ao adicionar gold:`, error);
                    client.send('system_message', {
                        message: '❌ Erro ao adicionar gold.',
                        color: 'red'
                    });
                }
            }

    /**
     * /spawn pokemon(id) level(lvl)
     */
    async handleSpawn(client, params) {
        const { pokemon, level } = params;
        
        if (!pokemon || !level) {
            client.send('system_message', {
                message: '❌ Uso: /spawn pokemon(nome) level(lvl)',
                color: 'red'
            });
            return;
        }

        const pokemonLevel = parseInt(level);
        if (isNaN(pokemonLevel) || pokemonLevel < 1 || pokemonLevel > 100) {
            client.send('system_message', {
                message: '❌ Level deve ser entre 1 e 100.',
                color: 'red'
            });
            return;
        }

        // Calcula HP baseado no level
        const baseHp = 20;
        const hp = baseHp + (pokemonLevel * 5);

        // Spawna na posição do GM
        const spawnData = {
            name: pokemon,
            level: pokemonLevel,
            hp: hp,
            maxHp: hp,
            x: client.player.x,
            y: client.player.y,
            z: client.player.z
        };

        const wildPokemon = this.gameWorld.wildPokemonManager.spawnPokemon(spawnData, true);

        // Feedback
        client.send('system_message', {
            message: `✅ ${pokemon} (lvl ${pokemonLevel}) spawned em (${client.player.x}, ${client.player.y}, ${client.player.z})`,
            color: 'green'
        });

        // Log
        logger.info(`[GM] Spawn Pokémon: ${pokemon} id=${wildPokemon.id} level=${pokemonLevel} em x=${client.player.x}, y=${client.player.y}, z=${client.player.z} por GM ${client.player.name}`);
    }

    /**
     * /heal player(id)
     */
    async handleHeal(client, params) {
        const { player: playerId } = params;
        
        if (!playerId) {
            client.send('system_message', {
                message: '❌ Uso: /heal player(id)',
                color: 'red'
            });
            return;
        }

        // Busca player pelo ID do banco (dbId)
        let targetPlayer = null;
        for (const player of this.gameWorld.players.values()) {
            if (player.dbId === parseInt(playerId)) {
                targetPlayer = player;
                break;
            }
        }

        if (!targetPlayer) {
            client.send('system_message', {
                message: `❌ Player com ID ${playerId} não encontrado ou offline.`,
                color: 'red'
            });
            return;
        }

        // Cura player
        targetPlayer.hp = targetPlayer.maxHp;
        targetPlayer.mana = targetPlayer.maxMana;

        // Cura todos os Pokémon do player
        if (targetPlayer.pokemons && targetPlayer.pokemons.length > 0) {
            targetPlayer.pokemons.forEach(pokemon => {
                pokemon.hp = pokemon.maxHp;
                pokemon.mana = pokemon.maxMana;
            });
        }

        // Atualiza banco
        await this.gameWorld.playerRepository.update(targetPlayer.dbId, {
            x: targetPlayer.x || 0,
            y: targetPlayer.y || 0,
            z: targetPlayer.z || 0,
            hp: targetPlayer.hp || targetPlayer.maxHp,
            mp: targetPlayer.mana || targetPlayer.maxMana || 0,
            level: targetPlayer.level || 1,
            exp: targetPlayer.exp || 0,
            direction: targetPlayer.direction || 2,
            sprite: targetPlayer.sprite || 'default'
        });

        // Notifica o player curado
        const targetClient = this.getClientByPlayer(targetPlayer);
        if (targetClient) {
            targetClient.send('system_message', {
                message: `💚 Você foi curado por um GM!`,
                color: 'green'
            });
        }

        // Feedback para o GM
        client.send('system_message', {
            message: `✅ Player ${targetPlayer.name} (ID ${playerId}) foi curado.`,
            color: 'green'
        });

        // Log
        logger.info(`[GM] Heal aplicado no player ${targetPlayer.name} (id=${playerId}) pelo GM ${client.player.name}`);
    }

    /**
     * /kick player(id)
     */
    async handleKick(client, params) {
        const { player: playerId } = params;
        
        if (!playerId) {
            client.send('system_message', {
                message: '❌ Uso: /kick player(id)',
                color: 'red'
            });
            return;
        }

        // Busca player
        let targetPlayer = null;
        for (const player of this.gameWorld.players.values()) {
            if (player.dbId === parseInt(playerId)) {
                targetPlayer = player;
                break;
            }
        }

        if (!targetPlayer) {
            client.send('system_message', {
                message: `❌ Player com ID ${playerId} não encontrado ou offline.`,
                color: 'red'
            });
            return;
        }

        // Busca o client do player
        const targetClient = this.getClientByPlayer(targetPlayer);
        if (!targetClient) {
            client.send('system_message', {
                message: `❌ Cliente não encontrado.`,
                color: 'red'
            });
            return;
        }

        // Envia mensagem antes de kickar
        targetClient.send('system_message', {
            message: `🚫 Você foi removido do jogo por um GM.`,
            color: 'red'
        });

        // Feedback para o GM
        client.send('system_message', {
            message: `✅ Player ${targetPlayer.name} (ID ${playerId}) foi kickado.`,
            color: 'green'
        });

        // Log
        logger.info(`[GM] Player ${targetPlayer.name} (id=${playerId}) foi kickado pelo GM ${client.player.name}`);

        // Kicka (fecha conexão)
        setTimeout(() => {
            targetClient.ws.close();
        }, 500); // Delay para garantir que a mensagem foi enviada
    }

    /**
     * /ban player(id) days(quantidade)
     */
    async handleBan(client, params) {
        const { player: playerId, days } = params;
        
        if (!playerId || !days) {
            client.send('system_message', {
                message: '❌ Uso: /ban player(id) days(quantidade)',
                color: 'red'
            });
            return;
        }

        const daysCount = parseInt(days);
        if (isNaN(daysCount) || daysCount < 1) {
            client.send('system_message', {
                message: '❌ Quantidade de dias inválida.',
                color: 'red'
            });
            return;
        }

        // Calcula timestamp de expiração
        const now = Math.floor(Date.now() / 1000);
        const expires = now + (daysCount * 24 * 60 * 60);

        // Insere ban no banco
        const banData = {
            type: 'player',
            value: parseInt(playerId),
            param: daysCount,
            active: 1,
            expires: expires,
            added: now,
            admin_id: client.player.dbId,
            comment: `Banido por ${daysCount} dia(s)`,
            statement_text: `Banido via comando GM por ${client.player.name}`
        };

        await this.gameWorld.banRepository.createBan(banData);

        // Busca player se estiver online e kicka
        let targetPlayer = null;
        for (const player of this.gameWorld.players.values()) {
            if (player.dbId === parseInt(playerId)) {
                targetPlayer = player;
                break;
            }
        }

        if (targetPlayer) {
            const targetClient = this.getClientByPlayer(targetPlayer);
            if (targetClient) {
                targetClient.send('system_message', {
                    message: `🚫 Você foi banido por ${daysCount} dia(s).`,
                    color: 'red'
                });

                setTimeout(() => {
                    targetClient.ws.close();
                }, 500);
            }
        }

        // Feedback
        client.send('system_message', {
            message: `✅ Player ID ${playerId} foi banido por ${daysCount} dia(s).`,
            color: 'green'
        });

        // Log
        logger.info(`[GM] Player id=${playerId} banido por ${daysCount} dias pelo GM ${client.player.name} (id=${client.player.dbId})`);
    }

    /**
     * /item add(item_id) quantity(qtd) player(id)
     */
    async handleItem(client, params) {
        const { add, quantity, player: playerId } = params;
        
        if (!add || !quantity || !playerId) {
            client.send('system_message', {
                message: '❌ Uso: /item add(item_id) quantity(qtd) player(id)',
                color: 'red'
            });
            return;
        }

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty < 1) {
            client.send('system_message', {
                message: '❌ Quantidade inválida.',
                color: 'red'
            });
            return;
        }

        // Busca player
        let targetPlayer = null;
        for (const player of this.gameWorld.players.values()) {
            if (player.dbId === parseInt(playerId)) {
                targetPlayer = player;
                break;
            }
        }

        if (!targetPlayer) {
            client.send('system_message', {
                message: `❌ Player com ID ${playerId} não encontrado ou offline.`,
                color: 'red'
            });
            return;
        }

        // Adiciona item ao inventário
        await this.gameWorld.inventoryRepository.addItem(parseInt(playerId), add, qty);

        // Notifica o player
        const targetClient = this.getClientByPlayer(targetPlayer);
        if (targetClient) {
            targetClient.send('system_message', {
                message: `📦 Você recebeu ${qty}x ${add}!`,
                color: 'green'
            });

            // Atualiza inventário
            const inventory = await this.gameWorld.inventoryRepository.getInventory(parseInt(playerId));
            targetClient.send('inventory_update', { items: inventory });
        }

        // Feedback
        client.send('system_message', {
            message: `✅ ${qty}x ${add} adicionado ao inventário do player ${targetPlayer.name}.`,
            color: 'green'
        });

        // Log
        logger.info(`[GM] Item ${add} x${qty} adicionado ao player id=${playerId} pelo GM ${client.player.name}`);
    }

    /**
     * /setlevel player(id) level(lvl)
     */
    async handleSetLevel(client, params) {
        const { player: playerId, level } = params;
        
        if (!playerId || !level) {
            client.send('system_message', {
                message: '❌ Uso: /setlevel player(id) level(lvl)',
                color: 'red'
            });
            return;
        }

        const newLevel = parseInt(level);
        if (isNaN(newLevel) || newLevel < 1 || newLevel > 300) {
            client.send('system_message', {
                message: '❌ Level deve ser entre 1 e 300.',
                color: 'red'
            });
            return;
        }

        // Busca player
        let targetPlayer = null;
        for (const player of this.gameWorld.players.values()) {
            if (player.dbId === parseInt(playerId)) {
                targetPlayer = player;
                break;
            }
        }

        if (!targetPlayer) {
            client.send('system_message', {
                message: `❌ Player com ID ${playerId} não encontrado ou offline.`,
                color: 'red'
            });
            return;
        }

        // Atualiza level
        targetPlayer.level = newLevel;
            // Recalcula HP dinâmico baseado no novo level
            targetPlayer.maxHp = GameConstants.PLAYER_HP_INITIAL + GameConstants.PLAYER_HP_INCREASE_PER_LEVEL * targetPlayer.level;
            targetPlayer.hp = targetPlayer.maxHp;
        await this.gameWorld.playerRepository.update(parseInt(playerId), {
            x: targetPlayer.x || 0,
            y: targetPlayer.y || 0,
            z: targetPlayer.z || 0,
            hp: targetPlayer.hp || targetPlayer.maxHp || 100,
            mp: targetPlayer.mana || targetPlayer.maxMana || 50,
            level: newLevel,
            exp: targetPlayer.exp || 0,
            direction: targetPlayer.direction || 2,
            sprite: targetPlayer.sprite || 'default'
        });

        // Notifica o player
        const targetClient = this.getClientByPlayer(targetPlayer);
        if (targetClient) {
            targetClient.send('system_message', {
                message: `⭐ Seu level foi alterado para ${newLevel}!`,
                color: 'yellow'
            });
        }

        // Feedback
        client.send('system_message', {
            message: `✅ Level do player ${targetPlayer.name} alterado para ${newLevel}.`,
            color: 'green'
        });

        // Log
        logger.info(`[GM] Level do player id=${playerId} alterado para ${newLevel} pelo GM ${client.player.name}`);
    }

    /**
     * /broadcast message(texto)
     */
    async handleBroadcast(client, params) {
        const { message } = params;
        
        if (!message) {
            client.send('system_message', {
                message: '❌ Uso: /broadcast message(texto)',
                color: 'red'
            });
            return;
        }

        // Envia para todos os players online
        for (const targetClient of this.wsServer.clients.values()) {
            if (targetClient.player) {
                targetClient.send('broadcast', {
                    message: message,
                    duration: 5000 // 5 segundos
                });
            }
        }

        // Feedback
        client.send('system_message', {
            message: `✅ Broadcast enviado: "${message}"`,
            color: 'green'
        });

        // Log
        logger.info(`[GM] Broadcast enviado: "${message}" por GM ${client.player.name}`);
    }

    /**
     * Helper para buscar client por player
     */
    getClientByPlayer(player) {
        for (const client of this.wsServer.clients.values()) {
            if (client.player && client.player.id === player.id) {
                return client;
            }
        }
        return null;
    }
}
