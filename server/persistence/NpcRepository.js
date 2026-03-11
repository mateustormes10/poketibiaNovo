export class NpcRepository {
    constructor(database) {
        this.db = database;
    }

    /**
     * Carrega todos os NPCs do mapa
     */
    async loadAll() {
        const result = await this.db.query(
            'SELECT * FROM npcs ORDER BY id'
        );

        return result;
    }

    /**
     * Carrega NPCs por andar (z)
     */
    async loadByFloor(z) {
        const result = await this.db.query(
            'SELECT * FROM npcs WHERE z = ?',
            [z]
        );

        return result;
    }

    /**
     * Busca um NPC por ID
     */
    async findById(npcId) {
        const result = await this.db.query(
            'SELECT * FROM npcs WHERE id = ?',
            [npcId]
        );

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Carrega itens da loja de um NPC
     */
    async loadShopItems(npcId) {
        const result = await this.db.query(
            'SELECT * FROM npc_shop_items WHERE npc_id = ?',
            [npcId]
        );

        return result;
    }

    /**
     * Busca o preço (buy/base) de um item para um NPC específico.
     * Retorna null se não existir.
     */
    async getShopItemByName(npcId, itemName) {
        return await this.db.queryOne(
            'SELECT * FROM npc_shop_items WHERE npc_id = ? AND item_name = ? LIMIT 1',
            [npcId, itemName]
        );
    }

    /**
     * Busca um preço base global (máximo) para um item em qualquer NPC.
     * Útil para vender itens mesmo se o NPC atual não vender o item.
     */
    async getAnyShopItemByName(itemName) {
        return await this.db.queryOne(
            'SELECT item_name, item_type, MAX(price) AS price FROM npc_shop_items WHERE item_name = ? GROUP BY item_name, item_type',
            [itemName]
        );
    }
}
