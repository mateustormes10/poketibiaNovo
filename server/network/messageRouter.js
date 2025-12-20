import { ClientEvents } from '../../shared/protocol/actions.js';
import { InventoryClientEvents } from '../../shared/protocol/InventoryProtocol.js';
import { WildPokemonClientEvents } from '../../shared/protocol/WildPokemonProtocol.js';
import { AuthHandler } from '../handlers/authHandler.js';
import { MovementHandler } from '../handlers/movementHandler.js';
import { CombatHandler } from '../handlers/combatHandler.js';
import { ChatHandler } from '../handlers/chatHandler.js';
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
        
        // Handler para atualização de mapa
        this.handlers.set('requestMapUpdate', this.handleMapUpdate.bind(this));
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
