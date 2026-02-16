import { config } from './config/serverConfig.js';
import { Database } from './config/database.js';
import { Logger } from './utils/Logger.js';
import { startHttpServer } from './httpServer.js';
import { startGameServer } from './websocketServer.js';
import path from 'path';
import { fileURLToPath } from 'url';

const logger = new Logger('INIT');

// Em workspace multi-root, o processo pode iniciar com cwd "errado".
// Garantimos que paths relativos (ex: ./client/assets) resolvam no projeto.
try {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	process.chdir(path.resolve(__dirname, '..'));
} catch {
	// ignore
}

async function main() {
	logger.info('Starting ChaosWar servers...');

	const database = new Database(config.database);
	await database.connect();

	const http = await startHttpServer({ database, config });
	logger.info(`HTTP API started on port ${config.httpPort}`);

	const game = await startGameServer({ database, config });
	logger.info(`WebSocket/Game started on port ${config.port}`);

	let shuttingDown = false;
	const withTimeout = async (promise, ms, label) => {
		const safeMs = Math.max(0, Number(ms) || 0);
		if (safeMs === 0) return promise;
		return await Promise.race([
			promise,
			new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout after ${safeMs}ms`)), safeMs))
		]);
	};

	const shutdown = async (reason) => {
		if (shuttingDown) {
			logger.warn(`Shutdown already in progress (${reason}). Forcing exit...`);
			process.exit(130);
			return;
		}
		shuttingDown = true;
		logger.warn(`Shutting down (${reason})... (Ctrl+C again to force)`);
		try {
			await withTimeout(
				Promise.allSettled([
					http?.stop?.(),
					game?.stop?.()
				]),
				3000,
				'shutdown'
			);
		} catch (e) {
			logger.error('Shutdown did not finish gracefully:', e?.message || e);
		} finally {
			await database.disconnect().catch(() => {});
			process.exit(0);
		}
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
