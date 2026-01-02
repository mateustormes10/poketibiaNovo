// Exemplo de uso (chame isso quando um Pokémon selvagem for derrotado pelo player):
// registerDefeatedMonster(playerId, { name: 'Charmander', level: 12 });
// server/handlers/scanHandler.js
// Sistema de Scanner de Pokémon (compatível com player_inventory)

import { Logger } from '../utils/Logger.js';

const logger = new Logger('ScanHandler');

// Estrutura temporária para derrotados (ideal: mover para Player/GameWorld)
const defeatedMonsters = new Map(); // playerId -> [{ name, level }]

export function registerDefeatedMonster(playerId, monster) {
    if (!defeatedMonsters.has(playerId)) {
        defeatedMonsters.set(playerId, []);
    }
    defeatedMonsters.get(playerId).push(monster);
}

export function clearDefeatedMonsters(playerId) {
    defeatedMonsters.set(playerId, []);
}

export function getDefeatedMonsters(playerId) {
    return defeatedMonsters.get(playerId) || [];
}

/**
 * Processa o scan dos Pokémon derrotados
 * @param {number} playerId
 * @param {object} inventoryRepository
 * @param {string} scannerType - Ex: 'BASIC', 'ADVANCED'
 * @returns {Promise<{success: boolean, scanned: number, reason?: string}>}
 */
export async function scanDefeatedMonsters(playerId, inventoryRepository, scannerType = 'BASIC') {
    const monsters = getDefeatedMonsters(playerId);
    if (!monsters || monsters.length === 0) {
        return { success: false, reason: 'nothing_to_scan' };
    }
    for (const monster of monsters) {
        const itemName = `SCAN:${monster.name}:LVL${monster.level}:${scannerType}`;
        await inventoryRepository.addItem(playerId, 'scanner_monster', itemName, 1);
        logger.info(`[SCAN] Player ${playerId} escaneou ${itemName}`);
    }
    clearDefeatedMonsters(playerId);
    return { success: true, scanned: monsters.length };
}
