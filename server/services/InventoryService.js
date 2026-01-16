/**
 * InventoryService
 * 
 * Lógica de negócio do sistema de inventário
 * Gerencia uso de itens, validações e efeitos
 */

import { ItemType } from '../../shared/protocol/InventoryProtocol.js';

// Definição de itens e seus efeitos
export const ItemDefinitions = {
    // Itens Consumíveis
    'Poção': {
        type: ItemType.CONSUMABLE,
        description: 'Restaura 100 HP do jogador.',
        effect: 'heal',
        value: 100
    },
    'Super Poção': {
        type: ItemType.CONSUMABLE,
        description: 'Restaura 200 HP do jogador.',
        effect: 'heal',
        value: 200
    },
    'Hyper Poção': {
        type: ItemType.CONSUMABLE,
        description: 'Restaura 200 HP de um Pokémon.',
        effect: 'heal',
        value: 400
    },
    'Revive': {
        type: ItemType.CONSUMABLE,
        description: 'Revive um Pokémon desmaiado com metade do HP.',
        effect: 'revive',
        value: 0.5
    },
    
    // Itens de Batalha
    'Pokébola': {
        type: ItemType.BATTLE,
        description: 'Uma bola para capturar Pokémon selvagens.',
        effect: 'capture',
        value: 1.0
    },
    'Great Ball': {
        type: ItemType.BATTLE,
        description: 'Uma bola melhor para capturar Pokémon.',
        effect: 'capture',
        value: 1.5
    },
    'Ultra Ball': {
        type: ItemType.BATTLE,
        description: 'Uma bola muito boa para capturar Pokémon.',
        effect: 'capture',
        value: 2.0
    },
    
    // Itens Diversos
    'Gold Coin': {
        type: ItemType.MISC,
        description: 'Moeda do jogo.',
        effect: 'none',
        value: 1
    }
};

export class InventoryService {
    constructor(inventoryRepository, playerRepository, pokemonRepository) {
        this.inventoryRepository = inventoryRepository;
        this.playerRepository = playerRepository;
        this.pokemonRepository = pokemonRepository;
    }

    /**
     * Obtém o inventário completo de um player
     * @param {number} playerId - ID do player
     * @returns {Promise<Object>} Inventário formatado
     */
    async getPlayerInventory(playerId) {
        const items = await this.inventoryRepository.getInventory(playerId);
        
        // Adiciona descrições aos itens
        const itemsWithDetails = items.map(item => ({
            item_type: item.item_type,
            item_name: item.item_name,
            quantity: item.quantity,
            description: ItemDefinitions[item.item_name]?.description || 'Item desconhecido'
        }));

        return {
            maxSlots: 40,
            items: itemsWithDetails
        };
    }

    /**
     * Usa um item do inventário
     * @param {number} playerId - ID do player
     * @param {string} itemName - Nome do item
     * @param {Object} context - Contexto de uso (ex: pokemonId)
     * @returns {Promise<Object>} Resultado do uso
     */
    async useItem(playerId, itemName, context = {}) {
        // Verifica se o player possui o item
        console.log('[InventoryService] playerId recebido em useItem:', playerId);
        const items = await this.inventoryRepository.getInventory(playerId);
        console.log('[InventoryService] Tentando usar item:', itemName);
        console.log('[InventoryService] Inventário do player:', items.map(i => i.item_name));
        const hasItem = items.some(i => i.item_name === itemName);
        if (!hasItem) {
            return {
                success: false,
                error: 'ITEM_NOT_FOUND',
                message: 'Você não possui este item.'
            };
        }

        // Obtém definição do item
        const itemDef = ItemDefinitions[itemName];
        
        if (!itemDef) {
            return {
                success: false,
                error: 'INVALID_ITEM',
                message: 'Item inválido.'
            };
        }

        // Aplica efeito do item baseado no tipo
        let result;
        if (itemName === 'Gold Coin') {
            // Adiciona Gold Coin ao saldo do player usando BalanceRepository
            const gameWorld = global.gameWorld || (globalThis && globalThis.gameWorld);
            if (!gameWorld || !gameWorld.balanceRepository) {
                return {
                    success: false,
                    error: 'NO_BALANCE_REPO',
                    message: 'BalanceRepository não disponível.'
                };
            }
            const coinValue = itemDef.value || 1;
            // Atualiza saldo no banco
            const newBalance = await gameWorld.balanceRepository.addGold(playerId, coinValue);
            // Atualiza o campo goldCoin do player em memória (GameWorld)
            if (gameWorld.players) {
                let playerObj = gameWorld.players.get(playerId);
                // Se não achou, tenta por string ou id/dbId
                if (!playerObj) {
                    for (const p of gameWorld.players.values()) {
                        if (p.dbId == playerId || p.id == playerId || p.id == String(playerId) || p.dbId == String(playerId)) {
                            playerObj = p;
                            break;
                        }
                    }
                }
                if (playerObj) playerObj.goldCoin = newBalance;
            }
            // Remove o item do inventário
            await this.inventoryRepository.removeItem(playerId, itemName, 1);
            return {
                success: true,
                message: `Você usou uma Gold Coin e recebeu ${coinValue} gold!`,
                effect: 'gold',
                value: coinValue,
                balance: newBalance
            };
        } else {
            switch (itemDef.effect) {
                case 'heal':
                    result = await this.applyHealEffect(playerId, itemDef.value, context);
                    break;
                case 'revive':
                    result = await this.applyReviveEffect(playerId, itemDef.value, context);
                    break;
                case 'capture':
                    result = await this.applyCaptureEffect(playerId, itemDef.value, context);
                    break;
                default:
                    return {
                        success: false,
                        error: 'CANNOT_USE_ITEM',
                        message: 'Este item não pode ser usado agora.'
                    };
            }
            // Se o uso foi bem-sucedido, remove o item
            if (result.success) {
                await this.inventoryRepository.removeItem(playerId, itemName, 1);
            }
            return result;
        }
    }

