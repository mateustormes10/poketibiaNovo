import { TileRenderer } from './TileRenderer.js';
import { SpriteRenderer } from './SpriteRenderer.js';
import { HUD } from './UI/HUD.js';
import { DeathModal } from './UI/DeathModal.js';
import { ChatBox } from './UI/ChatBox.js';
import { NpcDialog } from './UI/NpcDialog.js';
import { UIManager } from './UI/UIManager.js';

export class Renderer {
    constructor(canvas, camera, wsClient) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = camera;
        this.wsClient = wsClient;
        
        this.tileRenderer = new TileRenderer(64); // 64 tiles
        this.spriteRenderer = new SpriteRenderer(this.ctx, camera);
        this.uiManager = new UIManager(this.ctx, canvas);
        this.hud = new HUD(this.ctx, canvas, this.uiManager);
        this.deathModal = new DeathModal(this.ctx, canvas);
        this.chatBox = new ChatBox(this.ctx, canvas, this.uiManager);
        this.npcDialog = new NpcDialog(this.ctx, canvas, wsClient);
        this.showGrid = false;
    }
    
    async init() {
        this.ctx.imageSmoothingEnabled = false;
        
        // Inicializa tile renderer
        // Pode carregar tileset de imagem aqui se disponível
        // await this.tileRenderer.init('./assets/tileset.png');
        await this.tileRenderer.init(); // Usa fallback de cores
        console.log('[Renderer] Initialized');
    }
    
    clear() {
        // Salva estado
        this.ctx.save();
        // Reset de qualquer transformação
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Limpa TODO o canvas de (0,0) até (width, height)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Restaura estado
        this.ctx.restore();
    }
    
    render(gameState) {
        // Limpa canvas
        this.clear();
        
        // 1. Renderiza mapa (PRIMEIRO - background)
        if (gameState.map) {
            this.tileRenderer.render(this.ctx, gameState.map, this.camera);
            
            // Grid opcional (debug)
            if (this.showGrid) {
                this.tileRenderer.renderGrid(this.ctx, gameState.map, this.camera);
            }
        }
        
        // 2. Renderiza entidades (DEPOIS - sobre o mapa)
        const entities = gameState.getEntitiesInView(this.camera);
        
        // Calcula startX/startY do viewport (mesmo que TileRenderer)
        const viewport = this.camera.getViewport();
        const startX = Math.floor(viewport.x / 64);
        const startY = Math.floor(viewport.y / 64);
        
        entities.forEach(entity => {
            this.spriteRenderer.renderEntity(entity, startX, startY);
        });
        
        // 3. Renderiza UI (POR ÚLTIMO - sobre tudo)
        this.hud.render(gameState);
        
        // 4. Renderiza chat
        this.chatBox.render();
        
        // 5. Renderiza indicador de modo de edição
        this.uiManager.renderEditModeIndicator();
        
        // 6. Renderiza diálogo de NPC (se visível)
        this.npcDialog.render();
        
        // 7. Renderiza modal de morte (se visível - bloqueia tudo)
        this.deathModal.render();
    }
}
