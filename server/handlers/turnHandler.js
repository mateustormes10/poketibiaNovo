import { ServerEvents } from '../../shared/protocol/actions.js';

export class TurnHandler {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
    }

    handleTurn(client, data) {
        if (!client.player) return;
        const { direction } = data;
        if (!direction || !['up','down','left','right'].includes(direction)) return;
        client.player.direction = direction;
        // Notifica o próprio cliente e outros próximos
        const turnDelta = {
            playerId: client.player.id,
            x: client.player.x,
            y: client.player.y,
            z: client.player.z,
            direction
        };
        client.send(ServerEvents.PLAYER_MOVE, turnDelta);
        // Broadcast para outros jogadores próximos
        const playersInRange = this.gameWorld.getPlayersInArea(
            client.player.x,
            client.player.y,
            client.player.z,
            15
        );
        playersInRange.forEach(player => {
            if (player.id !== client.player.id && player.client) {
                player.client.send(ServerEvents.PLAYER_MOVE, turnDelta);
            }
        });
    }
}