    /**
     * Aplica efeito de cura
     * @private
     */
    async applyHealEffect(playerId, healValue, context) {
        // Busca o player ativo no GameWorld
        const gameWorld = global.gameWorld || (globalThis && globalThis.gameWorld);
        if (!gameWorld || !gameWorld.players) {
            return {
                success: false,
                error: 'NO_GAMEWORLD',
                message: 'GameWorld não disponível.'
            };
        }
        let player = gameWorld.players.get(playerId);
        if (!player) {
            // Tenta buscar por id/dbId como string ou número
            for (const p of gameWorld.players.values()) {
                if (
                    p.dbId == playerId ||
                    p.id == playerId ||
                    p.id == String(playerId) ||
                    p.dbId == String(playerId)
                ) {
                    player = p;
                    break;
                }
            }
        }
        if (!player) {
            return {
                success: false,
                error: 'PLAYER_NOT_FOUND',
                message: 'Player não encontrado.'
            };
        }
        // Cura a quantidade correta de HP do item
        const before = player.hp;
        player.heal(healValue);
        const after = player.hp;
        // Atualiza no banco
        if (gameWorld.playerRepository && typeof gameWorld.playerRepository.updateHealth === 'function') {
            await gameWorld.playerRepository.updateHealth(playerId, player.hp, player.mana ?? 0);
        }
        return {
            success: true,
            message: `Item usado! Curou ${after-before} HP.`,
            effect: 'heal',
            value: after-before
        };
    }

    /**
     * Aplica efeito de reviver
     * @private
     */
    async applyReviveEffect(playerId, revivePercent, context) {
        // TODO: Implementar lógica de reviver Pokémon
        return {
            success: true,
            message: `Pokémon revivido!`,
            effect: 'revive'
        };
    }

    /**
     * Aplica efeito de captura
     * @private
     */
    async applyCaptureEffect(playerId, captureRate, context) {
        // TODO: Implementar lógica de captura
        return {
            success: false,
            message: 'Captura ainda não implementada.',
            effect: 'capture'
        };
    }

    /**
     * Adiciona um item ao inventário
     * @param {number} playerId - ID do player
     * @param {string} itemName - Nome do item
     * @param {number} quantity - Quantidade
     * @returns {Promise<Object>} Resultado
     */
    async giveItem(playerId, itemName, quantity = 1) {
        const itemDef = ItemDefinitions[itemName];
        
        if (!itemDef) {
            return {
                success: false,
                error: 'INVALID_ITEM',
                message: 'Item inválido.'
            };
        }

        // Verifica limite de slots
        const usedSlots = await this.inventoryRepository.getUsedSlots(playerId);
        const hasItemAlready = await this.inventoryRepository.hasItem(playerId, itemName);
        
        if (usedSlots >= 40 && !hasItemAlready) {
            return {
                success: false,
                error: 'INVENTORY_FULL',
                message: 'Inventário cheio!'
            };
        }

        await this.inventoryRepository.addItem(playerId, itemDef.type, itemName, quantity);

        return {
            success: true,
            message: `Você recebeu ${quantity}x ${itemName}!`
        };
    }

    /**
     * Remove um item do inventário
     * @param {number} playerId - ID do player
     * @param {string} itemName - Nome do item
     * @param {number} quantity - Quantidade
     * @returns {Promise<boolean>} Sucesso
     */
    async removeItem(playerId, itemName, quantity = 1) {
        return await this.inventoryRepository.removeItem(playerId, itemName, quantity);
    }

    /**
     * Verifica se o player tem espaço no inventário
     * @param {number} playerId - ID do player
     * @returns {Promise<boolean>}
     */
    async hasInventorySpace(playerId) {
        const usedSlots = await this.inventoryRepository.getUsedSlots(playerId);
        return usedSlots < 40;
    }
}
