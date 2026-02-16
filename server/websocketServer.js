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

    // Autosave best-effort (reduz perda em crash/desligamento)
    try {
        gameWorld.startAutosave({ intervalMs: 30000 });
    } catch {}

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
            try { gameWorld.stopAutosave?.(); } catch {}
            try { await gameWorld.flushAllPlayers?.({ reason: 'shutdown' }); } catch {}
            await wsServer.stop({ timeoutMs: 1500 });
            if (ownDatabase) {
                await db.disconnect();
            }
        }
    };
}

// Permite rodar diretamente: `node websocketServer.js`
const entryFile = process.argv?.[1];
const isMain = typeof entryFile === 'string' && entryFile.length > 0
    ? (import.meta.url === pathToFileURL(entryFile).href)
    : false;
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
