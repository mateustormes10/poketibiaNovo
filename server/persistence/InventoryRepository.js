export class InventoryRepository {
    constructor(database) {
        this.db = database;
    }
    
    async loadInventory(playerId) {
        const result = await this.db.query(
            'SELECT * FROM player_inventory WHERE player_id = ?',
            [playerId]
        );
        return result;
    }
    
    async saveInventory(playerId, items) {
        // Implementar salvamento no banco
        return true;
    }
    
    async addItem(playerId, itemType, itemName, quantity) {
        // Verifica se o item já existe no inventário
        const existing = await this.db.query(
            'SELECT * FROM player_inventory WHERE player_id = ? AND item_type = ?',
            [playerId, itemType]
        );
        
        if (existing.length > 0) {
            // Atualiza quantidade
            await this.db.query(
                'UPDATE player_inventory SET quantity = quantity + ? WHERE player_id = ? AND item_type = ?',
                [quantity, playerId, itemType]
            );
        } else {
            // Insere novo item
            await this.db.query(
                'INSERT INTO player_inventory (player_id, item_type, item_name, quantity) VALUES (?, ?, ?, ?)',
                [playerId, itemType, itemName, quantity]
            );
        }
        
        return true;
    }
}
