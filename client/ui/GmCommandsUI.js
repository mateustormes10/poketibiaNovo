export class GmCommandsUI {
    constructor(game) {
        this.containerId = 'gm-commands-ui';
        this.game = game;
    }

    render() {
        // Só mostra se vocation for 4
        const player = this.game?.gameState?.localPlayer;
        if (!player || player.vocation !== 4) return;

        let container = document.getElementById(this.containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this.containerId;
            document.body.appendChild(container);
        }
        container.innerHTML = '';
        container.style = 'position:fixed;top:16%;left:50%;transform:translateX(-50%);background:#222;padding:28px 36px 24px 36px;border-radius:14px;z-index:10010;color:#fff;box-shadow:0 0 24px #0008;max-width:95vw;min-width:340px;';

        // Botão de fechar (X vermelho)
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Fechar');
        closeBtn.style = 'position:absolute;top:10px;right:10px;width:32px;height:32px;font-size:2em;line-height:28px;padding:0;border-radius:50%;border:none;background:#fff;color:#c00;cursor:pointer;z-index:10011;display:flex;align-items:center;justify-content:center;box-shadow:0 0 4px #0003;';
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
        title.textContent = 'Comandos GM Rápidos';
        title.style = 'margin-bottom:18px;';
        container.appendChild(title);

        // Lista de comandos GM
        const commands = [
            {
                label: '/teleport',
                fields: [
                    { name: 'x', type: 'number', placeholder: 'X' },
                    { name: 'y', type: 'number', placeholder: 'Y' },
                    { name: 'z', type: 'number', placeholder: 'Z' }
                ],
                build: (vals) => `/teleport x(${vals.x}) y(${vals.y}) z(${vals.z})`
            },
            {
                label: '/addgold',
                fields: [
                    { name: 'player', type: 'number', placeholder: 'ID do Player' },
                    { name: 'amount', type: 'number', placeholder: 'Quantidade de Ouro' }
                ],
                build: (vals) => `/addgold player(${vals.player}) amount(${vals.amount})`
            },
            {
                label: '/spawn',
                fields: [
                    { name: 'pokemon', type: 'text', placeholder: 'Nome do Pokémon' },
                    { name: 'level', type: 'number', placeholder: 'Level' }
                ],
                build: (vals) => `/spawn pokemon(${vals.pokemon}) level(${vals.level})`
            },
            {
                label: '/heal',
                fields: [
                    { name: 'player', type: 'number', placeholder: 'ID do Player' }
                ],
                build: (vals) => `/heal player(${vals.player})`
            },
            {
                label: '/kick',
                fields: [
                    { name: 'player', type: 'number', placeholder: 'ID do Player' }
                ],
                build: (vals) => `/kick player(${vals.player})`
            },
            {
                label: '/item add',
                fields: [
                    { name: 'item', type: 'text', placeholder: 'Item' },
                    { name: 'quantity', type: 'number', placeholder: 'Quantidade' },
                    { name: 'player', type: 'number', placeholder: 'ID do Player' }
                ],
                build: (vals) => `/item add(${vals.item}) quantity(${vals.quantity}) player(${vals.player})`
            },
            {
                label: '/setlevel',
                fields: [
                    { name: 'player', type: 'number', placeholder: 'ID do Player' },
                    { name: 'level', type: 'number', placeholder: 'Level' }
                ],
                build: (vals) => `/setlevel player(${vals.player}) level(${vals.level})`
            },
            {
                label: '/broadcast',
                fields: [
                    { name: 'message', type: 'text', placeholder: 'Mensagem' }
                ],
                build: (vals) => `/broadcast message(${vals.message})`
            }
        ];

        commands.forEach(cmd => {
            const form = document.createElement('form');
            form.style = 'margin-bottom:18px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;background:#222b;padding:10px 12px;border-radius:8px;box-shadow:0 0 4px #0002;';
            form.onsubmit = (e) => {
                e.preventDefault();
                const vals = {};
                cmd.fields.forEach(f => {
                    vals[f.name] = form.elements[f.name].value;
                });
                const commandStr = cmd.build(vals);
                // Envia comando para o chat (como se o GM digitasse)
                if (window.game && window.game.wsClient) {
                    window.game.wsClient.send('chat', { message: commandStr, type: 'say' });
                }
                // Feedback visual
                form.style.background = '#2a4';
                setTimeout(() => { form.style.background = '#222b'; }, 400);
            };
            // Label do comando
            const label = document.createElement('span');
            label.textContent = cmd.label;
            label.style = 'min-width:110px;font-weight:bold;';
            form.appendChild(label);
            // Inputs
            cmd.fields.forEach(f => {
                const input = document.createElement('input');
                input.name = f.name;
                input.type = f.type;
                input.placeholder = f.placeholder;
                input.required = true;
                input.style = 'margin-left:4px;padding:4px 8px;border-radius:6px;border:1px solid #444;background:#222;color:#fff;';
                form.appendChild(input);
            });
            // Botão enviar
            const btn = document.createElement('button');
            btn.type = 'submit';
            btn.textContent = 'Enviar';
            btn.style = 'margin-left:8px;padding:4px 16px;border-radius:6px;border:none;background:#444;color:#fff;cursor:pointer;';
            form.appendChild(btn);
            container.appendChild(form);
        });
    }
}
