import { UIThemeConfig } from '../config/UIThemeConfig.js';
// ControlConfigUI.js
// UI de gerenciamento de controles para teclado, touch e gamepad
// Permite mapear ações do jogo para teclas, botões touch e gamepad

import { GameConstants } from '../../shared/constants/GameConstants.js';
const DEFAULT_CONTROLS = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    attack: 'Space',
    openInventory: 'i',
    interact: 'e',
    openChat: 'Enter',
    debug: 'c', // debug action (for dev)
    // Gamepad: button indices
    gamepad_up: 12,
    gamepad_down: 13,
    gamepad_left: 14,
    gamepad_right: 15,
    gamepad_attack: 0,
    gamepad_inventory: 3,
    gamepad_interact: 2,
    gamepad_chat: 9
};

export class ControlConfigUI {
    constructor(containerId = 'control-config-ui') {
        this.containerId = containerId;
        this.controls = { ...DEFAULT_CONTROLS };
        this.loadConfig();
    }

    loadConfig() {
        const saved = localStorage.getItem('game_controls');
        if (saved) {
            try {
                this.controls = { ...DEFAULT_CONTROLS, ...JSON.parse(saved) };
            } catch {}
        }
    }

    saveConfig() {
        localStorage.setItem('game_controls', JSON.stringify(this.controls));
        if (typeof this.onConfigChange === 'function') {
            this.onConfigChange({ ...this.controls });
        }
    }

    resetConfig() {
        this.controls = { ...DEFAULT_CONTROLS };
        this.saveConfig();
        this.render();
    }

