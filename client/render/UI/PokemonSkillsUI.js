import { SkillDatabase } from '../../../shared/SkillDatabase.js';
// Painel de skills do Pokémon
export class PokemonSkillsUI {
        attachKeyListeners() {
            if (this._keyListener) return;
            this._keyListener = (e) => {
                if (!this.visible) return;
                // Bloqueia skills se chat estiver ativo
                if (window.game && window.game.renderer && window.game.renderer.chatBox && window.game.renderer.chatBox.isInputActive && window.game.renderer.chatBox.isInputActive()) {
                    return;
                }
                // Teclas 1 a 9, 0, -, = para skills 1 a 12
                const keyMap = {
                    '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '0': 9, '-': 10, '=': 11
                };
                let idx = keyMap[e.key];
                if (typeof idx === 'number' && idx < this.skills.length) {
                    const btn = this.skillButtonBounds[idx];
                    if (btn && !btn.disabled) {
                        if (typeof this.onSkillClick === 'function') {
                            this.onSkillClick(btn.skillName, btn.skill, btn.index);
                        }
                    }
                }
            };
            window.addEventListener('keydown', this._keyListener);
        }

        detachKeyListeners() {
            if (this._keyListener) {
                window.removeEventListener('keydown', this._keyListener);
                this._keyListener = null;
            }
        }
    constructor(ctx, uiManager) {
        this.ctx = ctx;
        this.uiManager = uiManager;
        this.visible = false;
        this.skills = [];
        this.elementName = 'pokemonSkillsPanel';
        this.skillButtonBounds = [];
        this.onSkillClick = null; // callback (skillName, skill, index)
        this._cooldownInterval = null;
        this.selectedSkillIndex = null;
    }

    setSkills(skills) {
        this.skills = skills || [];
    }

