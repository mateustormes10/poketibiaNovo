// Configuração de cor de fundo dos painéis da UI
// Carrega cor salva do localStorage, se existir
let savedColor = undefined;
try {
    savedColor = localStorage.getItem('ui_panel_bgcolor');
} catch {}
export const UIThemeConfig = {
    // Valor default
    backgroundColor: savedColor || 'rgba(0,0,0,0.5)',
    // Opções disponíveis
    options: [
        { label: 'Transparente (default)', value: 'rgba(0,0,0,0.5)' },
        { label: 'Preto escuro', value: '#111' },
        { label: 'Azul escuro', value: '#113355' },
        { label: 'Rosa escuro', value: '#552244' },
        { label: 'Cinza escuro', value: '#222' }
    ],
    _onColorChange: [],
    setBackgroundColor(color) {
        this.backgroundColor = color;
        try {
            localStorage.setItem('ui_panel_bgcolor', color);
        } catch {}
        if (window.game) window.game.uiBackgroundColor = color;
        this._onColorChange.forEach(cb => { try { cb(color); } catch(e){} });
    },
    getBackgroundColor() {
        return window.game && window.game.uiBackgroundColor ? window.game.uiBackgroundColor : this.backgroundColor;
    }
    ,
    onColorChange(cb) {
        this._onColorChange.push(cb);
    }
};
