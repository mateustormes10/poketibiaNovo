// MusicPlayer.js
// Classe para controle de músicas de fundo
export class MusicPlayer {
    constructor(basePath = 'assets/') {
        this.basePath = basePath;
        this.audio = null;
        this.current = null;
        this._volume = 0.9;
    }

    play(filename) {
        this.stop();
        this.audio = document.createElement('audio');
        this.audio.src = this.basePath + filename;
        this.audio.loop = true;
        this.audio.autoplay = true;
        this.audio.volume = this._volume;
        document.body.appendChild(this.audio);
        this.current = filename;
        // Logs de depuração
        console.log('[MusicPlayer] Tentando tocar música:', this.audio.src);
        this.audio.addEventListener('play', () => console.log('[MusicPlayer] Música começou a tocar.'));
        this.audio.addEventListener('loadeddata', () => console.log('[MusicPlayer] Música carregada.'));
        this.audio.addEventListener('error', (e) => {
            console.error('[MusicPlayer] Erro ao tentar tocar música:', e, this.audio.error);
        });
        // Fallback: tentar tocar no primeiro clique do usuário se bloqueado
        const tryPlay = () => {
            if (this.audio && this.audio.paused) {
                this.audio.play().then(() => {
                    console.log('[MusicPlayer] Música tocada após interação do usuário.');
                    window.removeEventListener('pointerdown', tryPlay, true);
                }).catch((err) => {
                    console.warn('[MusicPlayer] Falha ao tocar música após interação:', err);
                });
            } else {
                window.removeEventListener('pointerdown', tryPlay, true);
            }
        };
        setTimeout(() => {
            if (this.audio && this.audio.paused) {
                console.warn('[MusicPlayer] A música ainda está pausada após 2s. Pode ser falta de suporte ao formato ou bloqueio do navegador.');
                window.addEventListener('pointerdown', tryPlay, true);
            }
        }, 2000);
    }

    stop() {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            if (this.audio.parentNode) this.audio.parentNode.removeChild(this.audio);
            this.audio = null;
            this.current = null;
            console.log('[MusicPlayer] Música parada.');
        }
    }

    config(volume) {
        this._volume = Math.max(0, Math.min(1, volume));
        if (this.audio) this.audio.volume = this._volume;
        console.log('[MusicPlayer] Volume ajustado para', this._volume);
    }
}
