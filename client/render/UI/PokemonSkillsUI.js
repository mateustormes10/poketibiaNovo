import { UIThemeConfig } from '../../config/UIThemeConfig.js';
import { SkillDatabase } from '../../../shared/SkillDatabase.js';
// Painel de skills do Pokémon
export class PokemonSkillsUI {
    // Cache de imagens para skills
    static _skillImageCache = {};
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
        this.currentTab = 0; // 0, 1, 2
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
        const width = 240; // reduzido
        const height = 220; // reduzido
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.fillStyle = UIThemeConfig.getBackgroundColor();
        // Bordas arredondadas
        this.ctx.beginPath();
        if (typeof this.ctx.roundRect === 'function') {
            this.ctx.roundRect(x, y, width, height, 18);
        } else {
            // Fallback para browsers sem roundRect
            const r = 18;
            this.ctx.moveTo(x + r, y);
            this.ctx.lineTo(x + width - r, y);
            this.ctx.quadraticCurveTo(x + width, y, x + width, y + r);
            this.ctx.lineTo(x + width, y + height - r);
            this.ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
            this.ctx.lineTo(x + r, y + height);
            this.ctx.quadraticCurveTo(x, y + height, x, y + height - r);
            this.ctx.lineTo(x, y + r);
            this.ctx.quadraticCurveTo(x, y, x + r, y);
        }
        this.ctx.closePath();
        this.ctx.fill();
        // Borda verde em modo de edição
        if (this.uiManager.isEditMode()) {
            this.ctx.save();
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.restore();
        } else {
            this.ctx.save();
            this.ctx.strokeStyle = this.uiManager.dragging === this.elementName ? '#0ff' : '#333a';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            this.ctx.restore();
        }
        // --- Abas ---
        const tabNames = ['1', '2', '3'];
        const tabWidth = 70;
        const tabHeight = 24;
        const tabY = y + 8;
        // Setas laterais centralizadas na altura do painel
        const arrowY = tabY + height / 2;
        // Botão esquerda
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x + 18, arrowY, 12, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#444';
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('<', x + 18, arrowY + 5);
        this.ctx.restore();
        // Botão direita
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x + width - 18, arrowY, 12, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#444';
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('>', x + width - 18, arrowY + 5);
        this.ctx.restore();
        // Abas
        for (let i = 0; i < 3; i++) {
            this.ctx.save();
            const tabX = x + 10 + i * (tabWidth + 8);
            this.ctx.beginPath();
            this.ctx.rect(tabX, tabY, tabWidth, tabHeight);
            this.ctx.fillStyle = (this.currentTab === i) ? '#ff6600' : '#222';
            this.ctx.fill();
            this.ctx.strokeStyle = (this.currentTab === i) ? '#fff' : '#444';
            this.ctx.lineWidth = (this.currentTab === i) ? 2 : 1;
            this.ctx.stroke();
            this.ctx.font = 'bold 13px Arial';
            this.ctx.fillStyle = (this.currentTab === i) ? '#fff' : '#aaa';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(tabNames[i], tabX + tabWidth / 2, tabY + 17);
            this.ctx.restore();
        }
        // Skills da aba atual
        const skillsToShow = this.skills.slice(this.currentTab * 4, this.currentTab * 4 + 4);
        // Layout: 4 grandes em cruz
        const centerX = x + width / 2;
        const centerY = y + height / 2 + 10;
        const bigSize = 50;
        const spacing = 6;
        const bigPositions = [
            { x: centerX, y: centerY - bigSize - spacing }, // cima
            { x: centerX - bigSize - spacing, y: centerY }, // esquerda
            { x: centerX + bigSize + spacing, y: centerY }, // direita
            { x: centerX, y: centerY + bigSize + spacing }  // baixo
        ];
        this.skillButtonBounds = [];
        for (let i = 0; i < 4; i++) {
            const skill = skillsToShow[i];
            if (!skill) continue;
            const pos = bigPositions[i];
            const size = bigSize;
            const fontSize = 18;
            const numberFontSize = 9;
            const skillName = skill && skill.name ? skill.name : '';
            const cooldownKey = skillName;
            let cd = skill && skill.cowndown ? skill.cowndown : 0;
            let now = Date.now();
            let cooldowns = window.game && window.game._skillCooldowns ? window.game._skillCooldowns : {};
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
            // Ícone: sprite da skill (imagePath)
            if (skill && skill.imagePath) {
                let img = PokemonSkillsUI._skillImageCache[skill.imagePath];
                if (!img) {
                    img = new window.Image();
                    img.src = skill.imagePath;
                    PokemonSkillsUI._skillImageCache[skill.imagePath] = img;
                }
                if (img.complete && img.naturalWidth > 0) {
                    const iconSize = Math.round(size * 0.8);
                    this.ctx.drawImage(img, btnX + (size - iconSize) / 2, btnY + (size - iconSize) / 2, iconSize, iconSize);
                } else {
                    // fallback: letra enquanto carrega
                    this.ctx.font = `bold ${fontSize}px Arial`;
                    this.ctx.fillStyle = '#fff';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(skillName ? skillName[0] : '?', btnX + size / 2, btnY + size / 2 + (fontSize/2.5));
                }
            } else {
                // Fallback: letra
                this.ctx.font = `bold ${fontSize}px Arial`;
                this.ctx.fillStyle = '#fff';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(skillName ? skillName[0] : '?', btnX + size / 2, btnY + size / 2 + (fontSize/2.5));
            }
            // Número
            this.ctx.font = `${numberFontSize}px Arial`;
            this.ctx.fillStyle = '#ff0';
            this.ctx.fillText(this.currentTab * 4 + i + 1, btnX + size - 7, btnY + size - 5);
            // Cooldown overlay
            if (remaining > 0) {
                this.ctx.font = `${numberFontSize}px Arial`;
                this.ctx.fillStyle = '#faa';
                this.ctx.fillText(`${remaining}s`, btnX + size / 2, btnY + size - 5);
            }
            this.skillButtonBounds.push({ x: btnX, y: btnY, width: size, height: size, skillName, skill, index: this.currentTab * 4 + i, disabled: remaining > 0 });
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
        // Checa clique nas abas
        const pos = this.uiManager.getPosition(this.elementName);
        const x = pos.x;
        const y = pos.y;
        const width = 240;
        const tabWidth = 60;
        const tabHeight = 24;
        const tabY = y + 8;
        const height = 220;
        // Setas (área de clique centralizada no painel)
        const arrowY = tabY + height / 2;
        // Esquerda
        const distLeft = Math.sqrt(Math.pow(mouseX - (x + 18), 2) + Math.pow(mouseY - arrowY, 2));
        if (distLeft <= 12) {
            this.currentTab = (this.currentTab + 2) % 3;
            this.selectedSkillIndex = null;
            return true;
        }
        // Direita
        const distRight = Math.sqrt(Math.pow(mouseX - (x + width - 18), 2) + Math.pow(mouseY - arrowY, 2));
        if (distRight <= 12) {
            this.currentTab = (this.currentTab + 1) % 3;
            this.selectedSkillIndex = null;
            return true;
        }
        // Abas
        for (let i = 0; i < 3; i++) {
            const tabX = x + 38 + i * (tabWidth + 8);
            if (mouseX >= tabX && mouseX <= tabX + tabWidth && mouseY >= tabY && mouseY <= tabY + tabHeight) {
                this.currentTab = i;
                this.selectedSkillIndex = null;
                return true;
            }
        }
        // Skills
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

    // Certifique-se de que o método handleMouseDown está sendo chamado pelo painel de skills
    // Se não estiver, adicione um método público para delegar o clique do mouse
    onMouseDown(mouseX, mouseY) {
        return this.handleMouseDown(mouseX, mouseY);
    }
}
