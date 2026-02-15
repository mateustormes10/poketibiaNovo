import { Logger } from '../utils/Logger.js';

const logger = new Logger('WsClient');

export class WsClient {
    constructor(id, ws, gameWorld) {
        this.id = id;
        this.ws = ws;
        this.gameWorld = gameWorld;
        this.player = null;
        this.authenticated = false;
        this.lang = 'en';
    }
    
    send(type, data) {
        if (!this.isConnected()) return;
        
        const message = JSON.stringify({ type, data });
        try {
            this.ws.send(message);
        } catch (error) {
            logger.warn(`Send failed for ${this.id}:`, error?.message || error);
            try { this.ws.terminate(); } catch {}
        }
    }
    
    isConnected() {
        return this.ws.readyState === 1; // WebSocket.OPEN
    }
    
    setPlayer(player) {
        this.player = player;
        this.playerId = player.id; // Adiciona também como playerId para compatibilidade
        player.clientState = this; // Vincula o WsClient ao player
		logger.info(`Player set: ${player.name} (ID: ${player.id}) | clientState vinculado`);
    }
    
    authenticate() {
        this.authenticated = true;
    }
}
