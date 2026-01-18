import { ClientEvents, ServerEvents } from '../../shared/protocol/actions.js';
import { scanDefeatedMonsters } from '../handlers/scanHandler.js';
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

        // Handler para scan de Pokémon derrotados
        this.handlers.set(ClientEvents.SCAN, async (client, data) => {
            const playerId = client.player?.dbId || client.player?.id;
            if (!playerId) {
                client.send(ServerEvents.SCAN_RESULT, { success: false, reason: 'not_authenticated' });
                return;
            }
            // ScannerType pode vir do client futuramente (ex: BASIC, ADVANCED)
            const scannerType = (data && data.scannerType) || 'BASIC';
            const result = await scanDefeatedMonsters(playerId, this.gameWorld.inventoryRepository, scannerType);
            client.send(ServerEvents.SCAN_RESULT, result);
        });

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
            if (!data || !data.playerId || !data.skillName || !data.tile) {
                console.log('[use_skill] Dados inválidos recebidos:', data);
                return;
            }
            // Busca targetArea no SkillDatabase
            let targetArea = '';
            let damage = 0;
            try {
                if (SkillDatabase[data.skillName]) {
                    if (SkillDatabase[data.skillName].targetArea) {
                        targetArea = SkillDatabase[data.skillName].targetArea;
                    }
                    if (typeof SkillDatabase[data.skillName].power === 'number') {
                        damage = SkillDatabase[data.skillName].power;
                    }
                }
            } catch (e) {
                console.warn('[use_skill] Erro ao buscar targetArea/power:', e);
            }
            // Aplica dano nos monstros selvagens reais do wildPokemonManager
            let affectedMonsters = [];
            try {
                const wildPokemonsMap = this.gameWorld.wildPokemonManager && this.gameWorld.wildPokemonManager.wildPokemons;
                if (!wildPokemonsMap) throw new Error('wildPokemonManager.wildPokemons não encontrado');
                const wildPokemons = Array.from(wildPokemonsMap.values());
                const originTile = data.tile;
                let areaTiles = [originTile];
                if (typeof targetArea === 'string' && targetArea !== '') {
                    if (targetArea === '3x3') {
                        areaTiles = [];
                        for (let dx = -1; dx <= 1; dx++) {
                            for (let dy = -1; dy <= 1; dy++) {
                                areaTiles.push({ x: originTile.x + dx, y: originTile.y + dy, z: originTile.z });
                            }
                        }
                    }
                }
                wildPokemons.forEach(monster => {
                    if (areaTiles.some(tile => tile.x === monster.x && tile.y === monster.y && tile.z === monster.z)) {
                        if (typeof monster.hp === 'number') {
                            monster.hp -= damage;
                            if (monster.hp < 0) monster.hp = 0;
                            // Marca como morto se hp zerar
                            if (monster.hp === 0 && !monster.isDead) {
                                monster.isDead = true;
                                monster.deadSince = Date.now();
                            }
                        }
                        affectedMonsters.push({ id: monster.id, hp: monster.hp });
                        // Notifica update para todos os clientes
                        if (this.gameWorld.wildPokemonManager.broadcastUpdate) {
                            this.gameWorld.wildPokemonManager.broadcastUpdate(monster);
                        }
                    }
                });
            } catch (e) {
                console.warn('[use_skill] Erro ao aplicar dano nos wildPokemons:', e);
            }
            // Broadcast da animação
            if (this.wsServer && typeof this.wsServer.broadcast === 'function') {
                if (this.wsServer.clients && typeof this.wsServer.clients.forEach === 'function') {
                    let count = 0;
                    this.wsServer.clients.forEach((clientObj, clientId) => {
                        count++;
                    });
                } else {
                    console.log('[use_skill] wsServer.clients não é um Map ou não existe.');
                }
                this.wsServer.broadcast('skill_animation', {
                    playerId: data.playerId,
                    skillName: data.skillName,
                    tile: data.tile,
                    targetArea: targetArea,
                    affectedMonsters: affectedMonsters
                });
                console.log('[use_skill] Broadcast skill_animation enviado para todos os clientes.');
            } else if (client && typeof client.send === 'function') {
                // Fallback: envia só para o próprio jogador
                console.log(`[use_skill] wsServer.broadcast não disponível, enviando apenas para o próprio jogador.`);
                client.send('skill_animation', {
                    playerId: data.playerId,
                    skillName: data.skillName,
                    tile: data.tile,
                    targetArea: targetArea,
                    affectedMonsters: affectedMonsters
                });
            }
        });

        // Handler para transformação do player em Pokémon
        this.handlers.set('request_transform_pokemon', (client, data) => {
            const playerId = client.player?.id || client.playerId;
            if (!playerId) {
                return;
            }
            const player = this.gameWorld.players.get(playerId);
            if (!player) {
                console.log('[SERVER DEBUG] player não encontrado no gameWorld!');
                return;
            }
            console.log('[SERVER DEBUG] player encontrado:', player.name);
            if (!data.pokemonName) {
                player.pokemonName = null;
                if (data.lastSprite) {
                    player.sprite = data.lastSprite;
                    console.log('[SERVER DEBUG] Sprite anterior restaurada:', data.lastSprite);
                } else {
                    player.sprite = 'default';
                }
                player.skills = [];
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
                if (!pokeData) {
                    console.log('[SERVER DEBUG] Definição do Pokémon não encontrada:', data.pokemonName);
                    return;
                }
                let direction = player.direction || 'down';
                let spriteArr = pokeData[`sprite_${direction}`] || pokeData['sprite_down'];
                // Corrige: envia sprite como string, não array
                player.sprite = Array.isArray(spriteArr) ? String(spriteArr[0]) : String(spriteArr);
                player.skills = (pokeData.skills || []).map(skillName => {
                    const skillObj = SkillDatabase[skillName];
                    if (!skillObj) {
                        console.log('[SERVER DEBUG] Skill não encontrada no SkillDatabase:', skillName);
                        return skillName;
                    }
                    return JSON.stringify(skillObj);
                });
                if (!player.baseMaxHp) player.baseMaxHp = player.maxHp || 100;


                // Ajuste: soma a vida do Pokémon apenas ao maxHp, hp permanece igual
                const pokemonHp = pokeData.maxHp || pokeData.hp || 0;
                player.maxHp = player.baseMaxHp + pokemonHp;
                // Garante que hp não ultrapasse o novo maxHp
                if (player.hp > player.maxHp) player.hp = player.maxHp;

                client.send('player_outfit_update', { playerId: player.id, lookaddons: data.pokemonName });
                const gameState = this.gameWorld.getGameState(player);
                client.send('gameState', gameState);
            } catch (e) {
                console.error('[SERVER DEBUG] Erro ao transformar player em Pokémon:', e);
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
                                // Lógica de mapa removida do servidor
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
                    
              
              
        this.handlers.set('get_game_state', (client, data) => {
            // Busca o player associado ao client
            const player = client.player;
            if (!player) return;

            // Busca o estado do jogo para esse player
            const gameState = this.gameWorld.getGameState(player);

            // Envia o estado do jogo para o client
            client.send('gameState', gameState);
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
        // Nunca altera x/y do player, apenas z
        if (data.direction === 'up') {
            player.z += 1;
        } else if (data.direction === 'down') {
            player.z -= 1;
        }
        // Não faz nenhuma checagem de existência de floor/txt, aceita qualquer z
        console.log(`[LOG CHANGEFLOOR] Player ${player.name} mudou para andar z=${player.z}`);

        // Garante que chunks do novo andar estão carregados antes de enviar o mapa
        // Lógica de mapa removida do servidor

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
