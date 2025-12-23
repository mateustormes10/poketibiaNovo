import { Game } from './core/Game.js';
import { gameConfig } from './config/gameConfig.js';


// Inicializa o jogo quando o DOM estiver pronto, com tela de loading de 2 segundos
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas, gameConfig);
    window.game = game; // Torna acessível globalmente para logs de performance

    // Cria tela de loading
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-screen';
    loadingDiv.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:gray;z-index:99999;display:flex;align-items:center;justify-content:center;font-size:2em;color:#fff;';
    loadingDiv.innerHTML = '<div>Carregando game... Aguarde</div>';
    document.body.appendChild(loadingDiv);

    game.init().then(() => {
        setTimeout(() => {
            loadingDiv.remove();
            console.log('Game initialized successfully');
            game.start();
        }, 500); // Espera 2 segundos
    }).catch(err => {
        loadingDiv.remove();
        console.error('Failed to initialize game:', err);
    });
});
