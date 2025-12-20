import { ClientEvents } from '../../shared/protocol/actions.js';
import { AuthHandler } from '../handlers/authHandler.js';
import { MovementHandler } from '../handlers/movementHandler.js';
import { CombatHandler } from '../handlers/combatHandler.js';
import { ChatHandler } from '../handlers/chatHandler.js';

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
        const chatHandler = new ChatHandler(this.gameWorld);
        
        this.handlers.set(ClientEvents.LOGIN, authHandler.handleLogin.bind(authHandler));
        this.handlers.set(ClientEvents.MOVE, movementHandler.handleMove.bind(movementHandler));
        this.handlers.set(ClientEvents.ATTACK, combatHandler.handleAttack.bind(combatHandler));
        this.handlers.set(ClientEvents.CHAT, chatHandler.handleChat.bind(chatHandler));
        
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
