/**
 * InventoryDTO
 * 
 * Estrutura padronizada de dados do inventário
 * Usado para comunicação entre cliente e servidor
 */

export class InventoryDTO {
    /**
     * Cria um DTO de inventário completo
     * @param {number} maxSlots - Número máximo de slots
     * @param {Array<InventoryItemDTO>} items - Lista de itens
     */
    static create(maxSlots, items) {
        return {
            maxSlots: maxSlots || 40,
            items: items || []
        };
    }

    /**
     * Cria um DTO de item individual
     * @param {string} itemType - Tipo do item (consumable, key, battle)
     * @param {string} itemName - Nome do item
     * @param {number} quantity - Quantidade
     * @param {string} description - Descrição do item
     */
    static createItem(itemType, itemName, quantity, description = '') {
        return {
            item_type: itemType,
            item_name: itemName,
            quantity: quantity,
            description: description
        };
    }

    /**
     * Valida um item do inventário
     * @param {Object} item - Item a validar
     * @returns {boolean}
     */
    static validateItem(item) {
        return (
            item &&
            typeof item.item_type === 'string' &&
            typeof item.item_name === 'string' &&
            typeof item.quantity === 'number' &&
            item.quantity >= 0
        );
    }

    /**
     * Valida um inventário completo
     * @param {Object} inventory - Inventário a validar
     * @returns {boolean}
     */
    static validate(inventory) {
        if (!inventory || typeof inventory.maxSlots !== 'number') {
            return false;
        }

        if (!Array.isArray(inventory.items)) {
            return false;
        }

        return inventory.items.every(item => InventoryDTO.validateItem(item));
    }
}
