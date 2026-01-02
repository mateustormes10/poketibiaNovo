import { UIThemeConfig } from '../../config/UIThemeConfig.js';
export class InfoMenuUI {
        
    constructor(ctx, canvas, uiManager) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.uiManager = uiManager;
        this.elementName = 'infoMenuUI';
        this.bounds = null;
        this.buttonImages = [
            'assets/menu_ui/info_player.png',
            'assets/menu_ui/info_list_monster.png',
            'assets/menu_ui/info_chat.png',
            'assets/menu_ui/info_battle.png',
            'assets/menu_ui/info_configs.png'
        ];
        this.images = [];
        this._loaded = false;
        this.loadImages();
    }

    loadImages() {
        let loadedCount = 0;
        this.buttonImages.forEach((src, i) => {
            const img = new window.Image();
            img.src = src;
            img.onload = () => {
                loadedCount++;
                if (loadedCount === this.buttonImages.length) {
                    this._loaded = true;
                }
            };
            this.images[i] = img;
        });
    }

    render() {
        const pos = this.uiManager.getPosition(this.elementName);
        const x = pos.x !== null ? pos.x : 50;
        const y = pos.y !== null ? pos.y : 50;
        const buttonSize = 64;
        const spacing = 16;
        const width = buttonSize * 5 + spacing * 4;
        const height = buttonSize;
        this.bounds = { x, y, width, height };

        // Borda padronizada e sombra leve
        this.ctx.save();
        if (this.uiManager.isEditMode()) {
            this.ctx.strokeStyle = '#00ff00';
        } else {
            this.ctx.strokeStyle = '#333333';
        }
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = 'rgba(0,0,0,0.4)';
        this.ctx.shadowBlur = 8;
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.restore();

        // Fundo
        this.ctx.fillStyle = UIThemeConfig.getBackgroundColor();
        this.ctx.fillRect(x, y, width, height);

        // Renderiza botões com imagens
        for (let i = 0; i < 5; i++) {
            const bx = x + i * (buttonSize + spacing);
            const by = y;
            if (this.images[i] && this.images[i].complete) {
                this.ctx.drawImage(this.images[i], bx, by, buttonSize, buttonSize);
            } else {
                // Placeholder
                this.ctx.fillStyle = UIThemeConfig.getBackgroundColor();
                this.ctx.fillRect(bx, by, buttonSize, buttonSize);
                this.ctx.font = 'bold 14px Arial';
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText('...', bx + buttonSize/2, by + buttonSize/2);
            }
        }
    }

    handleMouseDown(mouseX, mouseY) {
        // Drag in edit mode
        if (this.uiManager.isEditMode()) {
            if (this.bounds && this.uiManager.startDrag(this.elementName, mouseX, mouseY, this.bounds)) {
                return true;
            }
            return false;
        }

        // Detect button click (normal mode)
        if (this.bounds) {
            const buttonSize = 64;
            const spacing = 16;
            for (let i = 0; i < 5; i++) {
                const bx = this.bounds.x + i * (buttonSize + spacing);
                const by = this.bounds.y;
                if (
                    mouseX >= bx && mouseX <= bx + buttonSize &&
                    mouseY >= by && mouseY <= by + buttonSize
                ) {
                    // Button actions with toggle
                    switch (i) {
                        case 0:
                            // Info player (toggle HUD panel)
                            if (window.game && window.game.renderer && window.game.renderer.hud) {
                                window.game.renderer.hud.togglePlayerInfoVisible();
                            }
                            break;
                        case 1:
                            // List monsters (toggle Pokémon list UI)
                            if (window.game && window.game.renderer && window.game.renderer.hud) {
                                window.game.renderer.hud.togglePokemonListVisible();
                            }
                            break;
                        case 2:
                            // Chat (toggle chat UI visibility)
                            if (window.game && window.game.renderer && window.game.renderer.chatBox) {
                                if (typeof window.game.renderer.chatBox.toggleVisible === 'function') {
                                    window.game.renderer.chatBox.toggleVisible();
                                } else {
                                    // fallback: add a flag to chatBox
                                    if (window.game.renderer.chatBox.visible === undefined) {
                                        window.game.renderer.chatBox.visible = true;
                                    }
                                    window.game.renderer.chatBox.visible = !window.game.renderer.chatBox.visible;
                                }
                            }
                            break;
                        case 3:
                            // Battle view (toggle battle view UI)
                            if (window.game && window.game.renderer && window.game.renderer.hud) {
                                window.game.renderer.hud.toggleBattleViewVisible();
                            }
                            break;
                        case 4:
                            // Configs (main menu)
                            if (window.game && window.game._createMainMenu) {
                                window.game._createMainMenu();
                                if (window.game._mainMenu) {
                                    window.game._mainMenu.style.display = (window.game._mainMenu.style.display === 'flex') ? 'none' : 'flex';
                                }
                            }
                            break;
                    }
                    return true;
                }
            }
        }
        return false;
    }
}
