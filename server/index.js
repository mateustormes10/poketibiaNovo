import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
// Executa o generate_sprites_index.js ao iniciar o servidor, antes de carregar mapas
import { execSync } from 'child_process';
try {
	console.log('[INIT] Gerando sprites_index.json...');
	execSync('node ./generate_sprites_index.js', { stdio: 'inherit', cwd: __dirname });
	console.log('[INIT] sprites_index.json atualizado com sucesso!');
} catch (err) {
	console.error('[INIT] Erro ao gerar sprites_index.json:', err);
}

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
