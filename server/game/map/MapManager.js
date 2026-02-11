

import path from 'path';
import { fileURLToPath } from 'url';
import { CollisionLoader } from './CollisionLoader.js';

export class MapManager {
    constructor() {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const projectRoot = path.resolve(__dirname, '..', '..', '..');
        const assetsDir = path.resolve(projectRoot, 'client', 'assets');

        this.collisionLoader = new CollisionLoader(assetsDir);
    }

    async loadMaps() {
        this.collisionLoader.loadAllCSVs();
        console.log('[MapManager] Matrizes de colisão carregadas:', Object.keys(this.collisionLoader.collisionData));
    }

    isWalkable(city, andar, x, y) {
        return this.collisionLoader.isWalkable(city, andar, x, y);
    }
}
