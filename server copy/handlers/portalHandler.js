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
        // Atualiza posição do player para o destino do portal
        if (data && data.to && typeof data.to.x === 'number' && typeof data.to.y === 'number' && typeof data.to.z === 'number') {
                            player.x = data.to.x;
                            player.y = data.to.y;
                            player.z = data.to.z;
                            if (this.gameWorld.mapManager && typeof this.gameWorld.mapManager.updatePlayerPosition === 'function') {
                                this.gameWorld.mapManager.updatePlayerPosition(player.id, player.x, player.y, player.z);
                            }
                            // Envia novo estado do jogo
                            const gameState = this.gameWorld.getGameState(player);
                            client.send('gameState', gameState);
                            console.log(`[PORTAL] Player ${player.name} teleportado para (${player.x},${player.y},${player.z}) via portal.`);
        } else {
            console.warn('[MessageRouter] portal: dados de destino inválidos', data);
        }
    }
}
