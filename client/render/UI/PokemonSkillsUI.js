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
    }

    setSkills(skills) {
        this.skills = skills || [];
    }

    show(skills) {
        this.setSkills(skills);
        this.visible = true;
        this.skillButtonBounds = [];
        // Não sobrescreve mais o onSkillClick aqui!
    }

    hide() {
        this.visible = false;
        this.skillButtonBounds = [];
        // Não remove o callback onSkillClick!
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
        this.ctx.strokeStyle = this.uiManager.isEditMode() && this.uiManager.dragging === this.elementName ? '#0ff' : '#ff0';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Skills do Pokémon:', x + 16, y + 32);
        this.skillButtonBounds = [];
        for (let i = 0; i < Math.min(this.skills.length, 12); i++) {
            const skillName = this.skills[i];
            const skill = SkillDatabase[skillName];
            // Botão visual
            const btnX = x + 20;
            const btnY = y + 45 + i * 32;
            const btnW = 280;
            const btnH = 28;
            // Fundo do botão
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.fillStyle = '#333a';
            this.ctx.strokeStyle = '#ffd700';
            this.ctx.lineWidth = 2;
            this.ctx.roundRect ? this.ctx.roundRect(btnX, btnY, btnW, btnH, 7) : this.ctx.rect(btnX, btnY, btnW, btnH);
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.restore();
            // Texto do botão
            if (skill) {
                this.ctx.font = 'bold 13px Arial';
                this.ctx.fillStyle = '#ffd700';
                this.ctx.fillText(`${i + 1}. ${skill.name}`, btnX + 10, btnY + 16);
                this.ctx.font = '11px Arial';
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText(`Mana: ${skill.manaCost}  |  Power: ${skill.power}  |  Element: ${skill.element}`, btnX + 10, btnY + 27);
            } else {
                this.ctx.font = '13px Arial';
                this.ctx.fillStyle = '#f88';
                this.ctx.fillText(`${i + 1}. ${skillName}`, btnX + 10, btnY + 16);
            }
            // Salva bounds para clique
            this.skillButtonBounds.push({ x: btnX, y: btnY, width: btnW, height: btnH, skillName, skill, index: i });
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
                if (typeof this.onSkillClick === 'function') {
                    this.onSkillClick(btn.skillName, btn.skill, btn.index);
                }
                return true;
            }
        }
        return false;
    }
}
