import { ClientEvents as SharedClientEvents, ServerEvents as SharedServerEvents } from '../../shared/protocol/actions.js';
import { ClientEvents, ServerEvents } from './ScanProtocol.js';
import { InventoryServerEvents } from '../../shared/protocol/InventoryProtocol.js';

export class ProtocolHandler {
    /**
     * Envia requisição de scan de Pokémon derrotados
     * @param {string} scannerType - Tipo de scanner (ex: 'BASIC')
     */
    sendScan(scannerType = 'BASIC') {
        this.wsClient.send(ClientEvents.SCAN, { scannerType });
    }
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
        this.wsClient.on(SharedServerEvents.GAME_STATE, (data) => {
            this.handleGameState(data);
        });
        this.wsClient.on(SharedServerEvents.PLAYER_MOVE, (data) => {
            this.handlePlayerMove(data);
        });
        this.wsClient.on(SharedServerEvents.ENTITY_SPAWN, (data) => {
            this.handleEntitySpawn(data);
        });
        this.wsClient.on(SharedServerEvents.ENTITY_DESPAWN, (data) => {
            this.handleEntityDespawn(data);
        });
        this.wsClient.on(SharedServerEvents.CHAT_MESSAGE, (data) => {
            this.handleChatMessage(data);
        });

        // Handler para resposta do scan
        this.wsClient.on(ServerEvents.SCAN_RESULT, (data) => {
            if (window.game && window.game.renderer && window.game.renderer.chatBox) {
                if (data.success) {
                    window.game.renderer.chatBox.addMessage('System', `Scan realizado com sucesso! (${data.scanned} Pokémon)`, 'system');
                } else {
                    let msg = 'Nada para escanear.';
                    if (data.reason === 'nothing_to_scan') msg = 'Nenhum Pokémon derrotado para escanear.';
                    window.game.renderer.chatBox.addMessage('System', msg, 'system');
                }
            } else {
                if (data.success) {
                    alert(`Scan realizado com sucesso! (${data.scanned} Pokémon)`);
                } else {
                    alert('Nada para escanear.');
                }
            }
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
        this.wsClient.send(SharedClientEvents.MOVE, { direction });
    }
    sendChat(message) {
        this.wsClient.send(SharedClientEvents.CHAT, { message });
    }
    sendAttack(targetId) {
        this.wsClient.send(SharedClientEvents.ATTACK, { targetId });
    }
}
