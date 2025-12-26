// Painel de skills do Pokémon
export class PokemonSkillsUI {
    constructor(ctx, uiManager) {
        this.ctx = ctx;
        this.uiManager = uiManager;
        this.visible = false;
        this.skills = [];
        this.elementName = 'pokemonSkillsPanel';
    }

    setSkills(skills) {
        this.skills = skills || [];
    }

    show(skills) {
        this.setSkills(skills);
        this.visible = true;
    }

    hide() {
        this.visible = false;
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
        for (let i = 0; i < Math.min(this.skills.length, 12); i++) {
            const skill = this.skills[i];
            this.ctx.fillText(`${i + 1}. ${skill}`, x + 32, y + 60 + i * 24);
        }
        this.ctx.restore();
    }
}
