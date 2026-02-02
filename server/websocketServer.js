import { pathToFileURL } from 'url';
import { config as defaultConfig } from './config/serverConfig.js';
import { Database } from './config/database.js';
import { WsServer } from './network/wsServer.js';
import { GameWorld } from './game/GameWorld.js';
import { GameLoop } from './game/GameLoop.js';
import { Logger } from './utils/Logger.js';

const logger = new Logger('Game');

export async function startGameServer({ database, config } = {}) {
    const cfg = config ?? defaultConfig;
    let ownDatabase = false;
    let db = database;
    if (!db) {
        ownDatabase = true;
        db = new Database(cfg.database);
        await db.connect();
    }

    const gameWorld = new GameWorld(db);
    await gameWorld.init();
    global.gameWorld = gameWorld;

    const wsServer = new WsServer(cfg.port, gameWorld);
    await wsServer.start();

    gameWorld.setWsServer(wsServer);

    const gameLoop = new GameLoop(gameWorld, cfg.tickRate);
    gameLoop.start();

    logger.info(`Server running on port ${cfg.port}`);
    logger.info(`Tick rate: ${cfg.tickRate} ticks/second`);

    return {
        gameWorld,
        wsServer,
        gameLoop,
        stop: async () => {
            gameLoop.stop();
            wsServer.stop();
            if (ownDatabase) {
                await db.disconnect();
            }
        }
    };
}

// Permite rodar diretamente: `node websocketServer.js`
const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
    startGameServer({ config: defaultConfig })
        .then((server) => {
            process.on('SIGINT', async () => {
                logger.info('Shutting down server...');
                await server.stop();
                process.exit(0);
            });
        })
        .catch((err) => {
            logger.error('Failed to start server:', err);
            process.exit(1);
        });
}
