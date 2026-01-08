import { WebSocketServer } from 'ws';
import { WsClient } from './wsClient.js';
import { MessageRouter } from './messageRouter.js';

import { Logger } from '../utils/Logger.js';
import { PlayerRepository } from '../persistence/PlayerRepository.js';

const logger = new Logger('WsServer');

export class WsServer {
    constructor(port, gameWorld) {
        this.port = port;
        this.gameWorld = gameWorld;
        this.wss = null;
        this.clients = new Map();
        this.messageRouter = new MessageRouter(gameWorld, this);
    }
    
    async start() {
        this.wss = new WebSocketServer({ port: this.port });
        
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });
        
        this.wss.on('error', (error) => {
            logger.error('WebSocket server error:', error);
        });
        
        logger.info(`WebSocket server started on port ${this.port}`);
    }
    
    handleConnection(ws, req) {
        const clientId = this.generateClientId();
        const client = new WsClient(clientId, ws, this.gameWorld);
        
        this.clients.set(clientId, client);
        logger.info(`Client connected: ${clientId} (Total: ${this.clients.size})`);
        
        ws.on('message', (data) => {
            this.handleMessage(client, data);
        });
        
        ws.on('close', () => {
            this.handleDisconnect(client);
        });
        
        ws.on('error', (error) => {
            logger.error(`Client ${clientId} error:`, error);
        });
        
        // Envia estado inicial
        client.send('connected', { clientId });
    }
    
    handleMessage(client, data) {
        try {
            const message = JSON.parse(data.toString());
            this.messageRouter.route(client, message);
        } catch (error) {
            logger.error('Error handling message:', error);
        }
    }
    
    async handleDisconnect(client) {
        logger.info(`Client disconnected: ${client.id}`);
        // Salva player antes de remover do mundo
        if (client.player) {
            // Se o player está transformado em Pokémon, busca o outfit original do banco
            if (Array.isArray(client.player.sprite)) {
                try {
                    // PlayerRepository já existe em gameWorld
                    const repo = this.gameWorld.playerRepository;
                    const dbPlayer = await repo.findById(client.player.dbId || client.player.id);
                    if (dbPlayer && dbPlayer.lookaddons) {
                        client.player.sprite = dbPlayer.lookaddons;
                    } else {
                        client.player.sprite = 'default';
                    }
                } catch (e) {
                    logger.error('Erro ao restaurar outfit original do player:', e);
                    client.player.sprite = 'default';
                }
            }
            logger.info(`Saving player ${client.player.name} before disconnect...`);
            await this.gameWorld.savePlayer(client.player)
                .then(() => {
                    logger.info(`Player ${client.player.name} saved successfully`);
                }).catch(error => {
                    logger.error(`Error saving player ${client.player.name}:`, error);
                });
            this.gameWorld.removePlayer(client.player.id);
        }
        this.clients.delete(client.id);

        // Broadcast para todos os clientes: lista de jogadores
        if (this.gameWorld && this.gameWorld.wsServer) {
            const allPlayers = Array.from(this.gameWorld.players.values()).map(p => p.serialize());
            this.gameWorld.wsServer.broadcast('players_update', JSON.stringify(allPlayers));
        }
    }
    
    broadcast(type, data, excludeClient = null) {
        const message = JSON.stringify({ type, data });
        
        this.clients.forEach(client => {
            if (client !== excludeClient && client.isConnected()) {
                client.ws.send(message);
            }
        });
    }
    
    broadcastToArea(x, y, z, range, type, data) {
        const message = JSON.stringify({ type, data });
        
        this.clients.forEach(client => {
            if (client.player && client.isConnected()) {
                const dx = Math.abs(client.player.x - x);
                const dy = Math.abs(client.player.y - y);
                
                if (client.player.z === z && dx <= range && dy <= range) {
                    client.ws.send(message);
                }
            }
        });
    }
    
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    stop() {
        this.clients.forEach(client => {
            client.ws.close();
        });
        
        if (this.wss) {
            this.wss.close();
        }
        
        logger.info('WebSocket server stopped');
    }
}
