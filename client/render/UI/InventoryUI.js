/**
 * InventoryUI
 * 
 * Interface de usuário do inventário
 * Grade de 40 slots (5 colunas x 8 linhas)
 */


import { InventoryConfig } from '../../../shared/protocol/InventoryProtocol.js';
import { UIThemeConfig } from '../../config/UIThemeConfig.js';

export class InventoryUI {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.isOpen = false;
        this.inventory = null;
        this.selectedSlot = null;
        this.hoveredSlot = null;
        
        // Layout configuração
        this.slotSize = 60;
        this.slotPadding = 5;
        this.columns = InventoryConfig.GRID_COLUMNS;
        this.rows = InventoryConfig.GRID_ROWS;
        
        // Posição da janela do inventário (centralizada)
        this.updateWindowPosition();
        
        // Detalhes do item selecionado
        this.detailsPanelWidth = 280;
    }

    /**
     * Atualiza a posição da janela centralizada
     */
    updateWindowPosition() {
        const gridWidth = this.columns * (this.slotSize + this.slotPadding) + this.slotPadding;
        const gridHeight = this.rows * (this.slotSize + this.slotPadding) + this.slotPadding;
        const totalWidth = gridWidth + this.detailsPanelWidth + 40;
        const totalHeight = gridHeight + 80; // Espaço para título e margem
        
        this.windowX = (this.canvas.width - totalWidth) / 2;
        this.windowY = (this.canvas.height - totalHeight) / 2;
        this.windowWidth = totalWidth;
        this.windowHeight = totalHeight;
        
        this.gridStartX = this.windowX + 20;
        this.gridStartY = this.windowY + 60;
        
        this.detailsX = this.gridStartX + gridWidth + 20;
        this.detailsY = this.gridStartY;
    }

    /**
     * Abre o inventário
     * @param {Object} inventoryData - Dados do inventário recebidos do servidor
     */
    open(inventoryData) {
        console.log('[InventoryUI] open() chamado com:', inventoryData);
        this.isOpen = true;
        this.inventory = inventoryData;
        this.selectedSlot = null;
        this.updateWindowPosition(); // Atualiza posição ao abrir
        console.log('[InventoryUI] Inventário marcado como aberto. isOpen =', this.isOpen);
    }

    /**
     * Fecha o inventário
     */
    close() {
        this.isOpen = false;
        this.selectedSlot = null;
        this.hoveredSlot = null;
    }

    /**
     * Alterna estado do inventário
     */
    toggle(inventoryData = null) {
        if (this.isOpen) {
            this.close();
        } else if (inventoryData) {
            this.open(inventoryData);
        }
    }

    /**
     * Atualiza dados do inventário
     * @param {Object} inventoryData - Novos dados do inventário
     */
    updateInventory(inventoryData) {
        this.inventory = inventoryData;
    }

    /**
     * Renderiza o inventário
     */
    render() {
        if (!this.isOpen) {
            return;
        }
        
        if (!this.inventory) {
            console.warn('[InventoryUI] Tentando renderizar mas inventory é null/undefined');
            return;
        }
        
        console.log('[InventoryUI] Renderizando inventário. isOpen:', this.isOpen, 'items:', this.inventory.items?.length || 0);

        // Overlay escuro de fundo
        // Fundo escuro de fundo (mantém para overlay, não painel)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Janela do inventário
        this.renderWindow();
        
        // Grade de slots
        this.renderSlots();
        
        // Painel de detalhes
        if (this.selectedSlot !== null) {
            this.renderDetailsPanel();
        }
    }

    /**
     * Renderiza a janela principal
     */
    renderWindow() {
        // Fundo da janela: usa cor do tema
        const bg = UIThemeConfig.getBackgroundColor ? UIThemeConfig.getBackgroundColor() : 'rgba(20, 20, 30, 0.95)';
        this.ctx.fillStyle = bg;
        this.ctx.fillRect(this.windowX, this.windowY, this.windowWidth, this.windowHeight);
        
        // Borda da janela
        this.ctx.strokeStyle = '#4a4a5a';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(this.windowX, this.windowY, this.windowWidth, this.windowHeight);
        
        // Título
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Inventário', this.windowX + 20, this.windowY + 35);
        
        // Instruções
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.fillText('Pressione I para fechar | Clique para selecionar', this.windowX + 20, this.windowY + this.windowHeight - 15);
    }

    /**
     * Renderiza a grade de slots
     */
    renderSlots() {
        const items = this.inventory?.items || [];
        
        console.log('[InventoryUI] renderSlots() - Total de itens:', items.length);
        console.log('[InventoryUI] Items:', items);
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
                const slotIndex = row * this.columns + col;
                const item = items[slotIndex] || null;
                
                const x = this.gridStartX + col * (this.slotSize + this.slotPadding);
                const y = this.gridStartY + row * (this.slotSize + this.slotPadding);
                
                this.renderSlot(x, y, slotIndex, item);
            }
        }
    }

    /**
     * Renderiza um slot individual
     */
    renderSlot(x, y, slotIndex, item) {
        const isSelected = this.selectedSlot === slotIndex;
        const isHovered = this.hoveredSlot === slotIndex;
        
        // Fundo do slot
        if (item) {
            this.ctx.fillStyle = isSelected ? 'rgba(100, 150, 255, 0.4)' : 'rgba(50, 50, 70, 0.8)';
        } else {
            this.ctx.fillStyle = 'rgba(30, 30, 40, 0.6)';
        }
        this.ctx.fillRect(x, y, this.slotSize, this.slotSize);
        
        // Borda do slot
        if (isSelected) {
            this.ctx.strokeStyle = '#5599ff';
            this.ctx.lineWidth = 3;
        } else if (isHovered && item) {
            this.ctx.strokeStyle = '#7799ff';
            this.ctx.lineWidth = 2;
        } else {
            this.ctx.strokeStyle = '#3a3a4a';
            this.ctx.lineWidth = 1;
        }
        this.ctx.strokeRect(x, y, this.slotSize, this.slotSize);
        
        // Renderiza item se presente
        if (item) {
            // Nome do item (abreviado se necessário)
            this.ctx.font = 'bold 11px Arial';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'center';
            
            const itemName = this.truncateText(item.item_name, this.slotSize - 10);
            this.ctx.fillText(itemName, x + this.slotSize / 2, y + this.slotSize / 2 - 5);
            
            // Quantidade (canto inferior direito)
            if (item.quantity > 1) {
                this.ctx.font = 'bold 14px Arial';
                this.ctx.fillStyle = '#ffdd00';
                this.ctx.textAlign = 'right';
                this.ctx.fillText(`x${item.quantity}`, x + this.slotSize - 5, y + this.slotSize - 5);
            }
            
            // Indicador de tipo (canto superior esquerdo)
            const typeColor = this.getTypeColor(item.item_type);
            this.ctx.fillStyle = typeColor;
            this.ctx.fillRect(x + 3, y + 3, 8, 8);
        }
    }

    /**
     * Renderiza painel de detalhes do item selecionado
     */
    renderDetailsPanel() {
        const items = this.inventory?.items || [];
        const item = items[this.selectedSlot];
        
        if (!item) return;
        
        const x = this.detailsX;
        const y = this.detailsY;
        const width = this.detailsPanelWidth;
        const height = 200;
        
        // Fundo
        this.ctx.fillStyle = 'rgba(40, 40, 50, 0.9)';
        this.ctx.fillRect(x, y, width, height);
        
        // Borda
        this.ctx.strokeStyle = '#5a5a6a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);
        
        // Conteúdo
        const padding = 15;
        let textY = y + padding + 15;
        
        // Nome do item
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(item.item_name, x + padding, textY);
        textY += 25;
        
        // Tipo
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.fillText(`Tipo: ${this.getTypeLabel(item.item_type)}`, x + padding, textY);
        textY += 20;
        
        // Quantidade
        this.ctx.fillStyle = '#ffdd00';
        this.ctx.fillText(`Quantidade: ${item.quantity}`, x + padding, textY);
        textY += 25;
        
        // Descrição
        this.ctx.fillStyle = '#cccccc';
        this.ctx.font = '12px Arial';
        const description = item.description || 'Sem descrição.';
        const lines = this.wrapText(description, width - padding * 2);
        
        lines.forEach(line => {
            this.ctx.fillText(line, x + padding, textY);
            textY += 18;
        });
        
        // Botão "Usar"
        const buttonY = y + height + 15;
        const buttonWidth = 100;
        const buttonHeight = 35;
        const buttonX = x + (width - buttonWidth) / 2;
        
        this.ctx.fillStyle = '#4a7c59';
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        this.ctx.strokeStyle = '#5a9c69';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Usar', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 5);
        
        // Armazena bounds do botão para clique
        this.useButtonBounds = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };
    }

    /**
     * Trata clique no inventário
     * @param {number} mouseX - Coordenada X do mouse
     * @param {number} mouseY - Coordenada Y do mouse
     * @returns {Object|null} Ação a ser executada
     */
    handleClick(mouseX, mouseY) {
        if (!this.isOpen || !this.inventory) return null;
        
        // Verifica clique no botão "Usar"
        if (this.useButtonBounds && this.selectedSlot !== null) {
            const btn = this.useButtonBounds;
            if (mouseX >= btn.x && mouseX <= btn.x + btn.width &&
                mouseY >= btn.y && mouseY <= btn.y + btn.height) {
                const items = this.inventory?.items || [];
                const item = items[this.selectedSlot];
                if (item) {
                    return { action: 'use', itemName: item.item_name };
                }
            }
        }
        
        // Verifica clique nos slots
        const slotIndex = this.getSlotAtPosition(mouseX, mouseY);
        if (slotIndex !== null) {
            const items = this.inventory?.items || [];
            if (items[slotIndex]) {
                this.selectedSlot = slotIndex;
                return { action: 'select', slotIndex: slotIndex };
            }
        }
        
        return null;
    }

    /**
     * Trata movimento do mouse
     * @param {number} mouseX - Coordenada X do mouse
     * @param {number} mouseY - Coordenada Y do mouse
     */
    handleMouseMove(mouseX, mouseY) {
        if (!this.isOpen || !this.inventory) return;
        
        this.hoveredSlot = this.getSlotAtPosition(mouseX, mouseY);
    }

    /**
     * Obtém o índice do slot na posição do mouse
     * @returns {number|null} Índice do slot ou null
     */
    getSlotAtPosition(mouseX, mouseY) {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
                const x = this.gridStartX + col * (this.slotSize + this.slotPadding);
                const y = this.gridStartY + row * (this.slotSize + this.slotPadding);
                
                if (mouseX >= x && mouseX <= x + this.slotSize &&
                    mouseY >= y && mouseY <= y + this.slotSize) {
                    return row * this.columns + col;
                }
            }
        }
        return null;
    }

    /**
     * Retorna cor baseada no tipo do item
     */
    getTypeColor(itemType) {
        const colors = {
            'consumable': '#ff6b6b',
            'battle': '#4ecdc4',
            'key': '#ffd93d',
            'misc': '#95a5a6'
        };
        return colors[itemType] || '#ffffff';
    }

    /**
     * Retorna label do tipo
     */
    getTypeLabel(itemType) {
        const labels = {
            'consumable': 'Consumível',
            'battle': 'Batalha',
            'key': 'Item-Chave',
            'misc': 'Diversos'
        };
        return labels[itemType] || 'Desconhecido';
    }

    /**
     * Trunca texto para caber no espaço
     */
    truncateText(text, maxWidth) {
        this.ctx.font = 'bold 11px Arial';
        if (this.ctx.measureText(text).width <= maxWidth) {
            return text;
        }
        
        let truncated = text;
        while (this.ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        return truncated + '...';
    }

    /**
     * Quebra texto em múltiplas linhas
     */
    wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        this.ctx.font = '12px Arial';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = this.ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }
}
