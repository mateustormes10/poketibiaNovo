import { GameConstants } from '../../shared/constants/GameConstants.js';

/**
 * TileSet - Carrega sprites individuais do Tibia
 */

// Lista de subpastas conhecidas em assets/sprites
const SPRITE_SUBFOLDERS = [
    '', // root
    'animacoes_damage',
    'cenario',
    'chao',
    'items',
    'liquidos_chao',
    'monstros_tibia',
    'monstro_tibia_dead',
    'objetos_com_actions',
    'outfit_players',
    'paredes',
    'pokemons',
    'pokeball',
    'pokemon_dead',
    'portas',
];

export class TileSet {
    constructor() {
        this.spriteCache = new Map(); // Cache de sprites carregadas
        this.loadingSprites = new Map(); // Promises de sprites sendo carregadas
        this.spritePath = '/projetos/novo_poketibia/assets/sprites/';
        this.tileSize = GameConstants.TILE_SIZE;
        this.failedSprites = new Set(); // Sprites que falharam ao carregar
        // Cores de fallback para quando a sprite não existe
        this.fallbackColors = this.createFallbackColors();
    }

    // Busca a sprite em todas as subpastas conhecidas
    loadSpriteFromSubfolders(spriteId, onLoad, onError) {
        let found = false;
        let img = new Image();
        let tryIndex = 0;
        const tryNext = () => {
            if (tryIndex >= SPRITE_SUBFOLDERS.length) {
                // Não encontrou
                if (onError) onError();
                return;
            }
            const folder = SPRITE_SUBFOLDERS[tryIndex];
            tryIndex++;
            let path = this.spritePath;
            if (folder) path += folder + '/';
            path += spriteId + '.png';
            img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                found = true;
                if (onLoad) onLoad(img);
            };
            img.onerror = () => {
                // Tenta próxima subpasta
                tryNext();
            };
            img.src = path;
        };
        tryNext();
    }
    
    /**
     * Cria cores de fallback baseado em ranges de IDs
     */
    createFallbackColors() {
        return {
            sand: '#e6d4a3',
            water: '#1976d2',
            floor: '#bcaaa4',
            grass: '#7cb342',
            unknown: '#424242'
        };
    }
    
    /**
     * Carrega uma sprite individual
     */
    async loadSprite(spriteId) {
        // Já está no cache
        if (this.spriteCache.has(spriteId)) {
            return this.spriteCache.get(spriteId);
        }
        // Já falhou antes
        if (this.failedSprites.has(spriteId)) {
            return null;
        }
        // Já está carregando
        if (this.loadingSprites.has(spriteId)) {
            return this.loadingSprites.get(spriteId);
        }
        // Inicia carregamento
        const loadPromise = new Promise((resolve) => {
            this.loadSpriteFromSubfolders(
                spriteId,
                (img) => {
                    this.spriteCache.set(spriteId, img);
                    this.loadingSprites.delete(spriteId);
                    resolve(img);
                },
                () => {
                    this.failedSprites.add(spriteId);
                    this.loadingSprites.delete(spriteId);
                    resolve(null);
                }
            );
        });
        this.loadingSprites.set(spriteId, loadPromise);
        return loadPromise;
    }
    
    /**
     * Desenha tile - tenta usar sprite, fallback para cor
     */
    drawTile(ctx, spriteId, x, y, size) {
        // Não desenha nada se spriteId não for número válido
        if (typeof spriteId !== 'number' || isNaN(spriteId)) {
            return;
        }
        const sprite = this.spriteCache.get(spriteId);
        if (sprite) {
            // Desenha sprite
            ctx.drawImage(sprite, x, y, size, size);
        } else if (!this.failedSprites.has(spriteId) && !this.loadingSprites.has(spriteId)) {
            // Inicia carregamento em background
            this.loadSprite(spriteId);
            // Desenha cor de fallback enquanto carrega
            this.drawFallbackColor(ctx, spriteId, x, y, size);
        } else {
            // Sprite não existe ou falhou, usa cor
            this.drawFallbackColor(ctx, spriteId, x, y, size);
        }
    }
    
    /**
     * Desenha cor de fallback baseado no ID
     */
    drawFallbackColor(ctx, spriteId, x, y, size) {
        let color;
        
        if (spriteId >= 9900 && spriteId <= 9920) {
            color = this.fallbackColors.sand;
        } else if (spriteId >= 4500 && spriteId <= 4600) {
            color = this.fallbackColors.water;
        } else if (spriteId >= 100 && spriteId <= 200) {
            color = this.fallbackColors.floor;
        } else if (spriteId >= 300 && spriteId <= 400) {
            color = this.fallbackColors.grass;
        } else {
            color = this.fallbackColors.unknown;
        }
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
    }
    
    /**
     * Pré-carrega um conjunto de sprites
     */
    async preloadSprites(spriteIds) {
        const promises = spriteIds.map(id => this.loadSprite(id));
        await Promise.all(promises);
        console.log(`[TileSet] Preloaded ${spriteIds.length} sprites`);
    }
    
    /**
     * Limpa cache de sprites
     */
    clearCache() {
        this.spriteCache.clear();
        this.loadingSprites.clear();
        this.failedSprites.clear();
    }
    
    /**
     * Estatísticas do cache
     */
    getCacheStats() {
        return {
            cached: this.spriteCache.size,
            loading: this.loadingSprites.size,
            failed: this.failedSprites.size
        };
    }
}
