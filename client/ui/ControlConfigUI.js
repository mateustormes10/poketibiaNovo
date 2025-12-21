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
        container.style = 'position:fixed;top:10%;left:50%;transform:translateX(-50%);background:#222;padding:24px 32px;border-radius:12px;z-index:10000;color:#fff;box-shadow:0 0 24px #0008;max-width:90vw;';

        // Botão de fechar (X vermelho)
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Fechar');
        closeBtn.style = 'position:absolute;top:10px;right:10px;width:32px;height:32px;font-size:2em;line-height:28px;padding:0;border-radius:50%;border:none;background:#fff;color:#c00;cursor:pointer;z-index:10001;display:flex;align-items:center;justify-content:center;box-shadow:0 0 4px #0003;';
        closeBtn.onmouseenter = () => { closeBtn.style.background = '#fee'; };
        closeBtn.onmouseleave = () => { closeBtn.style.background = '#fff'; };
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
            input.style = 'width:100px;text-align:center;';
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
            input.style = 'width:60px;text-align:center;';
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
        btns.style = 'margin-top:16px;text-align:right;';
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Salvar';
        saveBtn.onclick = () => {
            this.saveConfig();
            container.style.display = 'none';
            alert('Configurações salvas!');
        };
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Restaurar padrão';
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
