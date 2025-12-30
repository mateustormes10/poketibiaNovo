/**
 * InventoryRepository
 * 
 * Gerencia persistência do inventário dos players no banco de dados
 * Fonte da verdade para todos os itens
 */

export class InventoryRepository {
    constructor(database) {
        this.db = database;
    }

    /**
     * Busca todo o inventário de um player
     * @param {number} playerId - ID do player
     * @returns {Promise<Array>} Lista de itens
     */
    async getInventory(playerId) {
        const sql = `
            SELECT 
                id, 
                player_id, 
                item_type, 
                item_name, 
                quantity
            FROM player_inventory 
            WHERE player_id = ? AND quantity > 0
            ORDER BY created_at ASC
        `;
            console.log('[InventoryRepository] getInventory playerId:', playerId);
            return await this.db.query(sql, [playerId]);
    }

    /**
     * Busca um item específico no inventário
     * @param {number} playerId - ID do player
     * @param {string} itemName - Nome do item
     * @returns {Promise<Object|null>} Item encontrado ou null
     */
    async getItem(playerId, itemName) {
        const sql = `
            SELECT * FROM player_inventory 
            WHERE player_id = ? AND item_name = ? AND quantity > 0
        `;
        return await this.db.queryOne(sql, [playerId, itemName]);
    }

    /**
     * Adiciona um item ao inventário
     * Se o item já existe, incrementa a quantidade
     * @param {number} playerId - ID do player
     * @param {string} itemType - Tipo do item
     * @param {string} itemName - Nome do item
     * @param {number} quantity - Quantidade a adicionar
     * @returns {Promise<boolean>} Sucesso da operação
     */
    async addItem(playerId, itemType, itemName, quantity = 1) {
        if (quantity <= 0) {
            return false;
        }

        // Verifica se o item já existe
        const existingItem = await this.getItem(playerId, itemName);

        if (existingItem) {
            // Atualiza quantidade
            const sql = `
                UPDATE player_inventory 
                SET quantity = quantity + ?
                WHERE player_id = ? AND item_name = ?
            `;
            await this.db.update(sql, [quantity, playerId, itemName]);
        } else {
            // Insere novo item
            const sql = `
                INSERT INTO player_inventory (player_id, item_type, item_name, quantity)
                VALUES (?, ?, ?, ?)
            `;
            await this.db.insert(sql, [playerId, itemType, itemName, quantity]);
        }

        return true;
    }

    /**
     * Remove uma quantidade de um item do inventário
     * @param {number} playerId - ID do player
     * @param {string} itemName - Nome do item
     * @param {number} quantity - Quantidade a remover
     * @returns {Promise<boolean>} Sucesso da operação
     */
    async removeItem(playerId, itemName, quantity = 1) {
        if (quantity <= 0) {
            return false;
        }

        const existingItem = await this.getItem(playerId, itemName);

        if (!existingItem) {
            return false;
        }

        if (existingItem.quantity < quantity) {
            return false; // Quantidade insuficiente
        }

        const newQuantity = existingItem.quantity - quantity;

        if (newQuantity <= 0) {
            // Remove o item completamente
            const sql = `
                DELETE FROM player_inventory 
                WHERE player_id = ? AND item_name = ?
            `;
            await this.db.update(sql, [playerId, itemName]);
        } else {
            // Atualiza quantidade
            const sql = `
                UPDATE player_inventory 
                SET quantity = ?
                WHERE player_id = ? AND item_name = ?
            `;
            await this.db.update(sql, [newQuantity, playerId, itemName]);
        }

        return true;
    }

    /**
     * Define a quantidade específica de um item
     * @param {number} playerId - ID do player
     * @param {string} itemName - Nome do item
     * @param {number} quantity - Nova quantidade
     * @returns {Promise<boolean>} Sucesso da operação
     */
    async setItemQuantity(playerId, itemName, quantity) {
        if (quantity < 0) {
            return false;
        }

        const existingItem = await this.getItem(playerId, itemName);

        if (!existingItem) {
            return false;
        }

        if (quantity === 0) {
            // Remove o item
            const sql = `
                DELETE FROM player_inventory 
                WHERE player_id = ? AND item_name = ?
            `;
            await this.db.update(sql, [playerId, itemName]);
        } else {
            // Atualiza quantidade
            const sql = `
                UPDATE player_inventory 
                SET quantity = ?
                WHERE player_id = ? AND item_name = ?
            `;
            await this.db.update(sql, [quantity, playerId, itemName]);
        }

        return true;
    }

    /**
     * Verifica se o player possui uma quantidade específica de um item
     * @param {number} playerId - ID do player
     * @param {string} itemName - Nome do item
     * @param {number} quantity - Quantidade a verificar
     * @returns {Promise<boolean>} true se possui a quantidade
     */
    async hasItem(playerId, itemName, quantity = 1) {
        const item = await this.getItem(playerId, itemName);
        return item && item.quantity >= quantity;
    }

    /**
     * Retorna a quantidade de um item que o player possui
     * @param {number} playerId - ID do player
     * @param {string} itemName - Nome do item
     * @returns {Promise<number>} Quantidade do item
     */
    async getItemQuantity(playerId, itemName) {
        const item = await this.getItem(playerId, itemName);
        return item ? item.quantity : 0;
    }

    /**
     * Conta quantos slots estão ocupados no inventário
     * @param {number} playerId - ID do player
     * @returns {Promise<number>} Número de slots ocupados
     */
    async getUsedSlots(playerId) {
        const sql = `
            SELECT COUNT(*) as count 
            FROM player_inventory 
            WHERE player_id = ? AND quantity > 0
        `;
        const result = await this.db.queryOne(sql, [playerId]);
        return result ? result.count : 0;
    }

    /**
     * Limpa completamente o inventário de um player
     * @param {number} playerId - ID do player
     * @returns {Promise<boolean>} Sucesso da operação
     */
    async clearInventory(playerId) {
        const sql = `DELETE FROM player_inventory WHERE player_id = ?`;
        await this.db.update(sql, [playerId]);
        return true;
    }

    // Métodos legados (para compatibilidade)
    async loadInventory(playerId) {
        return await this.getInventory(playerId);
    }

    async saveInventory(playerId, items) {
        // Implementar salvamento no banco se necessário
        return true;
    }
}

