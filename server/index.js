import { config } from './config/serverConfig.js';
import { Database } from './config/database.js';
import { Logger } from './utils/Logger.js';
import { startHttpServer } from './httpServer.js';
import { startGameServer } from './websocketServer.js';

const logger = new Logger('INIT');

async function main() {
	logger.info('Starting ChaosWar servers...');

	const database = new Database(config.database);
	await database.connect();

	const http = await startHttpServer({ database, config });
	logger.info(`HTTP API started on port ${config.httpPort}`);

	const game = await startGameServer({ database, config });
	logger.info(`WebSocket/Game started on port ${config.port}`);

	const shutdown = async (reason) => {
		logger.warn(`Shutting down (${reason})...`);
		try {
			await Promise.allSettled([
				http?.stop?.(),
				game?.stop?.()
			]);
		} finally {
			await database.disconnect().catch(() => {});
		}
		process.exit(0);
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
	process.on('unhandledRejection', (err) => {
		logger.error('Unhandled promise rejection:', err);
		shutdown('unhandledRejection');
	});
	process.on('uncaughtException', (err) => {
		logger.error('Uncaught exception:', err);
		shutdown('uncaughtException');
	});
}

main().catch((err) => {
	logger.error('Failed to start servers:', err);
	process.exit(1);
});
