export class NpcDialog {
    constructor(ctx, canvas, wsClient) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.wsClient = wsClient;
        this.visible = false;
        this.npcId = null;
        this.npcName = '';
        this.dialogType = ''; // 'shop', 'heal', etc
        this.items = [];
        this.balance = 0;
        this.selectedIndex = 0;
    }

    show(data) {
        this.visible = true;
        this.npcId = data.npcId;
        this.npcName = data.npcName;
        this.dialogType = data.dialogType;
        this.items = data.items || [];
        this.balance = data.balance || 0;
        this.selectedIndex = 0;
        console.log('[NpcDialog] Dialog opened:', data);
    }

    hide() {
        this.visible = false;
        this.npcId = null;
        this.items = [];
        console.log('[NpcDialog] Dialog closed');
    }

    isVisible() {
        return this.visible;
    }

    handleKeyPress(key) {
        if (!this.visible) return false;

        switch (key) {
            case 'Escape':
                this.hide();
                return true;
            
            case 'ArrowUp':
            case 'w':
                if (this.selectedIndex > 0) {
                    this.selectedIndex--;
                }
                return true;
            
            case 'ArrowDown':
            case 's':
                if (this.selectedIndex < this.items.length - 1) {
                    this.selectedIndex++;
                }
                return true;
            
            case 'Enter':
                this.confirmSelection();
                return true;
        }

        return false;
    }

    confirmSelection() {
        if (this.dialogType === 'shop' && this.items[this.selectedIndex]) {
            const item = this.items[this.selectedIndex];
            
            // Verifica se tem gold suficiente
            if (this.balance < item.price) {
                console.log('[NpcDialog] Insufficient gold');
                return;
            }

            // Envia comando de compra
            this.wsClient.send('npc_buy', {
                npcId: this.npcId,
                itemType: item.type,
                itemName: item.name,
                price: item.price
            });

            console.log(`[NpcDialog] Buying ${item.name} for ${item.price} gold`);
            this.hide();
        }
    }

    checkClick(mouseX, mouseY) {
        if (!this.visible) return false;

        const dialogWidth = 400;
        const dialogHeight = 300;
        const x = (this.canvas.width - dialogWidth) / 2;
        const y = (this.canvas.height - dialogHeight) / 2;

        // Verifica clique em cada item
        const itemHeight = 40;
        const startY = y + 80;

        for (let i = 0; i < this.items.length; i++) {
            const itemY = startY + (i * itemHeight);
            
            if (mouseX >= x + 20 && mouseX <= x + dialogWidth - 20 &&
                mouseY >= itemY && mouseY <= itemY + itemHeight) {
                this.selectedIndex = i;
                this.confirmSelection();
                return true;
            }
        }

        return false;
    }

    render() {
        if (!this.visible) return;

        const dialogWidth = 400;
        const dialogHeight = 300;
        const x = (this.canvas.width - dialogWidth) / 2;
        const y = (this.canvas.height - dialogHeight) / 2;

        // Overlay escuro
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Caixa do diálogo
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(x, y, dialogWidth, dialogHeight);
        
        // Borda
        this.ctx.strokeStyle = '#4a4a4a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, dialogWidth, dialogHeight);

        // Nome do NPC
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.npcName, x + dialogWidth / 2, y + 35);

        // Balance
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Gold: ${this.balance}`, x + dialogWidth / 2, y + 60);

        // Items
        this.ctx.textAlign = 'left';
        const itemHeight = 40;
        const startY = y + 80;

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const itemY = startY + (i * itemHeight);

            // Highlight no item selecionado
            if (i === this.selectedIndex) {
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
                this.ctx.fillRect(x + 20, itemY, dialogWidth - 40, itemHeight);
            }

            // Nome do item
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(item.name, x + 30, itemY + 25);

            // Preço
            this.ctx.fillStyle = '#ffd700';
            this.ctx.fillText(`${item.price} gold`, x + dialogWidth - 120, itemY + 25);
        }

        // Instruções
        this.ctx.fillStyle = '#888';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Use ↑↓ ou WS para navegar | Enter para comprar | ESC para fechar', 
            x + dialogWidth / 2, y + dialogHeight - 20);
    }
}
