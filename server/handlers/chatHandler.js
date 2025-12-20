import { ServerEvents } from '../../shared/protocol/actions.js';
import { GameConstants } from '../../shared/constants/GameConstants.js';

export class ChatHandler {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
    }
    
    handleChat(client, data) {
        if (!client.player) return;
        
        const { message, type } = data;
        
        // Limita tamanho da mensagem
        if (message.length > GameConstants.MAX_CHAT_LENGTH) {
            return;
        }
        
        // Comandos de teste (apenas GM)
        if (message.startsWith('/')) {
            this.handleCommand(client, message);
            return;
        }
        
        const chatMessage = {
            playerId: client.player.id,
            playerName: client.player.name,
            message,
            type: type || 'say',
            timestamp: Date.now()
        };
        
        // Broadcast para jogadores próximos (chat de proximidade)
        const playersInRange = this.gameWorld.getPlayersInArea(
            client.player.x,
            client.player.y,
            client.player.z,
            GameConstants.CHAT_PROXIMITY_RANGE
        );
        
        // Envia mensagem para todos os players em range
        playersInRange.forEach(player => {
            // Encontra o client do player
            const playerClient = Array.from(this.gameWorld.wsServer?.clients?.values() || [])
                .find(c => c.player?.id === player.id);
            
            if (playerClient) {
                playerClient.send('chatMessage', chatMessage);
            }
        });
        
        console.log(`[Chat] ${client.player.name}: ${message} (${playersInRange.length} players in range)`);
    }
    
    handleCommand(client, message) {
        const args = message.slice(1).split(' ');
        const command = args[0].toLowerCase();
        
        // Verifica se o player é GM
        if (client.player.vocation !== GameConstants.GM_VOCATION) {
            client.send('chatMessage', {
                playerName: 'System',
                message: 'You do not have permission to use commands.',
                type: 'system',
                timestamp: Date.now()
            });
            console.log(`[ChatHandler] ${client.player.name} tried to use command without GM permission`);
            return;
        }
        
        switch (command) {
            case 'die':
            case 'suicide':
                // Comando de teste para matar o player
                console.log(`[ChatHandler] GM ${client.player.name} used /die command`);
                client.player.takeDamage(client.player.hp);
                client.send('chatMessage', {
                    playerName: 'System',
                    message: 'You committed suicide.',
                    type: 'system',
                    timestamp: Date.now()
                });
                break;
            
            case 'heal':
                // Comando de teste para curar o player
                client.player.hp = client.player.maxHp;
                console.log(`[ChatHandler] GM ${client.player.name} healed to full HP`);
                client.send('chatMessage', {
                    playerName: 'System',
                    message: 'You have been healed to full HP.',
                    type: 'system',
                    timestamp: Date.now()
                });
                break;
            
            case 'damage':
                // Comando para tomar dano específico: /damage 50
                const damage = parseInt(args[1]) || 10;
                client.player.takeDamage(damage);
                console.log(`[ChatHandler] GM ${client.player.name} took ${damage} damage`);
                client.send('chatMessage', {
                    playerName: 'System',
                    message: `You took ${damage} damage.`,
                    type: 'system',
                    timestamp: Date.now()
                });
                break;
            
            default:
                client.send('chatMessage', {
                    playerName: 'System',
                    message: `Unknown command: /${command}`,
                    type: 'system',
                    timestamp: Date.now()
                });
                console.log(`[ChatHandler] Unknown command: ${command}`);
        }
    }
}
