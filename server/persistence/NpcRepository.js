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
}
