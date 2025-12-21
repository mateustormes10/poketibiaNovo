import { Game } from './core/Game.js';
import { gameConfig } from './config/gameConfig.js';

// Inicializa o jogo quando o DOM estiver pronto
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas, gameConfig);
    window.game = game; // Torna acessível globalmente para logs de performance
    
    game.init().then(() => {
        console.log('Game initialized successfully');
        game.start();
    }).catch(err => {
        console.error('Failed to initialize game:', err);
    });
});
