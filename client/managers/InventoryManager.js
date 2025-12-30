/**
 * InventoryManager
 * 
 * Gerencia o estado e interações do inventário no cliente
 * Coordena entre UI, input e comunicação com servidor
 */

import { InventoryClientEvents, InventoryServerEvents } from '../../shared/protocol/InventoryProtocol.js';

export class InventoryManager {
    constructor(wsClient, inventoryUI) {
        this.wsClient = wsClient;
        this.inventoryUI = inventoryUI;
        this.inventoryData = null;
        this.isOpen = false;
        
        // Callback para quando inventário abrir/fechar
        this.onToggleCallback = null;
    }

    /**
     * Define callback para quando o inventário abre/fecha
     * @param {Function} callback - Função callback (recebe isOpen)
     */
    onToggle(callback) {
        this.onToggleCallback = callback;
    }

    /**
     * Solicita inventário do servidor
     */
    requestInventory() {
        this.wsClient.send(InventoryClientEvents.REQUEST_INVENTORY, {});
    }

    /**
     * Abre o inventário
     * Se não tiver dados, solicita ao servidor
     */
    open() {
        if (this.isOpen) return;
        
        if (!this.inventoryData) {
            this.requestInventory();
        } else {
            this.inventoryUI.open(this.inventoryData);
            this.isOpen = true;
            
            if (this.onToggleCallback) {
                this.onToggleCallback(true);
            }

        }
    }

    /**
     * Fecha o inventário
     */
    close() {
        if (!this.isOpen) return;
        
        this.inventoryUI.close();
        this.isOpen = false;
        
        if (this.onToggleCallback) {
            this.onToggleCallback(false);
        }
        
    }

    /**
     * Alterna estado do inventário
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Recebe dados do inventário do servidor
     * @param {Object} data - Dados do inventário
     */
    receiveInventoryData(data) {
        
        this.inventoryData = data;
        
        if (this.isOpen) {
            this.inventoryUI.updateInventory(data);
        } else {
            // Se estava aguardando dados, abre agora
            this.inventoryUI.open(data);
            this.isOpen = true;
            
            if (this.onToggleCallback) {
                this.onToggleCallback(true);
            }
        }
    }

    /**
     * Recebe atualização do inventário do servidor
     * @param {Object} data - Dados atualizados
     */
    receiveInventoryUpdate(data) {
        this.inventoryData = data;
        
        if (this.isOpen) {
            this.inventoryUI.updateInventory(data);
        }
    }

    /**
     * Usa um item
     * @param {string} itemName - Nome do item
     * @param {Object} context - Contexto adicional
     */
    useItem(itemName, context = {}) {
        console.log('[InventoryManager] Usando item:', itemName);
        
        this.wsClient.send(InventoryClientEvents.USE_ITEM, {
            item_name: itemName,
            context: context
        });
    }

    /**
     * Recebe confirmação de item usado
     * @param {Object} data - Dados do resultado
     */
    receiveItemUsed(data) {
        console.log('[InventoryManager] Item usado:', data);
        // Mostra mensagem de feedback no chat
        if (data.message) {
            // Tenta usar o chatBox global do jogo
            if (window.game && window.game.renderer && window.game.renderer.chatBox) {
                window.game.renderer.chatBox.addMessage('System', data.message, 'system');
            } else {
                console.log('[InventoryManager] Mensagem:', data.message);
            }
        }
    }

    /**
     * Recebe notificação de item adicionado
     * @param {Object} data - Dados do item adicionado
     */
    receiveItemAdded(data) {
        console.log('[InventoryManager] Item adicionado:', data);
        
        if (data.message) {
            console.log('[InventoryManager] Mensagem:', data.message);
            // TODO: Integrar com sistema de mensagens
        }
    }

    /**
     * Recebe erro do inventário
     * @param {Object} data - Dados do erro
     */
    receiveError(data) {
        console.error('[InventoryManager] Erro:', data.errorCode, data.message);
        
        // TODO: Mostrar erro para o usuário
        alert(`Erro no inventário: ${data.message}`);
    }

    /**
     * Renderiza o inventário (se aberto)
     */
    render() {
        if (this.isOpen) {
            console.log('[InventoryManager] render() chamado. isOpen:', this.isOpen);
            this.inventoryUI.render();
        }
    }

    /**
     * Trata clique do mouse
     * @param {number} mouseX - Coordenada X
     * @param {number} mouseY - Coordenada Y
     * @returns {boolean} true se o clique foi consumido
     */
    handleClick(mouseX, mouseY) {
        if (!this.isOpen) return false;
        
        const result = this.inventoryUI.handleClick(mouseX, mouseY);
        
        if (result) {
            if (result.action === 'use') {
                this.useItem(result.itemName);
                return true;
            } else if (result.action === 'select') {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Trata movimento do mouse
     * @param {number} mouseX - Coordenada X
     * @param {number} mouseY - Coordenada Y
     */
    handleMouseMove(mouseX, mouseY) {
        if (this.isOpen) {
            this.inventoryUI.handleMouseMove(mouseX, mouseY);
        }
    }

    /**
     * Verifica se o inventário está aberto
     * @returns {boolean}
     */
    isInventoryOpen() {
        return this.isOpen;
    }
}
