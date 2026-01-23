import { ServerEvents } from '../../shared/protocol/actions.js';
import { WildPokemonServerEvents } from '../../shared/protocol/WildPokemonProtocol.js';
import { PlayerRepository } from '../persistence/PlayerRepository.js';
import { Logger } from '../utils/Logger.js';
import { GameConstants } from '../../shared/constants/GameConstants.js';

const logger = new Logger('AuthHandler');

export class AuthHandler {
    constructor(gameWorld, wsServer = null) {
        this.gameWorld = gameWorld;
        this.wsServer = wsServer;
        this.playerRepository = new PlayerRepository(gameWorld.database);
    }
    
    async handleLogin(client, data) {
        const { username, password, playerId } = data;
        try {
            // Usa o playerId enviado pelo cliente ou padrão 1
            const playerIdToUse = playerId || 1;
            const accountId = 1;

            // LOG EXTRA: Mostra o playerId recebido
            console.log('[AuthHandler][DEBUG] playerId recebido do cliente:', playerId, '| Usado:', playerIdToUse);

            // Busca player do banco de dados
            const playerData = await this.playerRepository.findById(playerIdToUse);

            // LOG EXTRA: Mostra o nome do personagem retornado
            console.log('[AuthHandler][DEBUG] playerData retornado:', playerData ? playerData.name : 'NULO');

            // LOG do valor de experiência
            console.log('[AuthHandler][DEBUG] experience do banco:', playerData ? playerData.experience : 'NULO');

            console.log('[AuthHandler] Raw playerData from DB:', JSON.stringify({
                name: playerData?.name,
                lookaddons: playerData?.lookaddons,
                direction: playerData?.direction
            }));
            
            if (!playerData) {
                logger.error(`Player not found: ${playerIdToUse}`);
                client.send(ServerEvents.LOGIN_ERROR, { 
                    message: `Player ID ${playerIdToUse} not found` 
                });
                return;
            }
            
            logger.info(`Player ${playerData.name} logged in (ID: ${playerIdToUse})`);
            
            // Converte direction de número para string
            const directionMap = { 0: 'up', 1: 'right', 2: 'down', 3: 'left' };
            const directionValue = playerData.direction || 2;
            const directionString = directionMap[directionValue] || 'down';
            
            console.log(`[AuthHandler] Player ${playerData.name} - lookaddons: ${playerData.lookaddons}, direction: ${directionValue} -> ${directionString}`);
            
            // Usa dados do banco e aguarda carregamento dos chunks
            // console.log('[DEBUG][SERVER] playerData recebido do banco:', playerData);
            const player = await this.gameWorld.addPlayer({
                id: client.id,
                dbId: playerIdToUse, // ID do banco de dados
                name: playerData.name,
                vocation: playerData.vocation || 0,
                x: playerData.pos_x || playerData.posx,
                y: playerData.pos_y || playerData.posy,
                z: playerData.pos_z || playerData.posz,
                hp: playerData.hp || playerData.health,
                maxHp: playerData.max_hp || playerData.healthmax,
                mp: playerData.mp || playerData.mana,
                maxMp: playerData.max_mp || playerData.manamax,
                level: playerData.level,
                exp: playerData.experience, // <-- Corrige passagem de exp
                sprite: playerData.lookaddons || 'default',
                direction: directionString,
                // Adiciona mais campos conforme necessário
            });

                // Calcula HP dinâmico baseado no level do player
                if (typeof player.level === 'number' && !isNaN(player.level)) {
                    player.maxHp = GameConstants.PLAYER_HP_INITIAL + GameConstants.PLAYER_HP_INCREASE_PER_LEVEL * player.level;
                    player.hp = player.maxHp;
                }
            
            client.setPlayer(player);
            client.authenticate();
            
            // Define referência ao wsServer no player para sistema de morte
            if (this.wsServer) {
                player.wsServer = this.wsServer;
            }
            
            // Carrega pokémons do player do banco de dados usando o ID do banco
            await this.gameWorld.loadPlayerPokemons(player, playerIdToUse);
            
            // Carrega balance do player
            const balance = await this.gameWorld.balanceRepository.getBalance(playerIdToUse);
            
            // Define o goldCoin no player
            player.goldCoin = balance;
            
            console.log('[AuthHandler] Player object before serialize - sprite:', player.sprite, 'direction:', player.direction);
            
            // Envia resposta
            // console.log('[DEBUG][SERVER] player.serialize() enviado para o client:', player.serialize());
            client.send(ServerEvents.LOGIN_SUCCESS, {
                playerId: player.id,
                player: player.serialize()
            });
            
            // Envia balance atualizado
            client.send('balance_update', {
                balance: balance
            });
            
            // Envia estado inicial do jogo
            const gameState = this.gameWorld.getGameState(player);
            client.send(ServerEvents.GAME_STATE, gameState);
            
            // Envia lista de Pokémon selvagens
            const wildPokemons = this.gameWorld.wildPokemonManager.getAllPokemons();
            client.send(WildPokemonServerEvents.WILD_POKEMON_LIST, {
                wildPokemons
            });
            
            logger.info(`Game state sent to ${player.name} at (${player.x}, ${player.y}, ${player.z}) with ${player.pokemons.length} pokemons`);
            logger.info(`Sent ${wildPokemons.length} wild Pokémon to ${player.name}`);

            // Broadcast para todos os clientes: lista de jogadores
            if (this.wsServer) {
                const allPlayers = Array.from(this.gameWorld.players.values()).map(p => p.serialize());
                this.wsServer.broadcast('players_update', JSON.stringify(allPlayers));
            }
            
        } catch (error) {
            logger.error('Login error:', error);
            client.send(ServerEvents.LOGIN_ERROR, { 
                message: 'Internal server error' 
            });
        }
    }
}
