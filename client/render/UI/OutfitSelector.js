
import { getAvailableSpriteTypes, getPlayerSprites } from '../../config/SpritePlayerList.js';
import { UIThemeConfig } from '../../config/UIThemeConfig.js';

export class OutfitSelector {
    constructor(ctx, canvas, wsClient) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.wsClient = wsClient;
        this.isOpen = false;
        
        this.outfits = getAvailableSpriteTypes();
        this.selectedIndex = 0;
        
        // UI Config
        this.width = 600;
        this.height = 400;
        
        this.itemHeight = 60;
        this.padding = 20;
    }
    
    toggle() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            console.log('[OutfitSelector] Opened');
        } else {
            console.log('[OutfitSelector] Closed');
        }
    }
    
    close() {
        this.isOpen = false;
    }
    
    moveUp() {
        if (!this.isOpen) return;
        this.selectedIndex = (this.selectedIndex - 1 + this.outfits.length) % this.outfits.length;
    }
    
    moveDown() {
        if (!this.isOpen) return;
        this.selectedIndex = (this.selectedIndex + 1) % this.outfits.length;
    }
    
    selectCurrent() {
        console.log('[OutfitSelector] selectCurrent chamado! isOpen:', this.isOpen);
        if (!this.isOpen) return;
        const selectedOutfit = this.outfits[this.selectedIndex];
        console.log(`[OutfitSelector] Selected outfit: ${selectedOutfit}`);
        // Envia ao servidor para trocar o lookaddons
        this.wsClient.send('change_outfit', {
            lookaddons: selectedOutfit
        });
        console.log('[OutfitSelector] Mensagem enviada para o servidor:', selectedOutfit);
        this.close();
    }
    
    render(spriteRenderer) {
        if (!this.isOpen) return;
        // DEBUG: cor de fundo visível
        this.ctx.save();
        this.ctx.globalAlpha = 0.5;
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        
        // Recalcula posições baseado no tamanho atual do canvas
        const x = (this.canvas.width - this.width) / 2;
        const y = (this.canvas.height - this.height) / 2;
        
        // Salva o estado do contexto
        this.ctx.save();
        
        // Overlay semi-transparente
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Fundo do modal: usa cor do tema
        const bg = UIThemeConfig.getBackgroundColor ? UIThemeConfig.getBackgroundColor() : '#2c2c2c';
        this.ctx.fillStyle = bg;
        this.ctx.fillRect(x, y, this.width, this.height);
        
        // Borda
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x, y, this.width, this.height);
        
        // Título
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Selecione sua Aparência', x + this.width / 2, y + 40);
        
        // Instruções
        this.ctx.fillStyle = '#AAAAAA';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('↑↓ para navegar | Enter para selecionar | Esc para fechar', x + this.width / 2, y + this.height - 20);
        
        // Lista de outfits
        const startY = y + 70;
        const maxVisible = 4;
        
        this.outfits.forEach((outfit, index) => {
            const posY = startY + (index * this.itemHeight);
            
            // Só renderiza se estiver visível
            if (posY > y + this.height - 80) return;
            
            const isSelected = index === this.selectedIndex;
            
            // Background do item
            if (isSelected) {
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                this.ctx.fillRect(x + 10, posY - 5, this.width - 20, this.itemHeight - 10);
                
                // Borda do selecionado
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x + 10, posY - 5, this.width - 20, this.itemHeight - 10);
            }
            
            // Preview da sprite (frame 0, direção down)
            const sprites = getPlayerSprites(outfit, 'down', 0);
            const previewX = x + 40;
            const previewY = posY + 20;
            
            // Renderiza as 3 sprites do outfit
            sprites.forEach((spriteId, i) => {
                if (spriteId === 0) return;
                
                const spriteImg = spriteRenderer.sprites.get(spriteId.toString());
                
                if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
                    let drawX = previewX;
                    let drawY = previewY;
                    
                    // Posiciona conforme a ordem [central, esquerda, acima]
                    if (i === 1) {
                        drawX -= 32; // Esquerda
                    } else if (i === 2) {
                        drawY -= 32; // Acima
                    }
                    
                    this.ctx.drawImage(spriteImg, drawX, drawY, 32, 32);
                }
            });
            
            // Nome do outfit
            this.ctx.fillStyle = isSelected ? '#FFD700' : '#FFFFFF';
            this.ctx.font = isSelected ? 'bold 18px Arial' : '16px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(this.formatOutfitName(outfit), previewX + 80, posY + 30);
        });
        
        // Restaura o estado do contexto
        this.ctx.restore();
    }
    
    formatOutfitName(outfit) {
        // Formata o nome para exibição
        const names = {
            'default': 'Padrão',
            'summonerMale': 'Invocador',
            'mageMale': 'Mago',
            'warriorMale': 'Guerreiro',
            'maletaMale': 'Maleta'
        };
        return names[outfit] || outfit;
    }
}
