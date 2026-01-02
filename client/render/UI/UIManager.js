export class UIManager {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.editMode = false;
        this.dragging = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // Posições padrão e customizadas
        this.positions = this.loadPositions() || {
            playerInfo: { x: 10, y: 10 },
            pokemonList: { x: 10, y: 120 },
            chatBox: { x: 10, y: null }, // null = calculado (bottom)
            battleView: { x: null, y: 100 } // null = calculado (right)
        };
    }
    
    toggleEditMode() {
        this.editMode = !this.editMode;
        console.log(`[UIManager] Edit mode: ${this.editMode ? 'ON' : 'OFF'}`);
        return this.editMode;
    }
    
    isEditMode() {
        return this.editMode;
    }
    
    savePositions() {
        try {
            localStorage.setItem('uiPositions', JSON.stringify(this.positions));
            console.log('[UIManager] UI positions saved');
        } catch (error) {
            console.error('[UIManager] Failed to save UI positions:', error);
        }
    }
    
    loadPositions() {
        try {
            const saved = localStorage.getItem('uiPositions');
            if (saved) {
                console.log('[UIManager] UI positions loaded');
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('[UIManager] Failed to load UI positions:', error);
        }
        return null;
    }
    
    resetPositions() {
        this.positions = {
            playerInfo: { x: 10, y: 10 },
            pokemonList: { x: 10, y: 120 },
            chatBox: { x: 10, y: null },
            battleView: { x: null, y: 100 }
        };
        this.savePositions();
        console.log('[UIManager] UI positions reset to default');
    }
    
    getPosition(elementName) {
        return this.positions[elementName] || { x: 0, y: 0 };
    }
    
    setPosition(elementName, x, y) {
        if (!this.positions[elementName]) {
            this.positions[elementName] = {};
        }
        this.positions[elementName].x = x;
        this.positions[elementName].y = y;
        this.savePositions();
    }
    
    startDrag(elementName, mouseX, mouseY, elementBounds) {
        if (!this.editMode) return false;
        
        const { x, y, width, height } = elementBounds;
        
        // Verifica se clicou dentro do elemento
        if (mouseX >= x && mouseX <= x + width &&
            mouseY >= y && mouseY <= y + height) {
            this.dragging = elementName;
            this.dragOffset.x = mouseX - x;
            this.dragOffset.y = mouseY - y;
            console.log(`[UIManager] Started dragging ${elementName}`);
            return true;
        }
        return false;
    }
    
    updateDrag(mouseX, mouseY) {
        if (!this.dragging) return;
        
        const newX = mouseX - this.dragOffset.x;
        const newY = mouseY - this.dragOffset.y;
        
        this.setPosition(this.dragging, newX, newY);
    }
    
    stopDrag() {
        if (this.dragging) {
            console.log(`[UIManager] Stopped dragging ${this.dragging}`);
            this.dragging = null;
        }
    }
    
    isDragging() {
        return this.dragging !== null;
    }
    
    renderEditModeIndicator() {
        if (!this.editMode) return;
        
        // Indicador visual no topo da tela
        const width = 300;
        const height = 40;
        const x = (this.canvas.width - width) / 2;
        const y = 10;
        
        // Bordas arredondadas
        this.ctx.beginPath();
        if (typeof this.ctx.roundRect === 'function') {
            this.ctx.roundRect(x, y, width, height, 16);
        } else {
            const r = 16;
            this.ctx.moveTo(x + r, y);
            this.ctx.lineTo(x + width - r, y);
            this.ctx.quadraticCurveTo(x + width, y, x + width, y + r);
            this.ctx.lineTo(x + width, y + height - r);
            this.ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
            this.ctx.lineTo(x + r, y + height);
            this.ctx.quadraticCurveTo(x, y + height, x, y + height - r);
            this.ctx.lineTo(x, y + r);
            this.ctx.quadraticCurveTo(x, y, x + r, y);
        }
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(255, 100, 0, 0.8)';
        this.ctx.fill();
        this.ctx.strokeStyle = '#ff6600';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Texto
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('MODO EDIÇÃO UI ATIVO', x + width / 2, y + 25);
        this.ctx.textAlign = 'left';
        
        // Instrução
        this.ctx.font = '10px Arial';
        this.ctx.fillStyle = '#cccccc';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Pressione F2 para sair | Clique e arraste elementos', this.canvas.width / 2, y + height + 15);
        this.ctx.textAlign = 'left';
    }
}
