import { Logger } from '../../utils/Logger.js';

const logger = new Logger('SpatialGrid');

/**
 * Sistema de Grid Espacial para indexação eficiente de entidades
 * Divide o mundo em células para busca O(1) ao invés de O(n)
 */
export class SpatialGrid {
    constructor(cellSize = 64) {
        this.cellSize = cellSize; // Tamanho de cada célula (tiles)
        this.grid = new Map(); // Map de "x,y,z" -> Set<entity>
        this.entityToCell = new Map(); // Map de entityId -> "x,y,z"
    }
    
    /**
     * Converte coordenadas de mundo para coordenadas de célula
     */
    worldToCell(x, y, z) {
        return {
            cx: Math.floor(x / this.cellSize),
            cy: Math.floor(y / this.cellSize),
            cz: z
        };
    }
    
    /**
     * Cria chave única para célula
     */
    getCellKey(cx, cy, cz) {
        return `${cx},${cy},${cz}`;
    }
    
    /**
     * Adiciona entidade ao grid
     */
    insert(entity) {
        if (!entity || entity.x === undefined || entity.y === undefined) {
            return;
        }
        
        const { cx, cy, cz } = this.worldToCell(entity.x, entity.y, entity.z);
        const cellKey = this.getCellKey(cx, cy, cz);
        
        // Remove da célula anterior se existir
        this.remove(entity.id);
        
        // Adiciona à nova célula
        if (!this.grid.has(cellKey)) {
            this.grid.set(cellKey, new Set());
        }
        
        this.grid.get(cellKey).add(entity);
        this.entityToCell.set(entity.id, cellKey);
    }
    
    /**
     * Remove entidade do grid
     */
    remove(entityId) {
        const cellKey = this.entityToCell.get(entityId);
        if (!cellKey) return;
        
        const cell = this.grid.get(cellKey);
        if (cell) {
            // Remove a entidade procurando pelo id
            for (const entity of cell) {
                if (entity.id === entityId) {
                    cell.delete(entity);
                    break;
                }
            }
            
            // Remove célula vazia
            if (cell.size === 0) {
                this.grid.delete(cellKey);
            }
        }
        
        this.entityToCell.delete(entityId);
    }
    
    /**
     * Atualiza posição de uma entidade
     */
    update(entity) {
        this.insert(entity); // Insert já remove da posição antiga
    }
    
    /**
     * Busca entidades em uma área (range em tiles)
     */
    queryRange(x, y, z, range) {
        const entities = new Set();
        
        const { cx: centerCX, cy: centerCY } = this.worldToCell(x, y, z);
        const cellRange = Math.ceil(range / this.cellSize);
        
        // Itera sobre células vizinhas
        for (let dy = -cellRange; dy <= cellRange; dy++) {
            for (let dx = -cellRange; dx <= cellRange; dx++) {
                const cellKey = this.getCellKey(
                    centerCX + dx,
                    centerCY + dy,
                    z
                );
                
                const cell = this.grid.get(cellKey);
                if (!cell) continue;
                
                // Filtra por distância real
                for (const entity of cell) {
                    const dist = Math.max(
                        Math.abs(entity.x - x),
                        Math.abs(entity.y - y)
                    );
                    
                    if (dist <= range) {
                        entities.add(entity);
                    }
                }
            }
        }
        
        return Array.from(entities);
    }
    
    /**
     * Busca entidades em uma célula específica
     */
    queryCell(x, y, z) {
        const { cx, cy, cz } = this.worldToCell(x, y, z);
        const cellKey = this.getCellKey(cx, cy, cz);
        const cell = this.grid.get(cellKey);
        
        return cell ? Array.from(cell) : [];
    }
    
    /**
     * Busca entidade exata em uma posição
     */
    queryExact(x, y, z) {
        const entities = this.queryCell(x, y, z);
        return entities.filter(e => e.x === x && e.y === y && e.z === z);
    }
    
    /**
     * Estatísticas do grid
     */
    getStats() {
        return {
            cells: this.grid.size,
            entities: this.entityToCell.size,
            avgEntitiesPerCell: this.entityToCell.size / (this.grid.size || 1)
        };
    }
    
    /**
     * Limpa todo o grid
     */
    clear() {
        this.grid.clear();
        this.entityToCell.clear();
    }
}
