/**
 * InventoryProtocol
 * 
 * Constantes de protocolo para comunicação de inventário
 * entre cliente e servidor
 */

// Ações de inventário enviadas pelo CLIENTE
export const InventoryClientEvents = {
    REQUEST_INVENTORY: 'inventory_request',
    USE_ITEM: 'inventory_use_item',
    DROP_ITEM: 'inventory_drop_item',
    MOVE_ITEM: 'inventory_move_item'
};

// Eventos de inventário enviados pelo SERVIDOR
export const InventoryServerEvents = {
    INVENTORY_DATA: 'inventory_data',
    INVENTORY_UPDATE: 'inventory_update',
    ITEM_USED: 'inventory_item_used',
    ITEM_ADDED: 'inventory_item_added',
    ITEM_REMOVED: 'inventory_item_removed',
    INVENTORY_ERROR: 'inventory_error'
};

// Tipos de itens
export const ItemType = {
    CONSUMABLE: 'consumable',    // Itens consumíveis (Poção, Revive, etc)
    BATTLE: 'battle',            // Itens de batalha (Pokébola, Great Ball, etc)
    KEY: 'key',                  // Itens-chave (Key Items)
    MISC: 'misc'                 // Itens diversos
};

// Configurações do inventário
export const InventoryConfig = {
    MAX_SLOTS: 40,
    GRID_COLUMNS: 5,
    GRID_ROWS: 8
};

// Códigos de erro
export const InventoryErrorCode = {
    ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
    INSUFFICIENT_QUANTITY: 'INSUFFICIENT_QUANTITY',
    INVENTORY_FULL: 'INVENTORY_FULL',
    CANNOT_USE_ITEM: 'CANNOT_USE_ITEM',
    INVALID_ITEM: 'INVALID_ITEM',
    PERMISSION_DENIED: 'PERMISSION_DENIED'
};
