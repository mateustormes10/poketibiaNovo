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

    // Função para checar se o jogo está pronto para remover o loading
    function isGameReady(game) {
        // Garante que o mapa principal está carregado
        if (!game.gameState.map || !game.gameState.map.tiles || game.gameState.map.tiles.size === 0) return false;
        // Garante que o player está carregado
        if (!game.gameState.localPlayer) return false;
        // Se o player está em z=4, precisa do mapDown
        if (game.gameState.localPlayer.z === 4) {
            if (!game.gameState.mapDown || !game.gameState.mapDown.tiles || game.gameState.mapDown.tiles.length === 0) return false;
        }
        return true;
    }

    game.init().then(() => {
        // Checa periodicamente se o jogo está pronto
        const checkReady = () => {
            if (isGameReady(game)) {
                loadingDiv.remove();
                console.log('Game initialized successfully');
                game.start();
            } else {
                setTimeout(checkReady, 100); // Checa novamente em 100ms
            }
        };
        checkReady();
    }).catch(err => {
        loadingDiv.remove();
        console.error('Failed to initialize game:', err);
    });
});
