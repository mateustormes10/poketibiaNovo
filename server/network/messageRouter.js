import { ClientEvents } from '../../shared/protocol/actions.js';
import { InventoryClientEvents } from '../../shared/protocol/InventoryProtocol.js';
import { WildPokemonClientEvents } from '../../shared/protocol/WildPokemonProtocol.js';
import { AuthHandler } from '../handlers/authHandler.js';
import { MovementHandler } from '../handlers/movementHandler.js';
import { CombatHandler } from '../handlers/combatHandler.js';
import { ChatHandler } from '../handlers/chatHandler.js';
import { PortalHandler } from '../handlers/portalHandler.js';
import { NpcHandler } from '../handlers/npcHandler.js';
import { InventoryHandler } from '../handlers/inventoryHandler.js';
import { setupWildPokemonHandler } from '../handlers/wildPokemonHandler.js';
import { InventoryService } from '../services/InventoryService.js';
import { handleChangeOutfit } from '../handlers/outfitHandler.js';

export class MessageRouter {
    constructor(gameWorld, wsServer = null) {
        this.gameWorld = gameWorld;
        this.wsServer = wsServer;
        this.handlers = new Map();
        
        this.setupHandlers();
    }
    
    setupHandlers() {
                    // Handler para consulta de vocation do player
                this.handlers.set('get_player_vocation', (client, data) => {
                    let vocation = 0;
                    if (client.player && typeof client.player.vocation !== 'undefined') {
                        vocation = client.player.vocation;
                    }
                    client.send('player_vocation', { vocation });
                });
                    
              
                
        const portalHandler = new PortalHandler(this.gameWorld, this.wsServer);
        const authHandler = new AuthHandler(this.gameWorld, this.wsServer);
        const movementHandler = new MovementHandler(this.gameWorld);
        const combatHandler = new CombatHandler(this.gameWorld);
        const chatHandler = new ChatHandler(this.gameWorld, this.wsServer);
        const npcHandler = new NpcHandler(
            this.gameWorld,
            this.gameWorld.balanceRepository,
            this.gameWorld.npcRepository,
            this.gameWorld.inventoryRepository
        );
        
        // Inventory service e handler
        const inventoryService = new InventoryService(
            this.gameWorld.inventoryRepository,
            this.gameWorld.playerRepository,
            this.gameWorld.playerPokemonRepository
        );
        const inventoryHandler = new InventoryHandler(this.gameWorld, inventoryService);
        
        
        this.handlers.set(ClientEvents.PORTAL, portalHandler.handlePortal.bind(portalHandler));
        this.handlers.set(ClientEvents.LOGIN, authHandler.handleLogin.bind(authHandler));
        this.handlers.set(ClientEvents.MOVE, movementHandler.handleMove.bind(movementHandler));
        this.handlers.set(ClientEvents.ATTACK, combatHandler.handleAttack.bind(combatHandler));
        this.handlers.set(ClientEvents.CHAT, chatHandler.handleChat.bind(chatHandler));
        
        // NPC handlers
        this.handlers.set('npc_interact', npcHandler.handleInteract.bind(npcHandler));
        this.handlers.set('npc_buy', npcHandler.handleBuy.bind(npcHandler));
        
        // Inventory handlers
        this.handlers.set(InventoryClientEvents.REQUEST_INVENTORY, inventoryHandler.handleInventoryRequest.bind(inventoryHandler));
        this.handlers.set(InventoryClientEvents.USE_ITEM, inventoryHandler.handleUseItem.bind(inventoryHandler));
        this.handlers.set(InventoryClientEvents.DROP_ITEM, inventoryHandler.handleDropItem.bind(inventoryHandler));
        
        // Wild Pokémon handlers
        const wildPokemonHandlers = setupWildPokemonHandler(this.gameWorld);
        Object.keys(wildPokemonHandlers).forEach(eventType => {
            this.handlers.set(eventType, wildPokemonHandlers[eventType]);
        });
        
        // Outfit change handler
        this.handlers.set('change_outfit', handleChangeOutfit);


        // Handler para troca de andar
        this.handlers.set(ClientEvents.CHANGE_FLOOR, this.handleChangeFloor.bind(this));

        // Handler para atualização de mapa
        this.handlers.set('requestMapUpdate', this.handleMapUpdate.bind(this));
    }    

