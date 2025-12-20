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

export class InventoryHandler {
    constructor(gameWorld, inventoryService) {
        this.gameWorld = gameWorld;
        this.inventoryService = inventoryService;
    }

    /**
     * Processa requisição de inventário
     * @param {Object} client - Cliente WebSocket
     * @param {Object} data - Dados da requisição
     */
    async handleInventoryRequest(client, data) {
        // Usa dbId (ID do banco) em vez de id (ID local do jogo)
        const playerId = client.player?.dbId || client.player?.id;

        console.log('[InventoryHandler] Client player:', client.player);
        console.log('[InventoryHandler] Player ID a usar:', playerId);

        if (!playerId) {
            this.sendInventoryError(client, InventoryErrorCode.PERMISSION_DENIED, 'Player não autenticado');
            return;
        }

        try {
            // Busca inventário do player
            const inventory = await this.inventoryService.getPlayerInventory(playerId);

            console.log('[InventoryHandler] Inventário do player:', playerId);
            console.log('[InventoryHandler] Dados a enviar:', JSON.stringify(inventory, null, 2));

            // Valida DTO
            if (!InventoryDTO.validate(inventory)) {
                throw new Error('Inventário inválido');
            }

            // Envia inventário para o cliente
            client.send(InventoryServerEvents.INVENTORY_DATA, inventory);

            console.log(`[InventoryHandler] Inventário enviado para player ${playerId}`);
        } catch (error) {
            console.error('[InventoryHandler] Erro ao buscar inventário:', error);
            this.sendInventoryError(client, InventoryErrorCode.PERMISSION_DENIED, 'Erro ao carregar inventário');
        }
    }

    /**
     * Processa uso de item
     * @param {Object} client - Cliente WebSocket
     * @param {Object} data - Dados da requisição
     */
    async handleUseItem(client, data) {
        const playerId = client.player?.id;

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
                    value: result.value
                });

                // Envia inventário atualizado
                await this.sendInventoryUpdate(client, playerId);

                console.log(`[InventoryHandler] Player ${playerId} usou item: ${item_name}`);
            } else {
                // Envia erro
                this.sendInventoryError(client, result.error, result.message);
            }
        } catch (error) {
            console.error('[InventoryHandler] Erro ao usar item:', error);
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
            console.error('[InventoryHandler] Erro ao enviar atualização:', error);
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
