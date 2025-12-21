export class GraphicsConfigUI {
    constructor() {
        this.containerId = 'graphics-config-ui';
    }

    render() {
        let container = document.getElementById(this.containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this.containerId;
            document.body.appendChild(container);
        }
        container.innerHTML = '';
        container.style = 'position:fixed;top:14%;left:50%;transform:translateX(-50%);background:#222;padding:24px 32px;border-radius:12px;z-index:10000;color:#fff;box-shadow:0 0 24px #0008;max-width:90vw;min-width:320px;';

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
        title.textContent = 'Configurações Gráficas';
        container.appendChild(title);

        // Resolução
        const labelRes = document.createElement('label');
        labelRes.textContent = 'Resolução:';
        labelRes.style = 'display:block;margin-top:16px;';
        const selectRes = document.createElement('select');
        selectRes.style = 'margin-left:12px;';
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
        };
        labelRes.appendChild(selectRes);
        container.appendChild(labelRes);

        // Qualidade
        const labelQuality = document.createElement('label');
        labelQuality.textContent = 'Qualidade:';
        labelQuality.style = 'display:block;margin-top:16px;';
        const selectQuality = document.createElement('select');
        selectQuality.style = 'margin-left:12px;';
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