    show(skills) {
        this.setSkills(skills);
        this.visible = true;
        this.skillButtonBounds = [];
        this.attachKeyListeners();
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
        this.detachKeyListeners();
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
        const height = 320;
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
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Skills do Pokémon:', x + width / 2, y + 28);
        this.skillButtonBounds = [];
        // Layout: 4 grandes em cruz e 8 pequenos em duas linhas de 4
        const centerX = x + width / 2;
        const centerY = y + height / 2 - 30;
        const bigSize = 46;
        const smallSize = 26;
        const spacing = 4;
        const game = window.game;
        const cooldowns = game && game._skillCooldowns ? game._skillCooldowns : {};
        // 4 grandes: cruz principal
        const bigPositions = [
            { x: centerX, y: centerY - bigSize - spacing }, // cima (skill 1)
            { x: centerX - bigSize - spacing, y: centerY }, // esquerda (skill 2)
            { x: centerX + bigSize + spacing, y: centerY }, // direita (skill 3)
            { x: centerX, y: centerY + bigSize + spacing }  // baixo (skill 4)
        ];
        // 4 grandes: cruz extra esquerda (membros mais próximos)
        const offsetX = -bigSize * 1.7;
        const offsetY = bigSize * 2.2;
        const reduced = Math.round(bigSize * 0.5) + 2; // tamanho reduzido + pequeno espaçamento
        const bigPositionsExtra = [
            { x: centerX + offsetX, y: centerY + offsetY - reduced }, // cima extra (skill 5)
            { x: centerX + offsetX - reduced, y: centerY + offsetY }, // esquerda extra (skill 6)
            { x: centerX + offsetX + reduced, y: centerY + offsetY }, // direita extra (skill 7)
            { x: centerX + offsetX, y: centerY + offsetY + reduced }  // baixo extra (skill 8)
        ];
        // 4 grandes: cruz extra direita (membros mais próximos)
        const offsetX2 = bigSize * 1.7;
        const offsetY2 = bigSize * 2.2;
        const bigPositionsExtra2 = [
            { x: centerX + offsetX2, y: centerY + offsetY2 - reduced }, // cima extra (skill 9)
            { x: centerX + offsetX2 - reduced, y: centerY + offsetY2 }, // esquerda extra (skill 10)
            { x: centerX + offsetX2 + reduced, y: centerY + offsetY2 }, // direita extra (skill 11)
            { x: centerX + offsetX2, y: centerY + offsetY2 + reduced }  // baixo extra (skill 12)
        ];
        // Renderizar os 12 grandes
        for (let i = 0; i < 12 && i < this.skills.length; i++) {
            let pos, size, fontSize, numberFontSize;
            if (i < 4) {
                pos = bigPositions[i];
                size = bigSize;
                fontSize = 24;
                numberFontSize = 10;
            } else if (i < 12) {
                // Todos os extras (5 a 12) ficam do mesmo tamanho reduzido
                if (i < 8) {
                    pos = bigPositionsExtra[i - 4];
                } else {
                    pos = bigPositionsExtra2[i - 8];
                }
                size = Math.round(bigSize * 0.5);
                fontSize = 12;
                numberFontSize = 8;
            }
            const skill = this.skills[i];
            const skillName = skill && skill.name ? skill.name : '';
            const cooldownKey = skillName;
            let cd = skill && skill.cowndown ? skill.cowndown : 0;
            let now = Date.now();
            let remaining = cooldowns[cooldownKey] ? Math.max(0, Math.ceil((cooldowns[cooldownKey] - now) / 1000)) : 0;
            const btnX = pos.x - size / 2;
            const btnY = pos.y - size / 2;
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(btnX + size / 2, btnY + size / 2, size / 2, 0, 2 * Math.PI);
            this.ctx.fillStyle = remaining > 0 ? '#555a' : (this.selectedSkillIndex === i ? '#0af' : '#333a');
            this.ctx.fill();
            this.ctx.strokeStyle = remaining > 0 ? '#aaa' : '#333a';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            this.ctx.restore();
            // Ícone (placeholder: primeira letra)
            this.ctx.font = `bold ${fontSize}px Arial`;
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(skillName ? skillName[0] : '?', btnX + size / 2, btnY + size / 2 + (fontSize/2.5));
            // Número
            this.ctx.font = `${numberFontSize}px Arial`;
            this.ctx.fillStyle = '#ff0';
            this.ctx.fillText(i + 1, btnX + size - 7, btnY + size - 5);
            // Cooldown overlay
            if (remaining > 0) {
                this.ctx.font = `${numberFontSize}px Arial`;
                this.ctx.fillStyle = '#faa';
                this.ctx.fillText(`${remaining}s`, btnX + size / 2, btnY + size - 5);
            }
            this.skillButtonBounds.push({ x: btnX, y: btnY, width: size, height: size, skillName, skill, index: i, disabled: remaining > 0 });
        }

        
        
        // Painel de detalhes da skill selecionada
        if (this.selectedSkillIndex !== null && this.skills[this.selectedSkillIndex]) {
            const skill = this.skills[this.selectedSkillIndex];
            const panelW = 240;
            const panelH = 140;
            const panelX = x + width + 10;
            const panelY = y + 40;
            this.ctx.save();
            this.ctx.globalAlpha = 0.98;
            this.ctx.fillStyle = '#222c';
            this.ctx.fillRect(panelX, panelY, panelW, panelH);
            this.ctx.globalAlpha = 1;
            this.ctx.strokeStyle = '#0af';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(panelX, panelY, panelW, panelH);
            this.ctx.font = 'bold 15px Arial';
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(skill.name, panelX + 12, panelY + 24);
            this.ctx.font = '12px Arial';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(`Tipo: ${skill.element}`, panelX + 12, panelY + 44);
            this.ctx.fillText(`Poder: ${skill.power}`, panelX + 12, panelY + 62);
            this.ctx.fillText(`Cooldown: ${skill.cowndown}s`, panelX + 12, panelY + 80);
            // Info extra: tipo de efeito e área
            let areaText = '';
            if (skill.targetArea && skill.targetArea !== 'single') {
                areaText = `Área: ${skill.targetArea}`;
            } else {
                areaText = 'Área: alvo único';
            }
            let effectText = '';
            if (skill.type === 'damage') {
                effectText = 'Efeito: Dano em área/alvo';
            } else if (skill.type === 'status') {
                effectText = 'Efeito: Status (não causa dano)';
            } else {
                effectText = `Efeito: ${skill.type || 'Outro'}`;
            }
            this.ctx.font = '11px Arial';
            this.ctx.fillStyle = '#ccc';
            this.ctx.fillText(areaText, panelX + 12, panelY + 98);
            this.ctx.fillText(effectText, panelX + 12, panelY + 112);
            if (skill.description) {
                this.ctx.font = '11px Arial';
                this.ctx.fillStyle = '#ccc';
                this.ctx.fillText(skill.description, panelX + 12, panelY + 128);
            }
            this.ctx.restore();
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
                // Seleciona skill para mostrar detalhes
                this.selectedSkillIndex = btn.index;
                if (typeof this.onSkillClick === 'function') {
                    this.onSkillClick(btn.skillName, btn.skill, btn.index);
                }
                return true;
            }
        }
        // Clicou fora: deseleciona
        this.selectedSkillIndex = null;
        return false;
    }
}
