

import path from 'path';
import { CollisionLoader } from './CollisionLoader.js';

export class MapManager {
    constructor() {
        // Ajuste o caminho conforme necessário
        this.collisionLoader = new CollisionLoader(path.resolve('./client/assets'));
    }

    async loadMaps() {
        this.collisionLoader.loadAllCSVs();
        console.log('[MapManager] Matrizes de colisão carregadas:', Object.keys(this.collisionLoader.collisionData));
    }

    isWalkable(city, andar, x, y) {
        return this.collisionLoader.isWalkable(city, andar, x, y);
    }
}
