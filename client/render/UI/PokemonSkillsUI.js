import { SkillDatabase } from '../../../shared/SkillDatabase.js';
// Painel de skills do Pokémon
export class PokemonSkillsUI {
    constructor(ctx, uiManager) {
        this.ctx = ctx;
        this.uiManager = uiManager;
        this.visible = false;
        this.skills = [];
        this.elementName = 'pokemonSkillsPanel';
        this.skillButtonBounds = [];
        this.onSkillClick = null; // callback (skillName, skill, index)
        this._cooldownInterval = null;
    }

    setSkills(skills) {
        this.skills = skills || [];
    }

    show(skills) {
        this.setSkills(skills);
        this.visible = true;
        this.skillButtonBounds = [];
        // Timer para atualizar cooldown visual
        if (!this._cooldownInterval) {
            this._cooldownInterval = setInterval(() => {
                if (!this.visible) return;
                if (typeof window.game === 'undefined' || !window.game || !window.game.renderer) return;
                window.game.renderer.render(window.game.gameState);
            }, 1000);
        }
    }

    hide() {
        this.visible = false;
        this.skillButtonBounds = [];
        if (this._cooldownInterval) {
            clearInterval(this._cooldownInterval);
            this._cooldownInterval = null;
        }
    }

    render() {
        if (!this.visible || !this.skills.length) return;
        const pos = this.uiManager.getPosition(this.elementName);
        const x = pos.x;
        const y = pos.y;
        const width = 320;
        const height = 180;
        this.ctx.save();
        this.ctx.globalAlpha = 0.98;
        this.ctx.fillStyle = '#222a';
        this.ctx.fillRect(x, y, width, height);
        this.ctx.globalAlpha = 1;
        this.ctx.strokeStyle = this.uiManager.isEditMode() && this.uiManager.dragging === this.elementName ? '#0ff' : '#333a';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Skills do Pokémon:', x + 16, y + 32);
        this.skillButtonBounds = [];
        // Acessa cooldowns do Game
        const game = window.game;
        const cooldowns = game && game._skillCooldowns ? game._skillCooldowns : {};
        for (let i = 0; i < Math.min(this.skills.length, 12); i++) {
            const skill = this.skills[i];
            const skillName = skill && skill.name ? skill.name : '';
            const cooldownKey = skillName;
            // Botão visual
            const btnX = x + 20;
            const btnY = y + 45 + i * 45;
            const btnW = 280;
            const btnH = 40;
            // Cooldown
            let cd = skill && skill.cowndown ? skill.cowndown : 0;
            let cdMs = cd * 1000;
            let now = Date.now();
            let remaining = cooldowns[cooldownKey] ? Math.max(0, Math.ceil((cooldowns[cooldownKey] - now) / 1000)) : 0;
            // Fundo do botão
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.fillStyle = remaining > 0 ? '#555a' : '#333a';
            this.ctx.strokeStyle = remaining > 0 ? '#aaa' : '#333a';
            this.ctx.lineWidth = 2;
            this.ctx.roundRect ? this.ctx.roundRect(btnX, btnY, btnW, btnH, 7) : this.ctx.rect(btnX, btnY, btnW, btnH);
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.restore();
            // Texto do botão
            if (skill && skill.name) {
                this.ctx.font = 'bold 13px Arial';
                this.ctx.fillStyle = remaining > 0 ? '#aaa' : '#333a';
                this.ctx.fillText(`${i + 1}. ${skill.name}`, btnX + 10, btnY + 16);
                this.ctx.font = '11px Arial';
                this.ctx.fillStyle = '#fff';
                let cdText = `Cowndown: ${skill.cowndown}s`;
                if (remaining > 0) cdText += ` | Carregando: ${remaining}s`;
                this.ctx.fillText(`${cdText}  |  Power: ${skill.power}  |  Element: ${skill.element}`, btnX + 10, btnY + 27);
            } else {
                this.ctx.font = '13px Arial';
                this.ctx.fillStyle = '#f88';
                this.ctx.fillText(`${i + 1}. ${skillName}`, btnX + 10, btnY + 16);
            }
            // Salva bounds para clique, só permite clique se não estiver em cooldown
            this.skillButtonBounds.push({ x: btnX, y: btnY, width: btnW, height: btnH, skillName, skill, index: i, disabled: remaining > 0 });
        }
        this.ctx.restore();
    }

    handleMouseDown(mouseX, mouseY) {
        if (!this.visible) return false;
        for (const btn of this.skillButtonBounds) {
            if (
                mouseX >= btn.x && mouseX <= btn.x + btn.width &&
                mouseY >= btn.y && mouseY <= btn.y + btn.height
            ) {
                if (btn.disabled) return true; // Bloqueia clique se em cooldown
                if (typeof this.onSkillClick === 'function') {
                    this.onSkillClick(btn.skillName, btn.skill, btn.index);
                }
                return true;
            }
        }
        return false;
    }
}
