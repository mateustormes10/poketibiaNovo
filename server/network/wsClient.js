export class WsClient {
    constructor(id, ws, gameWorld) {
        this.id = id;
        this.ws = ws;
        this.gameWorld = gameWorld;
        this.player = null;
        this.authenticated = false;
    }
    
    send(type, data) {
        if (!this.isConnected()) return;
        
        const message = JSON.stringify({ type, data });
        this.ws.send(message);
    }
    
    isConnected() {
        return this.ws.readyState === 1; // WebSocket.OPEN
    }
    
    setPlayer(player) {
        this.player = player;
        this.playerId = player.id; // Adiciona também como playerId para compatibilidade
        player.clientState = this; // Vincula o WsClient ao player
        console.log(`[WsClient] Player set: ${player.name} (ID: ${player.id}) | clientState vinculado`);
    }
    
    authenticate() {
        this.authenticated = true;
    }
}
