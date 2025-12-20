import { Logger } from '../../utils/Logger.js';

const logger = new Logger('DeltaManager');

/**
 * Gerenciador de Deltas de Estado
 * Envia apenas mudanças ao invés de snapshots completos
 */
export class DeltaManager {
    constructor() {
        this.lastStates = new Map(); // playerId -> lastKnownState
    }
    
    /**
     * Calcula delta entre estado atual e último estado conhecido
     */
    calculatePlayerDelta(playerId, currentState) {
        const lastState = this.lastStates.get(playerId) || {};
        const delta = {};
        let hasChanges = false;
        
        // Compara cada propriedade
        for (const key in currentState) {
            if (currentState[key] !== lastState[key]) {
                delta[key] = currentState[key];
                hasChanges = true;
            }
        }
        
        // Atualiza último estado
        if (hasChanges) {
            this.lastStates.set(playerId, { ...currentState });
        }
        
        return hasChanges ? delta : null;
    }
    
    /**
     * Calcula delta para múltiplas entidades
     */
    calculateEntitiesDelta(observerId, currentEntities) {
        const stateKey = `${observerId}_entities`;
        const lastEntityIds = this.lastStates.get(stateKey) || new Set();
        const currentEntityIds = new Set(currentEntities.map(e => e.id));
        
        const delta = {
            spawned: [], // Entidades que entraram na visão
            updated: [], // Entidades que mudaram
            despawned: [] // Entidades que saíram da visão
        };
        
        // Detecta spawns (novos na visão)
        currentEntities.forEach(entity => {
            if (!lastEntityIds.has(entity.id)) {
                delta.spawned.push(entity);
            } else {
                // Verifica se mudou
                const entityDelta = this.calculateEntityDelta(
                    `${observerId}_${entity.id}`,
                    entity
                );
                if (entityDelta) {
                    delta.updated.push({ id: entity.id, ...entityDelta });
                }
            }
        });
        
        // Detecta despawns (saíram da visão)
        lastEntityIds.forEach(id => {
            if (!currentEntityIds.has(id)) {
                delta.despawned.push(id);
            }
        });
        
        // Atualiza estado
        this.lastStates.set(stateKey, currentEntityIds);
        
        // Retorna apenas se houver mudanças
        const hasChanges = delta.spawned.length > 0 || 
                          delta.updated.length > 0 || 
                          delta.despawned.length > 0;
        
        return hasChanges ? delta : null;
    }
    
    /**
     * Calcula delta de uma entidade específica
     */
    calculateEntityDelta(entityKey, currentState) {
        const lastState = this.lastStates.get(entityKey) || {};
        const delta = {};
        let hasChanges = false;
        
        // Propriedades importantes para comparar
        const props = ['x', 'y', 'z', 'hp', 'maxHp', 'direction', 'level'];
        
        for (const prop of props) {
            if (currentState[prop] !== lastState[prop]) {
                delta[prop] = currentState[prop];
                hasChanges = true;
            }
        }
        
        if (hasChanges) {
            this.lastStates.set(entityKey, { ...currentState });
        }
        
        return hasChanges ? delta : null;
    }
    
    /**
     * Calcula delta do mapa (tiles visíveis)
     */
    calculateMapDelta(observerId, currentTiles) {
        const stateKey = `${observerId}_map`;
        const lastTiles = this.lastStates.get(stateKey) || new Set();
        const currentTileKeys = new Set();
        
        const delta = {
            added: [],
            removed: []
        };
        
        // Converte tiles para chaves
        currentTiles.forEach(tile => {
            const key = `${tile.x},${tile.y},${tile.z}`;
            currentTileKeys.add(key);
            
            if (!lastTiles.has(key)) {
                delta.added.push(tile);
            }
        });
        
        // Detecta tiles removidos
        lastTiles.forEach(key => {
            if (!currentTileKeys.has(key)) {
                const [x, y, z] = key.split(',').map(Number);
                delta.removed.push({ x, y, z });
            }
        });
        
        // Atualiza estado
        this.lastStates.set(stateKey, currentTileKeys);
        
        const hasChanges = delta.added.length > 0 || delta.removed.length > 0;
        return hasChanges ? delta : null;
    }
    
    /**
     * Remove estado de um observador
     */
    clearObserver(observerId) {
        const keysToDelete = [];
        
        for (const key of this.lastStates.keys()) {
            if (key.startsWith(observerId)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.lastStates.delete(key));
    }
    
    /**
     * Força reenvio completo (útil após reconexão)
     */
    forceFullUpdate(observerId) {
        this.clearObserver(observerId);
    }
    
    /**
     * Estatísticas
     */
    getStats() {
        return {
            trackedStates: this.lastStates.size,
            memoryUsage: this.lastStates.size * 64 // Estimativa em bytes
        };
    }
}
