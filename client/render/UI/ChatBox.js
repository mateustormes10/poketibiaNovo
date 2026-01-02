import { GameConstants } from '../../../shared/constants/GameConstants.js';

export class ChatBox {
    constructor(ctx, canvas, uiManager) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.uiManager = uiManager;
        this.messages = [];
        this.inputActive = false;
        this.inputText = '';
        this.maxMessages = GameConstants.MAX_CHAT_MESSAGES || 10;
        this.bounds = null;
    }
    
    handleMouseDown(mouseX, mouseY) {
        if (!this.uiManager.isEditMode()) return false;
        
        if (this.bounds && this.uiManager.startDrag('chatBox', mouseX, mouseY, this.bounds)) {
            return true;
        }
        return false;
    }
    
    addMessage(playerNameOrObject, message, type = 'say') {
        // Suporta tanto objeto quanto parâmetros separados
        if (typeof playerNameOrObject === 'object') {
            this.messages.push({
                playerName: playerNameOrObject.playerName || 'System',
                message: playerNameOrObject.message,
                type: playerNameOrObject.type || 'say',
                color: playerNameOrObject.color,
                timestamp: Date.now()
            });
        } else {
            this.messages.push({
                playerName: playerNameOrObject,
                message,
                type,
                timestamp: Date.now()
            });
        }
        
        // Remove mensagens antigas se exceder o limite
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
    }
    
    activateInput() {
        this.inputActive = true;
        this.inputText = '';
    }
    
    deactivateInput() {
        this.inputActive = false;
        this.inputText = '';
    }
    
    isInputActive() {
        return this.inputActive;
    }
    
    addCharToInput(char) {
        if (this.inputText.length < (GameConstants.MAX_CHAT_LENGTH || 100)) {
            this.inputText += char;
        }
    }
    
    removeCharFromInput() {
        this.inputText = this.inputText.slice(0, -1);
    }
    
    getInputText() {
        return this.inputText;
    }
    
    clearInput() {
        this.inputText = '';
    }
    
    render() {
        const pos = this.uiManager.getPosition('chatBox');
        const boxWidth = 600;
        const boxHeight = 200;
        const x = pos.x !== null ? pos.x : 10;
        const y = pos.y !== null ? pos.y : this.canvas.height - boxHeight - 10;
        
        // Salva bounds para drag
        this.bounds = { x, y, width: boxWidth, height: boxHeight };
        
        // Borda de edição
        if (this.uiManager.isEditMode()) {
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, boxWidth, boxHeight);
        }
        
        // Background do chat (semi-transparente)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, boxWidth, boxHeight);
        
        // Borda
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, boxWidth, boxHeight);
        
        // Renderiza mensagens (de baixo para cima)
        const lineHeight = GameConstants.CHAT_LINE_HEIGHT;
        const messageStartY = y + boxHeight - 50; // Deixa espaço para input
        
        for (let i = this.messages.length - 1; i >= 0; i--) {
            const msg = this.messages[i];
            const msgY = messageStartY - ((this.messages.length - 1 - i) * lineHeight);
            if (msgY < y + 10) break;

            // Formata horário
            const date = new Date(msg.timestamp || Date.now());
            const pad = n => n.toString().padStart(2, '0');
            const timeStr = `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

            // Monta texto: horário + nome em amarelo, mensagem em branco
            this.ctx.font = '12px Arial';
            let prefix = '';
            if (msg.playerName === 'System') {
                prefix = 'Sistema:';
            } else {
                prefix = `${timeStr} ${msg.playerName}:`;
            }

            // Medir largura do prefixo para posicionar mensagem
            this.ctx.fillStyle = '#ffff00';
            const prefixWidth = this.ctx.measureText(prefix).width;
            this.ctx.fillText(prefix, x + 10, msgY);

            // Mensagem em branco na mesma linha
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(msg.message, x + 10 + prefixWidth + 8, msgY);
        }
        
        // Input box
        if (this.inputActive) {
            const inputY = y + boxHeight - 35;
            const inputHeight = 25;
            
            // Background do input
            this.ctx.fillStyle = 'rgba(50, 50, 50, 0.9)';
            this.ctx.fillRect(x + 5, inputY, boxWidth - 10, inputHeight);
            
            // Borda do input (destacada)
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x + 5, inputY, boxWidth - 10, inputHeight);
            
            // Texto do input
            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(this.inputText + '|', x + 10, inputY + 17);
        } else {
            // Instrução quando input não está ativo
            this.ctx.font = 'italic 11px Arial';
            this.ctx.fillStyle = '#888888';
            this.ctx.fillText('Pressione Enter para falar', x + 10, y + boxHeight - 15);
        }
    }
}
