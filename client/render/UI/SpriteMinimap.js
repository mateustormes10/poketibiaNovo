// SpriteMinimap.js
// Utilitário para desenhar miniaturas de sprites no minimapa

import { TileSet } from '../TileSet.js';

export class SpriteMinimap {
    constructor(tileSize = 8) {
        this.tileSet = new TileSet();
        this.tileSize = tileSize;
    }

    async drawSpriteOrFallback(ctx, spriteId, x, y) {
        // Tenta desenhar a sprite, se não conseguir, desenha cor de fallback
        await this.tileSet.loadSprite(spriteId);
        this.tileSet.drawTile(ctx, spriteId, x, y, this.tileSize);
    }
}
