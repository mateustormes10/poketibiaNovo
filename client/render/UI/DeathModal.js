export class DeathModal {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.visible = false;
        this.message = 'Você morreu!';
    }
    
    show(message) {
        this.visible = true;
        this.message = message || 'Você morreu!';
    }
    
    hide() {
        this.visible = false;
    }
    
    isVisible() {
        return this.visible;
    }
    
    render() {
        if (!this.visible) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const modalWidth = 400;
        const modalHeight = 200;
        const modalX = centerX - modalWidth / 2;
        const modalY = centerY - modalHeight / 2;
        
        // Overlay escuro (bloqueia todo o game)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Modal background
        this.ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
        this.ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
        
        // Borda do modal
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);
        
        // Título
        this.ctx.font = 'bold 32px Arial';
        this.ctx.fillStyle = '#ff0000';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('VOCÊ MORREU!', centerX, modalY + 60);
        
        // Mensagem
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('Você foi teleportado para o templo.', centerX, modalY + 100);
        
        // Botão OK
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonX = centerX - buttonWidth / 2;
        const buttonY = modalY + modalHeight - 60;
        
        // Background do botão
        this.ctx.fillStyle = '#444444';
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Borda do botão
        this.ctx.strokeStyle = '#888888';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Texto do botão
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('OK', centerX, buttonY + buttonHeight / 2 + 6);
        
        // Instrução
        this.ctx.font = 'italic 12px Arial';
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.fillText('Pressione OK ou Enter para continuar', centerX, modalY + modalHeight - 15);
        
        this.ctx.textAlign = 'left';
    }
    
    checkClick(mouseX, mouseY) {
        if (!this.visible) return false;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const modalWidth = 400;
        const modalHeight = 200;
        const modalY = centerY - modalHeight / 2;
        
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonX = centerX - buttonWidth / 2;
        const buttonY = modalY + modalHeight - 60;
        
        // Verifica se clicou no botão OK
        if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
            mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
            this.hide();
            return true;
        }
        
        return false;
    }
}
