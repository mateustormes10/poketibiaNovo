/**
 * InventoryHandler
 * 
 * Processa requisições de inventário do cliente
 * Servidor sempre valida e controla o inventário
 */

import { 
    InventoryClientEvents, 
    InventoryServerEvents,
    InventoryErrorCode 
} from '../../shared/protocol/InventoryProtocol.js';
import { InventoryDTO } from '../../shared/dto/InventoryDTO.js';
import { Logger } from '../utils/Logger.js';
import { PokemonEntities } from '../game/entities/PokemonEntities.js';

const logger = new Logger('InventoryHandler');

export class InventoryHandler {
    constructor(gameWorld, inventoryService) {
        this.gameWorld = gameWorld;
        this.inventoryService = inventoryService;
    }

    /**
     * Retorna um monstro ativo do slot (1..6) de volta para o inventário.
     * Remove de player_active_monsters e adiciona um item SCAN no player_inventory.
     * Payload esperado: { slot }
     */
    async handleReturnActiveMonsterToInventory(client, data) {
        const playerId = client.player?.dbId || client.player?.id;
        if (!playerId) {
            this.sendInventoryError(client, InventoryErrorCode.PERMISSION_DENIED, 'Player não autenticado');
            return;
        }

        const slot = Number(data?.slot);
        if (!Number.isFinite(slot) || slot < 1 || slot > 6) {
            client.send('system_message', { message: 'Slot inválido.' });
            return;
        }

        const activeRepo = this.gameWorld?.playerActivePokemonRepository;
        const inventoryRepo = this.gameWorld?.inventoryRepository;
        if (!activeRepo || !inventoryRepo) {
            client.send('system_message', { message: 'Sistema indisponível.' });
            return;
        }

        const row = await activeRepo.findByPlayerIdAndSlot(playerId, slot);
        if (!row) {
            client.send('system_message', { message: 'Não há monstro nesse slot.' });
            return;
        }

        const monsterId = Number(row?.monster_id ?? row?.pokemon_id);
        const entity = Object.values(PokemonEntities || {}).find(e => Number(e?.id) === monsterId) || null;
        const monsterName = entity?.name || row?.nickname || 'UNKNOWN';

        const itemName = `SCAN:${monsterName}:LVL1:BASIC`;

        // Remove do slot e adiciona no inventário (com rollback best-effort)
        try {
            await activeRepo.removeFromSlot(playerId, slot);
            await inventoryRepo.addItem(playerId, 'scanner_monster', itemName, 1);
        } catch (e) {
            // rollback best-effort: tenta recolocar no slot
            try {
                if (Number.isFinite(monsterId))
                    await activeRepo.insertToSlotNoReplace(playerId, monsterId, slot, row?.nickname ?? null);
            } catch (_) {}
            client.send('system_message', { message: 'Falha ao retornar monstro ao inventário.' });
            return;
        }

        // Atualiza pokémons do player em memória para refletir no gameState
        try {
            const gw = this.gameWorld;
            const playersMap = gw?.players;
            let playerObj = client.player;
            if (playersMap && playerObj && !playersMap.has(playerObj.id) && !playersMap.has(playerObj.dbId)) {
                playerObj = null;
            }
            if (!playerObj && playersMap) {
                for (const p of playersMap.values()) {
                    if (p?.dbId == playerId || p?.id == playerId || p?.id == String(playerId) || p?.dbId == String(playerId)) {
                        playerObj = p;
                        break;
                    }
                }
            }
            if (playerObj && typeof gw?.loadPlayerPokemons === 'function') {
                await gw.loadPlayerPokemons(playerObj, playerId);
            }
        } catch (e) {
            logger.warn('[Inventory] Falha ao atualizar pokémons em memória após retorno:', e?.message || e);
        }

        // Envia inventário atualizado e gameState atualizado
        await this.sendInventoryUpdate(client, playerId);
        try {
            if (typeof this.gameWorld?.getGameState === 'function' && client.player) {
                const gs = this.gameWorld.getGameState(client.player);
                client.send('gameState', gs);
            }
        } catch (e) {
            logger.warn('[Inventory] Falha ao enviar gameState após retorno:', e?.message || e);
        }

        client.send('system_message', { message: `Monstro retornou ao inventário (slot ${slot}).` });
    }

    /**
     * Processa requisição de inventário
     * @param {Object} client - Cliente WebSocket
     * @param {Object} data - Dados da requisição
     */
    async handleInventoryRequest(client, data) {
        // Usa dbId (ID do banco) em vez de id (ID local do jogo)
        const playerId = client.player?.dbId || client.player?.id;

        if (!playerId) {
            this.sendInventoryError(client, InventoryErrorCode.PERMISSION_DENIED, 'Player não autenticado');
            return;
        }

        try {
            // Busca inventário do player
            const inventory = await this.inventoryService.getPlayerInventory(playerId);
			logger.debug('Inventário do player:', playerId);
			logger.debug('Dados a enviar:', inventory);

            // Valida DTO
            if (!InventoryDTO.validate(inventory)) {
                throw new Error('Inventário inválido');
            }

            // Envia inventário para o cliente
            client.send(InventoryServerEvents.INVENTORY_DATA, inventory);
			logger.debug(`Inventário enviado para player ${playerId}`);
        } catch (error) {
			logger.error('Erro ao buscar inventário:', error);
            this.sendInventoryError(client, InventoryErrorCode.PERMISSION_DENIED, 'Erro ao carregar inventário');
        }
    }

