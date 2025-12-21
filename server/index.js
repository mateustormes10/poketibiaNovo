// Inicializador unificado: HTTP API (Express) e WebSocket/Game
import('./httpServer.js')
	.then(() => {
		console.log('[INIT] HTTP API iniciado com sucesso. Iniciando servidor WebSocket/Game...');
		return import('./websocketServer.js');
	})
	.then(() => {
		console.log('[INIT] WebSocket/Game iniciado com sucesso.');
	})
	.catch((err) => {
		console.error('[INIT] Falha ao iniciar servidores:', err);
		process.exit(1);
	});
