import { UIThemeConfig } from '../config/UIThemeConfig.js';

export class GraphicsConfigUI {
    constructor() {
        this.containerId = 'graphics-config-ui';
    }

    render() {
        // Remove previous listener to avoid duplicates
        if (this._colorListener) {
            try { UIThemeConfig._onColorChange = UIThemeConfig._onColorChange.filter(cb => cb !== this._colorListener); } catch(e){}
        }
        this._colorListener = () => {
            // Only rerender if panel is visible
            const container = document.getElementById(this.containerId);
            if (container && container.style.display !== 'none') {
                this.render();
            }
        };
        UIThemeConfig.onColorChange(this._colorListener);
        let container = document.getElementById(this.containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this.containerId;
            document.body.appendChild(container);
        }
        
        container.innerHTML = '';
        // Center using game canvas size if available
        let topPx = '14%';
        let leftPx = '50%';
        let transform = 'translateX(-50%)';
        if (window.game && window.game.canvas) {
            const cw = window.game.canvas.width;
            const ch = window.game.canvas.height;
            topPx = Math.round(ch * 0.14) + 'px';
            leftPx = Math.round(cw / 2) + 'px';
            transform = 'translate(-50%,0)';
        }
        container.style = `position:fixed;top:${topPx};left:${leftPx};transform:${transform};background:${UIThemeConfig.getBackgroundColor()};padding:24px 32px;border-radius:12px;z-index:10000;color:#fff;box-shadow:0 0 24px #0008;max-width:90vw;min-width:320px;`;

        container.style.display = 'block';
        
        
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
        title.textContent = 'Configurações Gráficas';
        container.appendChild(title);

        // Adiciona selectbox para cor de fundo dos painéis
        const labelColor = document.createElement('label');
        labelColor.textContent = 'Cor dos Painéis:';
        labelColor.style = 'display:block;margin-top:16px;font-weight:bold;';
        const selectColor = document.createElement('select');
        selectColor.style = `
            margin-left:12px;
            background:#222;
            color:#fff;
            border:1.5px solid #444;
            border-radius:7px;
            padding:6px 18px 6px 8px;
            font-size:1em;
            outline:none;
            box-shadow:0 2px 8px #0003;
            transition: border 0.2s;
        `;
        selectColor.onfocus = () => selectColor.style.border = '1.5px solid #ff6600';
        selectColor.onblur = () => selectColor.style.border = '1.5px solid #444';
        UIThemeConfig.options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            selectColor.appendChild(option);
        });
        // Valor atual
        selectColor.value = UIThemeConfig.getBackgroundColor();
        selectColor.onchange = (e) => {
            UIThemeConfig.setBackgroundColor(e.target.value);
            // Força re-renderização dos painéis
            if (window.game && window.game.renderer && typeof window.game.renderer.render === 'function') {
                window.game.renderer.render(window.game.gameState, window.game.skillEffectManager, window.game.inventoryManager);
            }
        };
        labelColor.appendChild(selectColor);
        container.appendChild(labelColor);

        // Resolução
        const labelRes = document.createElement('label');
        labelRes.textContent = 'Resolução:';
        labelRes.style = 'display:block;margin-top:16px;';
        labelRes.style = 'display:block;margin-top:16px;font-weight:bold;';
        const selectRes = document.createElement('select');
        selectRes.style = `
            margin-left:12px;
            background:#222;
            color:#fff;
            border:1.5px solid #444;
            border-radius:7px;
            padding:6px 18px 6px 8px;
            font-size:1em;
            outline:none;
            box-shadow:0 2px 8px #0003;
            transition: border 0.2s;
        `;
        selectRes.onfocus = () => selectRes.style.border = '1.5px solid #ff6600';
        selectRes.onblur = () => selectRes.style.border = '1.5px solid #444';
        const resolutions = [
            { label: 'Automática', value: 'auto' },
            { label: '800x600', value: '800x600' },
            { label: '1024x768', value: '1024x768' },
            { label: '1280x720', value: '1280x720' },
            { label: '1920x1080', value: '1920x1080' }
        ];
        resolutions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            selectRes.appendChild(option);
        });
        selectRes.value = localStorage.getItem('graphics_resolution') || 'auto';
        selectRes.onchange = (e) => {
            localStorage.setItem('graphics_resolution', e.target.value);
            // Trigger canvas resize in real time
            if (window.game && typeof window.game.setResolution === 'function') {
                window.game.setResolution(e.target.value);
            }
        };
        labelRes.appendChild(selectRes);
        container.appendChild(labelRes);

        // Qualidade
        const labelQuality = document.createElement('label');
        labelQuality.textContent = 'Qualidade:';
        labelQuality.style = 'display:block;margin-top:16px;';
        labelQuality.style = 'display:block;margin-top:16px;font-weight:bold;';
        const selectQuality = document.createElement('select');
        selectQuality.style = `
            margin-left:12px;
            background:#222;
            color:#fff;
            border:1.5px solid #444;
            border-radius:7px;
            padding:6px 18px 6px 8px;
            font-size:1em;
            outline:none;
            box-shadow:0 2px 8px #0003;
            transition: border 0.2s;
        `;
        selectQuality.onfocus = () => selectQuality.style.border = '1.5px solid #ff6600';
        selectQuality.onblur = () => selectQuality.style.border = '1.5px solid #444';
        const qualities = [
            { label: 'Baixa', value: 'low' },
            { label: 'Média', value: 'medium' },
            { label: 'Alta', value: 'high' }
        ];
        qualities.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            selectQuality.appendChild(option);
        });
        selectQuality.value = localStorage.getItem('graphics_quality') || 'high';
        selectQuality.onchange = (e) => {
            localStorage.setItem('graphics_quality', e.target.value);
        };
        labelQuality.appendChild(selectQuality);
        container.appendChild(labelQuality);
    }
}
