import { ServerEvents } from '../../shared/protocol/actions.js';
import { WildPokemonServerEvents } from '../../shared/protocol/WildPokemonProtocol.js';
import { PlayerRepository } from '../persistence/PlayerRepository.js';
import { Logger } from '../utils/Logger.js';

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
            
            console.log(`[AuthHandler] Login request for player ID: ${playerIdToUse}`);
            
            // Busca player do banco de dados
            const playerData = await this.playerRepository.findById(playerIdToUse);
            
            if (!playerData) {
                logger.error(`Player not found: ${playerIdToUse}`);
                client.send(ServerEvents.LOGIN_ERROR, { 
                    message: `Player ID ${playerIdToUse} not found` 
                });
                return;
            }
            
            logger.info(`Player ${playerData.name} logged in (ID: ${playerIdToUse})`);
            
            // Usa dados do banco e aguarda carregamento dos chunks
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
                experience: playerData.experience,
                // Adiciona mais campos conforme necessário
            });
            
            client.setPlayer(player);
            client.authenticate();
            
            // Define referência ao wsServer no player para sistema de morte
            if (this.wsServer) {
                player.wsServer = this.wsServer;
            }
            
            // Carrega pokémons do player do banco de dados usando o ID do banco
            console.log(`[AuthHandler] Loading pokemons for player DB ID: ${playerIdToUse}`);
            await this.gameWorld.loadPlayerPokemons(player, playerIdToUse);
            
            // Carrega balance do player
            const balance = await this.gameWorld.balanceRepository.getBalance(playerIdToUse);
            console.log(`[AuthHandler] Player ${player.name} balance: ${balance} gold`);
            
            // Define o goldCoin no player
            player.goldCoin = balance;
            
            // Envia resposta
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
            
        } catch (error) {
            logger.error('Login error:', error);
            client.send(ServerEvents.LOGIN_ERROR, { 
                message: 'Internal server error' 
            });
        }
    }
}
