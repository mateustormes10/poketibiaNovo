import { ClientEvents, ServerEvents } from '../../shared/protocol/actions.js';
import { InventoryServerEvents } from '../../shared/protocol/InventoryProtocol.js';

export class ProtocolHandler {
        sendChangeFloor(direction, x, y, z) {
            this.wsClient.send(ClientEvents.CHANGE_FLOOR, { direction, x, y, z });
        }
    constructor(wsClient, gameState, inventoryManager = null) {
        this.wsClient = wsClient;
        this.gameState = gameState;
        this.inventoryManager = inventoryManager;
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
        
        // Inventory handlers
        if (this.inventoryManager) {
            this.wsClient.on(InventoryServerEvents.INVENTORY_DATA, (data) => {
                this.inventoryManager.receiveInventoryData(data);
            });
            
            this.wsClient.on(InventoryServerEvents.INVENTORY_UPDATE, (data) => {
                this.inventoryManager.receiveInventoryUpdate(data);
            });
            
            this.wsClient.on(InventoryServerEvents.ITEM_USED, (data) => {
                this.inventoryManager.receiveItemUsed(data);
            });
            
            this.wsClient.on(InventoryServerEvents.ITEM_ADDED, (data) => {
                this.inventoryManager.receiveItemAdded(data);
            });
            
            this.wsClient.on(InventoryServerEvents.INVENTORY_ERROR, (data) => {
                this.inventoryManager.receiveError(data);
            });
        }
    }
    
    setInventoryManager(inventoryManager) {
        this.inventoryManager = inventoryManager;
        // Re-setup handlers para incluir inventário
        this.setupHandlers();
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
