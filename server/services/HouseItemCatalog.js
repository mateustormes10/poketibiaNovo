import { ItemType } from '../../shared/protocol/InventoryProtocol.js';

// Catálogo mínimo de itens placeáveis em house.
// Mantém um ID numérico estável (item_id) para o client instanciar prefab.
// O inventário do player continua sendo o "source of truth" (item_name + item_type + quantity).

const HOUSE_ITEMS = [
    { item_id: 1001, name: 'House Chair', type: ItemType.HOUSE },
    { item_id: 1002, name: 'House Table', type: ItemType.HOUSE },
    { item_id: 1003, name: 'House Bed', type: ItemType.HOUSE }
];

const byId = new Map(HOUSE_ITEMS.map(i => [Number(i.item_id), i]));

export function getHouseItemById(itemId) {
    return byId.get(Number(itemId)) || null;
}

export function getAllHouseItems() {
    return HOUSE_ITEMS.slice();
}
