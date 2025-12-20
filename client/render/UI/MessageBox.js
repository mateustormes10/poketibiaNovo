export class MessageBox {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.messages = [];
        this.maxMessages = 5;
        this.messageTimeout = 5000; // 5 segundos
    }
    
    addMessage(text, type = 'info') {
        const message = {
            text,
            type,
            timestamp: Date.now()
        };
        
        this.messages.push(message);
        
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
    }
    
    update() {
        const now = Date.now();
        this.messages = this.messages.filter(msg => 
            now - msg.timestamp < this.messageTimeout
        );
    }
    
    render() {
        const padding = 10;
        const x = padding;
        const y = this.canvas.height - 150;
        const lineHeight = 20;
        
        this.messages.forEach((message, index) => {
            const alpha = this.getMessageAlpha(message);
            const color = this.getMessageColor(message.type);
            
            // Background
            this.ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * alpha})`;
            this.ctx.fillRect(x, y + index * lineHeight, 300, lineHeight - 2);
            
            // Text
            this.ctx.font = '12px Arial';
            this.ctx.fillStyle = `rgba(${color}, ${alpha})`;
            this.ctx.fillText(message.text, x + 5, y + index * lineHeight + 14);
        });
    }
    
    getMessageAlpha(message) {
        const age = Date.now() - message.timestamp;
        const fadeTime = 1000;
        
        if (age > this.messageTimeout - fadeTime) {
            return 1 - (age - (this.messageTimeout - fadeTime)) / fadeTime;
        }
        
        return 1;
    }
    
    getMessageColor(type) {
        const colors = {
            info: '255, 255, 255',
            warning: '255, 255, 0',
            error: '255, 0, 0',
            success: '0, 255, 0'
        };
        
        return colors[type] || colors.info;
    }
}
