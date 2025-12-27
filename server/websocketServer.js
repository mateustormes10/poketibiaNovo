import { config } from './config/serverConfig.js';
import { Database } from './config/database.js';
import { WsServer } from './network/wsServer.js';
import { GameWorld } from './game/GameWorld.js';
import { GameLoop } from './game/GameLoop.js';
import { Logger } from './utils/Logger.js';

const logger = new Logger('Server');

async function main() {
    logger.info('Starting ChaosWar Server...');
    
    // Inicializa banco de dados
    const database = new Database(config.database);
    await database.connect();
    
    // Inicializa o mundo do jogo
    const gameWorld = new GameWorld(database);
    await gameWorld.init();
    
    // Inicializa o servidor WebSocket
    const wsServer = new WsServer(config.port, gameWorld);
    await wsServer.start();
    
    // Define referência do wsServer no GameWorld
    gameWorld.setWsServer(wsServer);
    
    // Inicializa o loop do jogo
    const gameLoop = new GameLoop(gameWorld, config.tickRate);
    gameLoop.start();
    
    logger.info(`Server running on port ${config.port}`);
    logger.info(`Tick rate: ${config.tickRate} ticks/second`);
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        logger.info('Shutting down server...');
        gameLoop.stop();
        wsServer.stop();
        await database.disconnect();
        process.exit(0);
    });
}

main().catch(err => {
    logger.error('Failed to start server:', err);
    process.exit(1);
});
