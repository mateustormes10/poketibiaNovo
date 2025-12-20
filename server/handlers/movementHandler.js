import { MovementSystem } from '../game/systems/MovementSystem.js';
import { ServerEvents } from '../../shared/protocol/actions.js';

export class MovementHandler {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
        this.movementSystem = new MovementSystem(gameWorld);
    }
    
    handleMove(client, data) {
        if (!client.player) return;
        
        const { direction } = data;
        const success = this.movementSystem.moveEntity(client.player, direction);
        
        if (success) {
            // Atualiza no spatial grid
            this.gameWorld.spatialGrid.update(client.player);
            
            // Atualiza streaming de mapa
            this.gameWorld.mapManager.updatePlayerPosition(
                client.player.id,
                client.player.x,
                client.player.y,
                client.player.z
            );
            
            // Cria delta de movimento
            const moveDelta = {
                playerId: client.player.id,
                x: client.player.x,
                y: client.player.y,
                z: client.player.z,
                direction
            };
            
            // Notifica o cliente (sempre envia movimento próprio)
            client.send(ServerEvents.PLAYER_MOVE, moveDelta);
            
            // Notifica jogadores na área (apenas delta)
            const playersInRange = this.gameWorld.getPlayersInArea(
                client.player.x,
                client.player.y,
                client.player.z,
                15
            );
            
            // Envia para outros jogadores próximos (exceto self)
            playersInRange.forEach(player => {
                if (player.id !== client.player.id) {
                    // TODO: Broadcast para outros clientes
                    // wsServer.sendToPlayer(player.id, ServerEvents.PLAYER_MOVE, moveDelta);
                }
            });
        }
    }
}
