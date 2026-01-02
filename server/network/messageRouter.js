import { ClientEvents } from '../../shared/protocol/actions.js';
import { PokemonEntities } from '../game/entities/PokemonEntities.js';
import { SkillDatabase } from '../../shared/SkillDatabase.js';
import { InventoryClientEvents } from '../../shared/protocol/InventoryProtocol.js';
import { AuthHandler } from '../handlers/authHandler.js';
import { MovementHandler } from '../handlers/movementHandler.js';
import { CombatHandler } from '../handlers/combatHandler.js';
import { ChatHandler } from '../handlers/chatHandler.js';
import { PortalHandler } from '../handlers/portalHandler.js';
import { NpcHandler } from '../handlers/npcHandler.js';
import { InventoryHandler } from '../handlers/inventoryHandler.js';
import { setupWildPokemonHandler } from '../handlers/wildPokemonHandler.js';
import { InventoryService } from '../services/InventoryService.js';
import { handleChangeOutfit } from '../handlers/outfitHandler.js';
import { TurnHandler } from '../handlers/turnHandler.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export class MessageRouter {
    constructor(gameWorld, wsServer = null) {
        this.gameWorld = gameWorld;
        this.wsServer = wsServer;
        this.handlers = new Map();
        
        this.setupHandlers();
    }
    
    setupHandlers() {
        // Carrega lista de badwords (ES modules)
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        let badwords = [];
        try {
            badwords = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../config/badwords.json'), 'utf8'));
        } catch (e) {
            badwords = [];
            console.warn('[MessageRouter] Não foi possível carregar badwords.json');
        }

            // Handler para balão de fala (speech bubble)
            this.handlers.set('speech_bubble', (client, data) => {
                // data: { playerId, text }
                if (!data || !data.playerId || !data.text) return;
                const msgLower = data.text.toLowerCase();
                if (badwords.some(bad => msgLower.includes(bad))) {
                    if (client && typeof client.send === 'function') {
                        client.send('speech_bubble', {
                            playerId: 0,
                            text: 'Mensagem bloqueada: linguagem inadequada.'
                        });
                    }
                    return;
                }
                if (this.wsServer && typeof this.wsServer.broadcast === 'function') {
                    this.wsServer.broadcast('speech_bubble', {
                        playerId: data.playerId,
                        text: data.text
                    });
                } else if (client && typeof client.send === 'function') {
                    client.send('speech_bubble', {
                        playerId: data.playerId,
                        text: data.text
                    });
                }
            });

        // Handler para uso de skill (animação multiplayer)
        this.handlers.set('use_skill', (client, data) => {
            // data: { playerId, skillName, tile }
            if (!data || !data.playerId || !data.skillName || !data.tile) return;
            // Broadcast para todos os jogadores próximos (ou todos, para simplificar)
            if (this.wsServer && typeof this.wsServer.broadcast === 'function') {
                this.wsServer.broadcast('skill_animation', {
                    playerId: data.playerId,
                    skillName: data.skillName,
                    tile: data.tile
                });
            } else if (client && typeof client.send === 'function') {
                // Fallback: envia só para o próprio jogador
                client.send('skill_animation', {
                    playerId: data.playerId,
                    skillName: data.skillName,
                    tile: data.tile
                });
            }
        });

        // Handler para transformação do player em Pokémon
        this.handlers.set('request_transform_pokemon', (client, data) => {
            const playerId = client.player?.id || client.playerId;
            if (!playerId) return;
            const player = this.gameWorld.players.get(playerId);
            if (!player) return;
            if (!data.pokemonName) {
                // Voltar a ser player normal
                player.pokemonName = null;
                // Usa a sprite anterior enviada pelo cliente, se existir
                if (data.lastSprite) {
                    player.sprite = data.lastSprite;
                } else {
                    player.sprite = 'default';
                }
                player.skills = [];
                // Ao voltar a ser humano, volta para o HP base do player
                player.maxHp = player.baseMaxHp || player.maxHp || 100;
                player.hp = Math.min(player.hp, player.maxHp);
                client.send('player_outfit_update', { playerId: player.id, lookaddons: player.sprite });
                const gameState = this.gameWorld.getGameState(player);
                client.send('gameState', gameState);
                return;
            }
            try {
                player.pokemonName = data.pokemonName;
                const pokeData = PokemonEntities[data.pokemonName];
                if (!pokeData) return;
                let direction = player.direction || 'down';
                let spriteArr = pokeData[`sprite_${direction}`] || pokeData['sprite_down'];
                player.sprite = spriteArr;
                // DEBUG: loga skills do pokeData e resultado do SkillDatabase
                player.skills = (pokeData.skills || []).map(skillName => {
                    const skillObj = SkillDatabase[skillName];
                    if (!skillObj) {
                        console.log('[SERVER DEBUG] Skill não encontrada no SkillDatabase:', skillName);
                        return null;
                    }
                    return {
                        name: skillObj.name,
                        type: skillObj.type,
                        element: skillObj.element,
                        power: skillObj.power,
                        cowndown: skillObj.cowndown,
                        manaCost: skillObj.manaCost,
                        spriteSkillList: skillObj.spriteSkillList,
                        targetArea: skillObj.targetArea
                    };
                }).filter(Boolean);
                // HP: soma vida base do player + vida do Pokémon selecionado
                if (!player.baseMaxHp) player.baseMaxHp = player.maxHp || 100;
                player.maxHp = player.baseMaxHp + (pokeData.maxHp || pokeData.hp || 0);
                player.hp = player.maxHp;
                // Envia atualização de outfit para o próprio player
                client.send('player_outfit_update', { playerId: player.id, lookaddons: spriteArr });
                // Envia novo estado do jogo
                const gameState = this.gameWorld.getGameState(player);
                client.send('gameState', gameState);
            } catch (e) {
                console.error('Erro ao transformar player em Pokémon:', e);
            }
        });

                            // Handler for GM/ADM manual z-level change
                            this.handlers.set('gm_change_z', (client, data) => {
                                const playerId = client.player?.id || client.playerId;
                                if (!playerId) {
                                    console.warn('[GM_CHANGE_Z] client has no player or playerId');
                                    return;
                                }
                                const player = this.gameWorld.players.get(playerId);
                                if (!player) {
                                    console.warn('[GM_CHANGE_Z] player not found');
                                    return;
                                }
                                if (player.vocation !== 4) {
                                    client.send('system_message', { message: 'Apenas GM/ADM pode trocar o andar manualmente.', color: 'red' });
                                    return;
                                }
                                let newZ = player.z;
                                if (data.direction === 'up') newZ = player.z + 1;
                                if (data.direction === 'down') newZ = player.z - 1;
                                // Clamp z to valid range if needed (optional)
                                player.z = newZ;
                                if (this.gameWorld.mapManager && typeof this.gameWorld.mapManager.updatePlayerPosition === 'function') {
                                    this.gameWorld.mapManager.updatePlayerPosition(player.id, player.x, player.y, player.z);
                                }
                                const gameState = this.gameWorld.getGameState(player);
                                client.send('gameState', gameState);
                                client.send('system_message', { message: `Andar alterado para z=${player.z}`, color: 'yellow' });
                                console.log(`[GM_CHANGE_Z] Player ${player.name} mudou para z=${player.z}`);
                            });
                    // Handler para consulta de vocation do player
                this.handlers.set('get_player_vocation', (client, data) => {
                    let vocation = 0;
                    if (client.player && typeof client.player.vocation !== 'undefined') {
                        vocation = client.player.vocation;
                    }
                    client.send('player_vocation', { vocation });
                });
                    
              
                
        const portalHandler = new PortalHandler(this.gameWorld, this.wsServer);
        const authHandler = new AuthHandler(this.gameWorld, this.wsServer);
        const movementHandler = new MovementHandler(this.gameWorld);
        const combatHandler = new CombatHandler(this.gameWorld);
        const chatHandler = new ChatHandler(this.gameWorld, this.wsServer);
        const npcHandler = new NpcHandler(
            this.gameWorld,
            this.gameWorld.balanceRepository,
            this.gameWorld.npcRepository,
            this.gameWorld.inventoryRepository
        );
        
        // Inventory service e handler
        const inventoryService = new InventoryService(
            this.gameWorld.inventoryRepository,
            this.gameWorld.playerRepository,
            this.gameWorld.playerPokemonRepository
        );
        const inventoryHandler = new InventoryHandler(this.gameWorld, inventoryService);
        
        
        this.handlers.set(ClientEvents.PORTAL, portalHandler.handlePortal.bind(portalHandler));
        this.handlers.set(ClientEvents.LOGIN, authHandler.handleLogin.bind(authHandler));
        this.handlers.set(ClientEvents.MOVE, movementHandler.handleMove.bind(movementHandler));
        this.handlers.set(ClientEvents.ATTACK, combatHandler.handleAttack.bind(combatHandler));
        this.handlers.set(ClientEvents.CHAT, chatHandler.handleChat.bind(chatHandler));
        
        // NPC handlers
        this.handlers.set('npc_interact', npcHandler.handleInteract.bind(npcHandler));
        this.handlers.set('npc_buy', npcHandler.handleBuy.bind(npcHandler));
        
        // Inventory handlers
        this.handlers.set(InventoryClientEvents.REQUEST_INVENTORY, inventoryHandler.handleInventoryRequest.bind(inventoryHandler));
        this.handlers.set(InventoryClientEvents.USE_ITEM, inventoryHandler.handleUseItem.bind(inventoryHandler));
        this.handlers.set(InventoryClientEvents.DROP_ITEM, inventoryHandler.handleDropItem.bind(inventoryHandler));
        
        // Wild Pokémon handlers
        const wildPokemonHandlers = setupWildPokemonHandler(this.gameWorld);
        Object.keys(wildPokemonHandlers).forEach(eventType => {
            this.handlers.set(eventType, wildPokemonHandlers[eventType]);
        });
        
        // Outfit change handler
        this.handlers.set('change_outfit', handleChangeOutfit);


        // Handler para troca de andar
        this.handlers.set(ClientEvents.CHANGE_FLOOR, this.handleChangeFloor.bind(this));

        // Handler para atualização de mapa
        this.handlers.set('requestMapUpdate', this.handleMapUpdate.bind(this));

        const turnHandler = new TurnHandler(this.gameWorld);
        this.handlers.set(ClientEvents.TURN, turnHandler.handleTurn.bind(turnHandler));
    }    

    handleChangeFloor(client, data) {
        // Verifica player
        const playerId = client.player?.id || client.playerId;
        if (!playerId) {
            console.warn('[MessageRouter] changeFloor: client has no player or playerId');
            return;
        }
        const player = this.gameWorld.players.get(playerId);
        if (!player) {
            console.warn('[MessageRouter] changeFloor: player not found');
            return;
        }
        // Atualiza posição do player primeiro
        player.x = data.x;
        player.y = data.y;

        // Busca tile atual
        const tile = this.gameWorld.mapManager.getTile(player.x, player.y, player.z);
        let novoZ = player.z;
        if (tile && tile.spriteIds) {
            for (const sprite of tile.spriteIds) {
                if (data.direction === 'up' && typeof sprite === 'string' && sprite.startsWith('UP(')) {
                    const match = sprite.match(/UP\((\d+)\)/);
                    if (match) {
                        novoZ = parseInt(match[1]);
                        break;
                    }
                }
                if (data.direction === 'down' && typeof sprite === 'string' && sprite.startsWith('DOWN(')) {
                    const match = sprite.match(/DOWN\((\d+)\)/);
                    if (match) {
                        novoZ = parseInt(match[1]);
                        break;
                    }
                }
            }
            console.log(`[LOG SPRITES] Player ${player.name} (${player.x},${player.y},${player.z}) sprites:`, tile.spriteIds);
        } else {
            console.log(`[LOG SPRITES] Player ${player.name} (${player.x},${player.y},${player.z}) sem tile ou sprites.`);
        }

        // Atualiza z do player conforme tile
        player.z = novoZ;

        // Garante que chunks do novo andar estão carregados antes de enviar o mapa
        if (this.gameWorld.mapManager && typeof this.gameWorld.mapManager.updatePlayerPosition === 'function') {
            this.gameWorld.mapManager.updatePlayerPosition(player.id, player.x, player.y, player.z);
        }

        // Envia novo estado do jogo
        const gameState = this.gameWorld.getGameState(player);
        // Log detalhado do z do player e do mapa enviado
        // console.log(`[MessageRouter] changeFloor: z do player atualizado para ${player.z}`);
        // if (gameState && gameState.map) {
        //     console.log(`[MessageRouter] Tiles enviados: z=${gameState.map.z}, total=${gameState.map.tiles.length}`);
        //     if (gameState.map.tiles.length > 0) {
        //         console.log('[MessageRouter] Exemplos de tiles:', gameState.map.tiles.slice(0, 3));
        //     }
        // }
        client.send('gameState', gameState);
    }
    
    handleMapUpdate(client, data) {        
        // Tenta usar playerId se player não estiver disponível
        const playerId = client.player?.id || client.playerId;
        
        if (!playerId) {
            console.warn('[MessageRouter] Map update requested but client has no player or playerId');
            return;
        }
        
        const player = this.gameWorld.players.get(playerId);
        if (!player) {
            console.warn('[MessageRouter] Map update requested but player not found in gameWorld');
            console.warn('[MessageRouter] Looking for player ID:', playerId);
            console.warn('[MessageRouter] Available players:', Array.from(this.gameWorld.players.keys()));
            return;
        }
        
        // Obtém estado do jogo com mapa atualizado
        const gameState = this.gameWorld.getGameState(player);
        
        // Envia atualização
        client.send('gameState', gameState);
        
        console.log(`[MessageRouter] Map updated for player ${player.name} at (${data.x}, ${data.y}, ${data.z})`);
    }
    
    route(client, message) {
        console.log(`[MessageRouter] Routing message type: ${message.type}`);
        
        const handler = this.handlers.get(message.type);
        
        if (handler) {
            handler(client, message.data);
        } else {
            console.warn(`[MessageRouter] No handler for message type: ${message.type}`);
        }
    }
}