    render() {
        let container = document.getElementById(this.containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this.containerId;
            document.body.appendChild(container);
        }
        container.innerHTML = '';
        // Center using game canvas size if available
        let topPx = '10%';
        let leftPx = '50%';
        let transform = 'translateX(-50%)';
        if (window.game && window.game.canvas) {
            const cw = window.game.canvas.width;
            const ch = window.game.canvas.height;
            topPx = Math.round(ch * 0.10) + 'px';
            leftPx = Math.round(cw / 2) + 'px';
            transform = 'translate(-50%,0)';
        }
        container.style = `position:fixed;top:${topPx};left:${leftPx};transform:${transform};background:${UIThemeConfig.getBackgroundColor()};padding:24px 32px;border-radius:12px;z-index:10000;color:#fff;box-shadow:0 0 24px #0008;max-width:90vw;`;

        // Botão de fechar (X vermelho)
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Fechar');
        closeBtn.style = `
            position:absolute;top:10px;right:10px;width:36px;height:36px;
            font-size:2em;line-height:32px;padding:0;
            border-radius:50%;border:none;
            background:#222;color:#ff4444;
            cursor:pointer;z-index:10001;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 8px #0006;
            transition: background 0.2s, color 0.2s;
        `;
        closeBtn.onmouseenter = () => { closeBtn.style.background = '#333'; closeBtn.style.color = '#fff'; };
        closeBtn.onmouseleave = () => { closeBtn.style.background = '#222'; closeBtn.style.color = '#ff4444'; };
        closeBtn.onclick = () => { container.style.display = 'none'; };
        container.appendChild(closeBtn);

        // ESC fecha a UI
        const escListener = (e) => {
            if (e.key === 'Escape') {
                container.style.display = 'none';
                window.removeEventListener('keydown', escListener);
            }
        };
        setTimeout(() => window.addEventListener('keydown', escListener), 0);

        const title = document.createElement('h2');
        title.textContent = 'Configuração de Controles';
        container.appendChild(title);

        const table = document.createElement('table');
        table.style = 'width:100%;margin-bottom:16px;';
        const actions = [
            { key: 'up', label: 'Mover para cima' },
            { key: 'down', label: 'Mover para baixo' },
            { key: 'left', label: 'Mover para esquerda' },
            { key: 'right', label: 'Mover para direita' },
            { key: 'attack', label: 'Atacar' },
            { key: 'openInventory', label: 'Abrir Inventário' },
            { key: 'interact', label: 'Interagir' },
            { key: 'openChat', label: 'Abrir Chat' },
            { key: 'debug', label: 'Debug (dev)' }
        ];
        actions.forEach(action => {
            const tr = document.createElement('tr');
            const tdLabel = document.createElement('td');
            tdLabel.textContent = action.label;
            const tdInput = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            input.value = this.controls[action.key];
            input.style = `
                width:100px;text-align:center;
                background:#222;
                color:#fff;
                border:1.5px solid #444;
                border-radius:7px;
                padding:6px 8px;
                font-size:1em;
                outline:none;
                box-shadow:0 2px 8px #0003;
                transition: border 0.2s;
            `;
            input.onfocus = () => input.style.border = '1.5px solid #ff6600';
            input.onblur = () => input.style.border = '1.5px solid #444';
            input.addEventListener('focus', () => {
                input.value = '';
                const onKey = e => {
                    this.controls[action.key] = e.key;
                    input.value = e.key;
                    this.saveConfig();
                    window.removeEventListener('keydown', onKey, true);
                };
                window.addEventListener('keydown', onKey, true);
            });
            tdInput.appendChild(input);
            tr.appendChild(tdLabel);
            tr.appendChild(tdInput);
            table.appendChild(tr);
        });
        container.appendChild(table);

        // Gamepad config
        const gamepadTitle = document.createElement('h3');
        gamepadTitle.textContent = 'Gamepad (controle)';
        container.appendChild(gamepadTitle);
        const gamepadTable = document.createElement('table');
        gamepadTable.style = 'width:100%;margin-bottom:16px;';
        const gamepadActions = [
            { key: 'gamepad_up', label: 'Cima (D-Pad)' },
            { key: 'gamepad_down', label: 'Baixo (D-Pad)' },
            { key: 'gamepad_left', label: 'Esquerda (D-Pad)' },
            { key: 'gamepad_right', label: 'Direita (D-Pad)' },
            { key: 'gamepad_attack', label: 'Atacar (A)' },
            { key: 'gamepad_inventory', label: 'Inventário (Y)' },
            { key: 'gamepad_interact', label: 'Interagir (X)' },
            { key: 'gamepad_chat', label: 'Chat (Start)' }
        ];
        gamepadActions.forEach(action => {
            const tr = document.createElement('tr');
            const tdLabel = document.createElement('td');
            tdLabel.textContent = action.label;
            const tdInput = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'number';
            input.value = this.controls[action.key];
            input.style = `
                width:60px;text-align:center;
                background:#222;
                color:#fff;
                border:1.5px solid #444;
                border-radius:7px;
                padding:6px 8px;
                font-size:1em;
                outline:none;
                box-shadow:0 2px 8px #0003;
                transition: border 0.2s;
            `;
            input.onfocus = () => input.style.border = '1.5px solid #ff6600';
            input.onblur = () => input.style.border = '1.5px solid #444';
            input.addEventListener('change', () => {
                this.controls[action.key] = parseInt(input.value, 10);
                this.saveConfig();
            });
            tdInput.appendChild(input);
            tr.appendChild(tdLabel);
            tr.appendChild(tdInput);
            gamepadTable.appendChild(tr);
        });
        container.appendChild(gamepadTable);

        // Touch info
        const touchInfo = document.createElement('div');
        touchInfo.innerHTML = '<b>Toque:</b> Use os botões virtuais na tela do celular. (Configuração automática)';
        container.appendChild(touchInfo);

        // Botões de ação
        const btns = document.createElement('div');
        btns.style = 'margin-top:16px;text-align:right;display:flex;gap:12px;justify-content:flex-end;';
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Salvar';
        saveBtn.style = `
            background:#222;
            color:#fff;
            border:1.5px solid #444;
            border-radius:7px;
            padding:8px 22px;
            font-size:1em;
            font-weight:bold;
            cursor:pointer;
            box-shadow:0 2px 8px #0003;
            transition: background 0.2s, border 0.2s, color 0.2s;
        `;
        saveBtn.onmouseenter = () => { saveBtn.style.background = '#333'; saveBtn.style.border = '1.5px solid #ff6600'; };
        saveBtn.onmouseleave = () => { saveBtn.style.background = '#222'; saveBtn.style.border = '1.5px solid #444'; };
        saveBtn.onclick = () => {
            this.saveConfig();
            container.style.display = 'none';
            alert('Configurações salvas!');
        };
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Restaurar padrão';
        resetBtn.style = `
            background:#222;
            color:#fff;
            border:1.5px solid #444;
            border-radius:7px;
            padding:8px 22px;
            font-size:1em;
            font-weight:bold;
            cursor:pointer;
            box-shadow:0 2px 8px #0003;
            transition: background 0.2s, border 0.2s, color 0.2s;
        `;
        resetBtn.onmouseenter = () => { resetBtn.style.background = '#333'; resetBtn.style.border = '1.5px solid #ff6600'; };
        resetBtn.onmouseleave = () => { resetBtn.style.background = '#222'; resetBtn.style.border = '1.5px solid #444'; };
        resetBtn.onclick = () => {
            this.resetConfig();
            container.style.display = 'none';
        };
        btns.appendChild(saveBtn);
        btns.appendChild(resetBtn);
        container.appendChild(btns);
    }

    getConfig() {
        return { ...this.controls };
    }
}

// Para uso: const ui = new ControlConfigUI(); ui.render();
