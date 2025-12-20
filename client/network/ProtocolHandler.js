import { ClientEvents, ServerEvents } from '../../shared/protocol/actions.js';

export class ProtocolHandler {
    constructor(wsClient, gameState) {
        this.wsClient = wsClient;
        this.gameState = gameState;
        this.setupHandlers();
    }
    
    setupHandlers() {
        this.wsClient.on(ServerEvents.GAME_STATE, (data) => {
            this.handleGameState(data);
        });
        
        this.wsClient.on(ServerEvents.PLAYER_MOVE, (data) => {
            this.handlePlayerMove(data);
        });
        
        this.wsClient.on(ServerEvents.ENTITY_SPAWN, (data) => {
            this.handleEntitySpawn(data);
        });
        
        this.wsClient.on(ServerEvents.ENTITY_DESPAWN, (data) => {
            this.handleEntityDespawn(data);
        });
        
        this.wsClient.on(ServerEvents.CHAT_MESSAGE, (data) => {
            this.handleChatMessage(data);
        });
    }
    
    handleGameState(data) {
        this.gameState.update(data);
    }
    
    handlePlayerMove(data) {
        this.gameState.updatePlayerPosition(data);
    }
    
    handleEntitySpawn(data) {
        console.log('Entity spawned:', data);
    }
    
    handleEntityDespawn(data) {
        console.log('Entity despawned:', data);
    }
    
    handleChatMessage(data) {
        console.log('Chat message:', data);
    }
    
    sendMove(direction) {
        this.wsClient.send(ClientEvents.MOVE, { direction });
    }
    
    sendChat(message) {
        this.wsClient.send(ClientEvents.CHAT, { message });
    }
    
    sendAttack(targetId) {
        this.wsClient.send(ClientEvents.ATTACK, { targetId });
    }
}
