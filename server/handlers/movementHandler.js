import { PokemonEntities } from '../game/entities/PokemonEntities.js';
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

        // Se o player está transformado em pokémon, atualiza a sprite conforme a direção
        if (client.player && client.player.sprite && Array.isArray(client.player.sprite)) {
            // Descobre o nome do pokémon atual
            const pokeName = client.player.pokemonName || client.player.name;
            const pokeData = PokemonEntities[pokeName];
            if (pokeData) {
                let spriteArr = pokeData[`sprite_${direction}`] || pokeData['sprite_down'];
                client.player.sprite = spriteArr;
                client.send('player_outfit_update', { playerId: client.player.id, lookaddons: spriteArr });
            }
        }

        if (success) {
            // LOG: sprites do tile atual do player
            const tile = this.gameWorld.mapManager.getTile(client.player.x, client.player.y, client.player.z);
            if (tile && tile.spriteIds) {
                console.log(`[LOG SPRITES] Player ${client.player.name} (${client.player.x},${client.player.y},${client.player.z}) sprites:`, tile.spriteIds);
            } else {
                console.log(`[LOG SPRITES] Player ${client.player.name} (${client.player.x},${client.player.y},${client.player.z}) sem tile ou sprites.`);
            }

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
