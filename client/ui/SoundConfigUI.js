export class SoundConfigUI {
    constructor() {
        this.containerId = 'sound-config-ui';
    }

    render() {
        let container = document.getElementById(this.containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = this.containerId;
            document.body.appendChild(container);
        }
        container.innerHTML = '';
        container.style = 'position:fixed;top:12%;left:50%;transform:translateX(-50%);background:#222;padding:24px 32px;border-radius:12px;z-index:10000;color:#fff;box-shadow:0 0 24px #0008;max-width:90vw;min-width:320px;';

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
        title.textContent = 'Configurações de Som';
        container.appendChild(title);

        // Volume geral
        const labelVolume = document.createElement('label');
        labelVolume.textContent = 'Volume Geral:';
        labelVolume.style = 'display:block;margin-top:16px;';
        const inputVolume = document.createElement('input');
        inputVolume.type = 'range';
        inputVolume.min = 0;
        inputVolume.max = 100;
        inputVolume.value = localStorage.getItem('sound_volume') || 80;
        inputVolume.style = 'width:200px;margin-left:12px;';
        inputVolume.oninput = (e) => {
            localStorage.setItem('sound_volume', e.target.value);
        };
        labelVolume.appendChild(inputVolume);
        container.appendChild(labelVolume);

        // Mute
        const labelMute = document.createElement('label');
        labelMute.style = 'display:block;margin-top:16px;';
        const inputMute = document.createElement('input');
        inputMute.type = 'checkbox';
        inputMute.checked = localStorage.getItem('sound_muted') === 'true';
        inputMute.onchange = (e) => {
            localStorage.setItem('sound_muted', e.target.checked);
        };
        labelMute.appendChild(inputMute);
        labelMute.appendChild(document.createTextNode(' Mutar Som'));
        container.appendChild(labelMute);
    }
}
