// Exemplo de uso (chame isso quando um Pokémon selvagem for derrotado pelo player):
// registerDefeatedMonster(playerId, { name: 'Charmander', level: 12 });
// server/handlers/scanHandler.js
// Sistema de Scanner de Pokémon (compatível com player_inventory)

import { Logger } from '../utils/Logger.js';
import { getScanSuccessChance } from '../utils/PlayerStats.js';

const logger = new Logger('ScanHandler');

// Estrutura temporária para derrotados (legado). Mantido por compatibilidade.
// OBS: o scan novo usa o cadáver real (wildPokemon) e não esta lista.
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

function isNear(player, monster) {
    if (!player || !monster) return false;
    if (player.z !== monster.z) return false;
    const dx = Math.abs((player.x ?? 0) - (monster.x ?? 0));
    const dy = Math.abs((player.y ?? 0) - (monster.y ?? 0));
    // Mesmo critério do client: adjacente (não na mesma tile)
    return dx <= 1 && dy <= 1 && (dx !== 0 || dy !== 0);
}

/**
 * Scan de UM cadáver próximo (com chance).
 * Remove/oculta o corpo para não permitir múltiplos scans.
 *
 * @param {object} player - player autenticado (server-side)
 * @param {object} gameWorld
 * @param {object} inventoryRepository
 * @param {object} data - payload do client: { monsterId?, scannerType? }
 * @returns {Promise<{success: boolean, scanned: number, reason?: string, monsterId?: number, x?: number, y?: number, z?: number}>}
 */
export async function scanNearbyCorpse(player, gameWorld, inventoryRepository, data = {}) {
    if (!player) {
        return { success: false, scanned: 0, reason: 'not_authenticated' };
    }

    const scannerType = (data && data.scannerType) || 'BASIC';
    const monsterIdRaw = data && (data.monsterId ?? data.monster_id);
    const monsterId = monsterIdRaw !== undefined && monsterIdRaw !== null && monsterIdRaw !== ''
        ? Number(monsterIdRaw)
        : null;

    const manager = gameWorld?.wildPokemonManager;
    const wildMap = manager?.wildPokemons;
    if (!manager || !wildMap) {
        return { success: false, scanned: 0, reason: 'wild_manager_unavailable' };
    }

    let target = null;
    if (monsterId) {
        target = wildMap.get(monsterId) || null;
    }

    // Fallback: procura qualquer cadáver adjacente (se client não mandou id)
    if (!target) {
        for (const wild of wildMap.values()) {
            if (!wild) continue;
            const dead = (wild.isDead === true) || (typeof wild.hp === 'number' && wild.hp <= 0);
            if (!dead) continue;
            if (wild.isHidden) continue;
            if (wild.corpseScanned) continue;
            if (!isNear(player, wild)) continue;
            target = wild;
            break;
        }
    }

    if (!target) {
        return { success: false, scanned: 0, reason: 'nothing_to_scan' };
    }

    const dead = (target.isDead === true) || (typeof target.hp === 'number' && target.hp <= 0);
    if (!dead) {
        return { success: false, scanned: 0, reason: 'target_not_dead', monsterId: target.id, x: target.x, y: target.y, z: target.z };
    }
    if (target.isHidden || target.corpseScanned) {
        return { success: false, scanned: 0, reason: 'already_scanned', monsterId: target.id, x: target.x, y: target.y, z: target.z };
    }
    if (!isNear(player, target)) {
        return { success: false, scanned: 0, reason: 'not_near_corpse', monsterId: target.id, x: target.x, y: target.y, z: target.z };
    }

    const chance = getScanSuccessChance(player);
    const roll = Math.random();
    const ok = roll < chance;

    // Após tentar, o corpo some para evitar spam (independente de sucesso)
    target.corpseScanned = true;
    target.isHidden = true;
    try {
        // Broadcast despawn para todos (client remove o GameObject do monstro morto)
        if (typeof manager.broadcastDespawn === 'function') {
            manager.broadcastDespawn(target.id);
        }
    } catch (e) {
        logger.warn('[SCAN] Falha ao broadcastDespawn:', e?.message || e);
    }

    if (!ok) {
        logger.info(`[SCAN] FAIL player=${player.dbId || player.id} monster=${target.name} (id=${target.id}) roll=${roll.toFixed(3)} chance=${chance.toFixed(3)}`);
        return { success: false, scanned: 0, reason: 'scan_failed', monsterId: target.id, x: target.x, y: target.y, z: target.z };
    }

    const playerId = player.dbId || player.id;
    const itemName = `SCAN:${target.name}:LVL${target.level || 1}:${scannerType}`;
    await inventoryRepository.addItem(playerId, 'scanner_monster', itemName, 1);
    logger.info(`[SCAN] OK player=${playerId} addItem=${itemName} monsterId=${target.id} roll=${roll.toFixed(3)} chance=${chance.toFixed(3)}`);
    return { success: true, scanned: 1, monsterId: target.id, x: target.x, y: target.y, z: target.z };
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
        return { success: false, scanned: 0, reason: 'nothing_to_scan' };
    }
    for (const monster of monsters) {
        const itemName = `SCAN:${monster.name}:LVL${monster.level}:${scannerType}`;
        await inventoryRepository.addItem(playerId, 'scanner_monster', itemName, 1);
        logger.info(`[SCAN] Player ${playerId} escaneou ${itemName}`);
    }
    clearDefeatedMonsters(playerId);
    return { success: true, scanned: monsters.length };
}
