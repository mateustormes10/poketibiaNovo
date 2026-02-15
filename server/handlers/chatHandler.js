import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { ServerEvents } from '../../shared/protocol/actions.js';
import { GameConstants } from '../../shared/constants/GameConstants.js';
import { GMCommandHandler } from './gmCommandHandler.js';
import { Logger } from '../utils/Logger.js';
import { I18n } from '../localization/i18n.js';

const logger = new Logger('ChatHandler');

export class ChatHandler {
    constructor(gameWorld, wsServer) {
        this.gameWorld = gameWorld;
        this.wsServer = wsServer;
        this.gmCommandHandler = new GMCommandHandler(gameWorld, wsServer);

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const badwordsPath = path.resolve(__dirname, '../config/badwords.json');

        try {
            this.badwords = JSON.parse(fs.readFileSync(badwordsPath, 'utf8'));
        } catch (e) {
            this.badwords = [];
			logger.warn('Não foi possível carregar badwords.json');
        }
    }
    
    handleChat(client, data) {
        if (!client.player) return;

        const { message, type } = data;

        // Limita tamanho da mensagem
        if (message.length > GameConstants.MAX_CHAT_LENGTH) {
            return;
        }

        // Comandos GM (intercepta mensagens que começam com /)
        if (message.startsWith('/')) {
            this.gmCommandHandler.handleCommand(client, message);
            return;
        }

        // Quest prompts (estilo Tibia yes/no): intercepta antes do broadcast
        try {
            const questManager = this.gameWorld?.questManager;
            if (questManager?.handleChatResponse) {
                const res = questManager.handleChatResponse(client, message);
                if (res?.handled) {
                    return;
                }
            }
        } catch (e) {
            logger.warn('[ChatHandler] QuestManager handleChatResponse falhou:', e?.message || e);
        }

        // Validação de palavras proibidas
        const msgLower = message.toLowerCase();
        if (this.badwords.some(bad => msgLower.includes(bad))) {
            client.send('chatMessage', {
                playerId: 0,
                playerName: I18n.t(client?.lang, 'system.name'),
                message: I18n.t(client?.lang, 'moderation.blocked_language'),
                type: 'system',
                timestamp: Date.now()
            });
            return;
        }

        const chatMessage = {
            playerId: client.player.id,
            playerName: client.player.name,
            message,
            type: type || 'say',
            timestamp: Date.now()
        };

        // Broadcast global: envia para todos os jogadores online
        for (const playerClient of this.gameWorld.wsServer?.clients?.values() || []) {
            if (playerClient.player) {
                playerClient.send('chatMessage', chatMessage);
            }
        }

		logger.debug(`[Chat] ${client.player.name}: ${message} (broadcast global)`);
    }
    
    handleCommand(client, message) {
        const args = message.slice(1).split(' ');
        const command = args[0].toLowerCase();
        
        // Verifica se o player é GM
        if (client.player.vocation !== GameConstants.GM_VOCATION) {
            client.send('chatMessage', {
                playerName: I18n.t(client?.lang, 'system.name'),
                message: I18n.t(client?.lang, 'chat.no_permission_commands'),
                type: 'system',
                timestamp: Date.now()
            });
			logger.debug(`${client.player.name} tried to use command without GM permission`);
            return;
        }
        
        switch (command) {
            case 'die':
            case 'suicide':
                // Comando de teste para matar o player
				logger.debug(`GM ${client.player.name} used /die command`);
                client.player.takeDamage(client.player.hp);
                client.send('chatMessage', {
                    playerName: I18n.t(client?.lang, 'system.name'),
                    message: I18n.t(client?.lang, 'chat.suicide'),
                    type: 'system',
                    timestamp: Date.now()
                });
                break;
            
            case 'heal':
                // Comando de teste para curar o player
                client.player.hp = client.player.maxHp;
				logger.debug(`GM ${client.player.name} healed to full HP`);
                client.send('chatMessage', {
                    playerName: I18n.t(client?.lang, 'system.name'),
                    message: I18n.t(client?.lang, 'chat.healed_full'),
                    type: 'system',
                    timestamp: Date.now()
                });
                break;
            
            case 'damage':
                // Comando para tomar dano específico: /damage 50
                const damage = parseInt(args[1]) || 10;
                client.player.takeDamage(damage);
				logger.debug(`GM ${client.player.name} took ${damage} damage`);
                client.send('chatMessage', {
                    playerName: I18n.t(client?.lang, 'system.name'),
                    message: I18n.t(client?.lang, 'chat.took_damage', { damage }),
                    type: 'system',
                    timestamp: Date.now()
                });
                break;
            
            case 'add':
                // Comando: /add goldcoin(100) player(1)
                this.handleAddCommand(client, message);
                break;
            
            default:
                client.send('chatMessage', {
                    playerName: I18n.t(client?.lang, 'system.name'),
                    message: I18n.t(client?.lang, 'chat.unknown_command', { command }),
                    type: 'system',
                    timestamp: Date.now()
                });
				logger.debug(`Unknown command: ${command}`);
        }
    }
    
    async handleAddCommand(client, message) {
        // Parse: /add goldcoin(100) player(1)
        const goldcoinMatch = message.match(/goldcoin\((\d+)\)/);
        const playerMatch = message.match(/player\((\d+)\)/);
        
        if (!goldcoinMatch || !playerMatch) {
            client.send('chatMessage', {
                playerName: I18n.t(client?.lang, 'system.name'),
                message: I18n.t(client?.lang, 'chat.add.syntax'),
                type: 'system',
                timestamp: Date.now()
            });
            return;
        }
        
        const amount = parseInt(goldcoinMatch[1]);
        const targetPlayerId = parseInt(playerMatch[1]);
        
        try {
            // Adiciona gold ao balance
            const newBalance = await this.gameWorld.balanceRepository.addGold(targetPlayerId, amount);
            
            // Encontra o client do player alvo
            const targetClient = Array.from(this.gameWorld.wsServer?.clients?.values() || [])
                .find(c => c.player?.dbId === targetPlayerId);
            
            if (targetClient) {
                // Atualiza o balance no client
                targetClient.send('balance_update', {
                    balance: newBalance
                });
                
                targetClient.send('chatMessage', {
                    playerName: I18n.t(targetClient?.lang, 'system.name'),
                    message: I18n.t(targetClient?.lang, 'chat.add.receive_gold', { amount, balance: newBalance }),
                    type: 'system',
                    timestamp: Date.now()
                });
            }
            
            // Feedback para o GM
            client.send('chatMessage', {
                playerName: I18n.t(client?.lang, 'system.name'),
                message: I18n.t(client?.lang, 'chat.add.gm_feedback', { amount, playerId: targetPlayerId, balance: newBalance }),
                type: 'system',
                timestamp: Date.now()
            });
            
			logger.debug(`GM ${client.player.name} added ${amount} gold coins to player ID ${targetPlayerId}`);
            
        } catch (error) {
			logger.error('Error adding gold:', error);
            client.send('chatMessage', {
                playerName: I18n.t(client?.lang, 'system.name'),
                message: I18n.t(client?.lang, 'chat.add.error'),
                type: 'system',
                timestamp: Date.now()
            });
        }
    }
}
