import { ServerEvents } from '../../shared/protocol/actions.js';
import { WildPokemonServerEvents } from '../../shared/protocol/WildPokemonProtocol.js';
import { PlayerRepository } from '../persistence/PlayerRepository.js';
import { Logger } from '../utils/Logger.js';
import { GameConstants } from '../../shared/constants/GameConstants.js';

const logger = new Logger('AuthHandler');

export class PortalHandler {
    constructor(gameWorld, wsServer = null) {
        this.gameWorld = gameWorld;
        this.wsServer = wsServer;
        this.playerRepository = new PlayerRepository(gameWorld.database);
    }
    
    async handlePortal(client, data){
        // Verifica player
        const playerId = client.player?.id || client.playerId;
        if (!playerId) {
            console.warn('[MessageRouter] portal: client has no player or playerId');
            return;
        }
        const player = this.gameWorld.players.get(playerId);
        if (!player) {
            console.warn('[MessageRouter] portal: player not found');
            return;
        }

        if (data && data.to && typeof data.to.x === 'number' && typeof data.to.y === 'number' && typeof data.to.z === 'number') {
            // Só teleporta se a posição de destino for diferente da atual
            if (player.x !== data.to.x || player.y !== data.to.y || player.z !== data.to.z) {
                // Log antes da mudança
                console.log('[PORTAL] Antes do teleporte:', {
                    id: player.id,
                    x: player.x,
                    y: player.y,
                    z: player.z
                });

                // Atualiza a posição do player para a posição de destino do portal
                player.x = data.to.x;
                player.y = data.to.y;
                player.z = data.to.z;
                if (this.gameWorld.mapManager && typeof this.gameWorld.mapManager.updatePlayerPosition === 'function') {
                    this.gameWorld.mapManager.updatePlayerPosition(player.id, player.x, player.y, player.z);
                }

                // Atualiza town_id se mudou de cidade
                if (typeof data.to.cidade === 'string') {
                    const townMap = { "CidadeInicial": 1, "Barco": 2 };
                    const newTownId = townMap[data.to.cidade] || 1;
                    await this.playerRepository.updateTownId(player.dbId, newTownId);
                    player.town_id = newTownId; // <-- Atualiza em memória também!
                    console.log(`[PORTAL] town_id do player ${player.name} atualizado para ${newTownId} (${data.to.cidade})`);
                }

                // Log depois da mudança
                console.log('[PORTAL] Depois do teleporte:', {
                    id: player.id,
                    x: player.x,
                    y: player.y,
                    z: player.z,
                    town_id: player.town_id
                });

                // Envia o novo gameState para o player
                const gameState = this.gameWorld.getGameState(player);
                // Log do gameState enviado
                console.log('[PORTAL] Enviando gameState para player:', player.id, JSON.stringify(gameState.players.find(p => p.id === player.id)));
                client.send('gameState', gameState);
                console.log(`[PORTAL] Player ${player.name} teleportado para (${player.x},${player.y},${player.z}) via portal.`);
            } else {
                // Se já está na posição, apenas envia o gameState para garantir atualização de configuração
                const gameState = this.gameWorld.getGameState(player);
                console.log('[PORTAL] Player já está na posição de destino. Enviando gameState para atualização de configuração.', player.id);
                client.send('gameState', gameState);
            }
        } else {
            console.warn('[MessageRouter] portal: dados de destino inválidos', data);
        }
    }
}