    handleChangeFloor(client, data) {
        // Verifica player
        const playerId = client.player?.id || client.playerId;
        if (!playerId) {
            console.warn('[MessageRouter] changeFloor: client has no player or playerId');
            return;
        }
        const player = this.gameWorld.players.get(playerId);
        if (!player) {
            console.warn('[MessageRouter] changeFloor: player not found');
            return;
        }
        // Atualiza posição do player primeiro
        player.x = data.x;
        player.y = data.y;

        // Busca tile atual
        const tile = this.gameWorld.mapManager.getTile(player.x, player.y, player.z);
        let novoZ = player.z;
        if (tile && tile.spriteIds) {
            for (const sprite of tile.spriteIds) {
                if (data.direction === 'up' && typeof sprite === 'string' && sprite.startsWith('UP(')) {
                    const match = sprite.match(/UP\((\d+)\)/);
                    if (match) {
                        novoZ = parseInt(match[1]);
                        break;
                    }
                }
                if (data.direction === 'down' && typeof sprite === 'string' && sprite.startsWith('DOWN(')) {
                    const match = sprite.match(/DOWN\((\d+)\)/);
                    if (match) {
                        novoZ = parseInt(match[1]);
                        break;
                    }
                }
            }
            console.log(`[LOG SPRITES] Player ${player.name} (${player.x},${player.y},${player.z}) sprites:`, tile.spriteIds);
        } else {
            console.log(`[LOG SPRITES] Player ${player.name} (${player.x},${player.y},${player.z}) sem tile ou sprites.`);
        }

        // Atualiza z do player conforme tile
        player.z = novoZ;

        // Garante que chunks do novo andar estão carregados antes de enviar o mapa
        if (this.gameWorld.mapManager && typeof this.gameWorld.mapManager.updatePlayerPosition === 'function') {
            this.gameWorld.mapManager.updatePlayerPosition(player.id, player.x, player.y, player.z);
        }

        // Envia novo estado do jogo
        const gameState = this.gameWorld.getGameState(player);
        // Log detalhado do z do player e do mapa enviado
        console.log(`[MessageRouter] changeFloor: z do player atualizado para ${player.z}`);
        if (gameState && gameState.map) {
            console.log(`[MessageRouter] Tiles enviados: z=${gameState.map.z}, total=${gameState.map.tiles.length}`);
            if (gameState.map.tiles.length > 0) {
                console.log('[MessageRouter] Exemplos de tiles:', gameState.map.tiles.slice(0, 3));
            }
        }
        client.send('gameState', gameState);
    }
    
    handleMapUpdate(client, data) {
        console.log('[MessageRouter] Map update request received');
        console.log('[MessageRouter] Client ID:', client.id);
        console.log('[MessageRouter] Client has player?', !!client.player);
        console.log('[MessageRouter] Client has playerId?', !!client.playerId);
        console.log('[MessageRouter] Client authenticated?', client.authenticated);
        
        // Tenta usar playerId se player não estiver disponível
        const playerId = client.player?.id || client.playerId;
        
        if (!playerId) {
            console.warn('[MessageRouter] Map update requested but client has no player or playerId');
            return;
        }
        
        const player = this.gameWorld.players.get(playerId);
        if (!player) {
            console.warn('[MessageRouter] Map update requested but player not found in gameWorld');
            console.warn('[MessageRouter] Looking for player ID:', playerId);
            console.warn('[MessageRouter] Available players:', Array.from(this.gameWorld.players.keys()));
            return;
        }
        
        // Obtém estado do jogo com mapa atualizado
        const gameState = this.gameWorld.getGameState(player);
        
        // Envia atualização
        client.send('gameState', gameState);
        
        console.log(`[MessageRouter] Map updated for player ${player.name} at (${data.x}, ${data.y}, ${data.z})`);
    }
    
    route(client, message) {
        console.log(`[MessageRouter] Routing message type: ${message.type}`);
        
        const handler = this.handlers.get(message.type);
        
        if (handler) {
            handler(client, message.data);
        } else {
            console.warn(`[MessageRouter] No handler for message type: ${message.type}`);
        }
    }
}