    /**
     * Processa uso de item
     * @param {Object} client - Cliente WebSocket
     * @param {Object} data - Dados da requisição
     */
    async handleUseItem(client, data) {
        const playerId = client.player?.dbId || client.player?.id;

        if (!playerId) {
            this.sendInventoryError(client, InventoryErrorCode.PERMISSION_DENIED, 'Player não autenticado');
            return;
        }

        const { item_name, context } = data;

        if (!item_name) {
            this.sendInventoryError(client, InventoryErrorCode.INVALID_ITEM, 'Nome do item não especificado');
            return;
        }

        try {
            // Usa o item
            const result = await this.inventoryService.useItem(playerId, item_name, context || {});

            if (result.success) {
                // Notifica sucesso
                client.send(InventoryServerEvents.ITEM_USED, {
                    item_name: item_name,
                    message: result.message,
                    effect: result.effect,
                    value: result.value,
                    balance: result.balance // pode ser undefined
                });

                // Se for Gold Coin, envia também o evento balance_update para atualizar o HUD
                if (item_name === 'Gold Coin' && typeof result.balance !== 'undefined') {
                    client.send('balance_update', { balance: result.balance });
                }

                // Envia inventário atualizado
                await this.sendInventoryUpdate(client, playerId);

                // Se o item afetou pokémons ativos, envia gamestate atualizado imediatamente
                if (result.effect === 'active_monster_added' && typeof this.gameWorld?.getGameState === 'function' && client.player) {
                    try {
                        const gs = this.gameWorld.getGameState(client.player);
                        client.send('gameState', gs);
                    } catch (e) {
                        logger.warn('[Inventory] Falha ao enviar gameState após uso de item:', e?.message || e);
                    }
                }
				logger.debug(`Player ${playerId} usou item: ${item_name}`);
            } else {
                // Envia erro
                this.sendInventoryError(client, result.error, result.message);
            }
        } catch (error) {
			logger.error('Erro ao usar item:', error);
            this.sendInventoryError(client, InventoryErrorCode.CANNOT_USE_ITEM, 'Erro ao usar item');
        }
    }

    /**
     * Processa drop de item (futuro)
     * @param {Object} client - Cliente WebSocket
     * @param {Object} data - Dados da requisição
     */
    async handleDropItem(client, data) {
        // TODO: Implementar drop de itens no chão
        this.sendInventoryError(client, InventoryErrorCode.CANNOT_USE_ITEM, 'Drop não implementado');
    }

    /**
     * Envia inventário atualizado para o cliente
     * @param {Object} client - Cliente WebSocket
     * @param {number} playerId - ID do player
     */
    async sendInventoryUpdate(client, playerId) {
        try {
            const inventory = await this.inventoryService.getPlayerInventory(playerId);

            client.send(InventoryServerEvents.INVENTORY_UPDATE, inventory);
        } catch (error) {
			logger.error('Erro ao enviar atualização:', error);
        }
    }

    /**
     * Envia erro de inventário para o cliente
     * @param {Object} client - Cliente WebSocket
     * @param {string} errorCode - Código do erro
     * @param {string} message - Mensagem de erro
     */
    sendInventoryError(client, errorCode, message) {
        client.send(InventoryServerEvents.INVENTORY_ERROR, {
            errorCode: errorCode,
            message: message
        });
    }

    /**
     * Notifica todos os players próximos sobre mudança de inventário
     * (útil para drops no futuro)
     */
    broadcastInventoryChange(playerId) {
        // TODO: Implementar broadcast quando necessário
    }

    /**
     * Adiciona item ao inventário e notifica o player
     * @param {number} playerId - ID do player
     * @param {string} itemName - Nome do item
     * @param {number} quantity - Quantidade
     */
    async addItemToPlayer(playerId, itemName, quantity = 1) {
        const result = await this.inventoryService.giveItem(playerId, itemName, quantity);
        
        if (result.success) {
            // Busca o cliente conectado
            const client = this.findClientByPlayerId(playerId);
            
            if (client) {
                // Notifica adição de item
                client.send(InventoryServerEvents.ITEM_ADDED, {
                    item_name: itemName,
                    quantity: quantity,
                    message: result.message
                });

                // Envia inventário atualizado
                await this.sendInventoryUpdate(client, playerId);
            }
        }

        return result;
    }

    /**
     * Encontra cliente conectado por ID do player
     * @param {number} playerId - ID do player
     * @returns {Object|null} Cliente ou null
     */
    findClientByPlayerId(playerId) {
        // Procura cliente nos clientes ativos do gameWorld
        for (const [clientId, client] of this.gameWorld.clients) {
            if (client.player?.id === playerId) {
                return client;
            }
        }
        return null;
    }
}
