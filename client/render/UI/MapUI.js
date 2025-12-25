import { SpriteMinimap } from './SpriteMinimap.js';

export class MapUI {
    constructor(canvas, gameState, map) {
        this.canvas = canvas;
        this.gameState = gameState;
        this.map = map;
        this.visible = false;
        this.fullMapData = null; // 2D array for full map
        this.fullMapZ = null; // Z level of loaded map
        this.loadingFullMap = false;
        this.spriteMinimap = new SpriteMinimap(8); // tileSize = 8
        this._createElement();
    }

    _createElement() {
        this.el = document.createElement('div');
        this.el.id = 'map-ui';
        this.el.style.position = 'fixed';
        this.el.style.top = '50%';
        this.el.style.left = '50%';
        this.el.style.transform = 'translate(-50%, -50%)';
        this.el.style.background = 'rgba(20,20,20,0.98)';
        this.el.style.border = '4px solid #FFD700';
        this.el.style.borderRadius = '18px';
        this.el.style.zIndex = '10010';
        this.el.style.display = 'none';
        this.el.style.boxShadow = '0 0 64px #000a';
        this.el.style.padding = '24px';
        this.el.style.maxWidth = '90vw';
        this.el.style.maxHeight = '90vh';
        this.el.style.overflow = 'auto';
        // Canvas para o mapa
        this.mapCanvas = document.createElement('canvas');
        this.mapCanvas.id = 'map-ui-canvas';
        this.mapCanvas.style.display = 'block';
        this.mapCanvas.style.margin = '0 auto';
        this.el.appendChild(this.mapCanvas);
        // Botão fechar
        this.closeBtn = document.createElement('button');
        this.closeBtn.textContent = 'Fechar (ESC)';
        this.closeBtn.style = 'display:block;margin:24px auto 0 auto;padding:12px 48px;font-size:1.2em;border-radius:8px;border:none;background:#a22;color:#fff;cursor:pointer;';
        this.closeBtn.onclick = () => this.hide();
        this.el.appendChild(this.closeBtn);
        document.body.appendChild(this.el);
    }

    async show() {
        this.visible = true;
        this.el.style.display = 'block';
        // Load full map if not loaded or z changed
        const z = this.gameState.localPlayer?.z || 7;
        if (!this.fullMapData || this.fullMapZ !== z) {
            await this.loadFullMap(z);
        }
        this.renderMap();
    }
    async loadFullMap(z) {
        this.loadingFullMap = true;
        const file = `client/assets/map_z${z}.txt`;
        try {
            // Try fetch relative to site root
            let response = await fetch(file);
            if (!response.ok) {
                // Try fallback (for dev environments)
                response = await fetch(`assets/map_z${z}.txt`);
            }
            const text = await response.text();
            // Parse map: each line = row, each [id,?] = tile
            const rows = text.trim().split(/\r?\n/);
            this.fullMapData = rows.map(row => row.trim().split(/\s+/).map(cell => {
                // Parse cell like [9912,S]
                const match = cell.match(/\[(\d+),([A-Za-z])\]/);
                if (match) {
                    return {
                        spriteId: parseInt(match[1], 10),
                        type: match[2],
                        walkable: match[2] !== 'W', // Example: 'W' = wall
                    };
                }
                return { spriteId: 100, type: 'U', walkable: false };
            }));
            this.fullMapZ = z;
        } catch (e) {
            console.error('Erro ao carregar mapa completo:', e);
            this.fullMapData = null;
        }
        this.loadingFullMap = false;
    }

    hide() {
        this.visible = false;
        this.el.style.display = 'none';
    }

    toggle() {
        if (this.visible) this.hide();
        else this.show();
    }

    async renderMap() {
        // Render full map if available
        const tileSize = 8;
        if (this.fullMapData) {
            const rows = this.fullMapData;
            const width = rows[0]?.length ? rows[0].length * tileSize : 500 * tileSize;
            const height = rows.length * tileSize;
            this.mapCanvas.width = width;
            this.mapCanvas.height = height;
            const ctx = this.mapCanvas.getContext('2d');
            ctx.clearRect(0, 0, width, height);
            // Draw all tiles using sprite thumbnails or fallback color
            const drawPromises = [];
            for (let y = 0; y < rows.length; y++) {
                for (let x = 0; x < rows[y].length; x++) {
                    const tile = rows[y][x];
                    drawPromises.push(
                        this.spriteMinimap.drawSpriteOrFallback(ctx, tile.spriteId, x * tileSize, y * tileSize)
                    );
                }
            }
            await Promise.all(drawPromises);
            // Player marker
            const player = this.gameState.localPlayer;
            if (player && this.fullMapZ === player.z) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.strokeRect(player.x * tileSize, player.y * tileSize, tileSize, tileSize);
            }
            return;
        }
        // Fallback: render loaded/visible area
        if (!this.map) return;
        const viewport = this.map.getViewport ? this.map.getViewport() : { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        const width = (viewport.maxX - viewport.minX + 1) * tileSize;
        const height = (viewport.maxY - viewport.minY + 1) * tileSize;
        this.mapCanvas.width = width;
        this.mapCanvas.height = height;
        const ctx = this.mapCanvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        const z = this.gameState.localPlayer?.z || viewport.z || 7;
        const tiles = this.map.getAllTiles ? this.map.getAllTiles() : [];
        for (const tile of tiles) {
            if (tile.z !== z) continue;
            const relX = tile.x - viewport.minX;
            const relY = tile.y - viewport.minY;
            ctx.fillStyle = tile.walkable ? '#6c6' : '#333';
            ctx.fillRect(relX * tileSize, relY * tileSize, tileSize, tileSize);
            if (tile.spriteIds && tile.spriteIds.length > 0) {
                if (typeof tile.spriteIds[0] === 'number' && tile.spriteIds[0] === 100) {
                    ctx.fillStyle = '#3399ff';
                    ctx.fillRect(relX * tileSize, relY * tileSize, tileSize, tileSize);
                }
            }
        }
        if (this.gameState.localPlayer && this.gameState.localPlayer.z === z) {
            const px = this.gameState.localPlayer.x - viewport.minX;
            const py = this.gameState.localPlayer.y - viewport.minY;
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.strokeRect(px * tileSize, py * tileSize, tileSize, tileSize);
        }
    }
}
