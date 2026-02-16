import { ClientEvents, ServerEvents } from '../../shared/protocol/actions.js';
import { registerDefeatedMonster, scanDefeatedMonsters, scanNearbyCorpse } from '../handlers/scanHandler.js';
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
import { Logger } from '../utils/Logger.js';
import { I18n } from '../localization/i18n.js';
import { adjustCooldownSeconds, computeOutgoingSkillDamage, getLuckyDoubleCoinChance } from '../utils/PlayerStats.js';

const logger = new Logger('MessageRouter');

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
			logger.warn('Não foi possível carregar badwords.json');
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
            logger.debug(`[SCAN] request playerId=${playerId} scannerType=${scannerType}`);
            // Novo comportamento: tenta escanear 1 cadáver próximo (10% chance) e esconde o corpo.
            // Se não houver monsterId/adjacente, cai no legado (lista de derrotados) para compatibilidade.
            let result = await scanNearbyCorpse(client.player, this.gameWorld, this.gameWorld.inventoryRepository, data);
            if (result && result.reason === 'nothing_to_scan') {
                result = await scanDefeatedMonsters(playerId, this.gameWorld.inventoryRepository, scannerType);
            }
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

        // AutoAttack: client requests, server chooses target + simulates projectile
        this.handlers.set('request_auto_attack', (client, data) => {
            try {
                this.gameWorld?.autoAttackSystem?.requestAutoAttack(client, data);
            } catch (e) {
                logger.warn('[request_auto_attack] error:', e?.message || e);
            }
        });

        // Handler para uso de skill (animação multiplayer)
        this.handlers.set('use_skill', async (client, data) => {
            // data: { playerId, skillName, tile }
            if (!data || !data.skillName || !data.tile) {
				logger.debug('[use_skill] Dados inválidos recebidos:', data);
                return;
            }
            // Sempre usa o playerId autenticado do socket
            const playerId = client.player?.id || client.playerId;
            if (!playerId) return;
            const player = client.player;
            if (!player) return;

            // Busca targetArea no SkillDatabase
            let targetArea = '';
            let basePower = 0;
            let baseCooldownSeconds = 0;
            try {
                if (SkillDatabase[data.skillName]) {
                    if (SkillDatabase[data.skillName].targetArea) {
                        targetArea = SkillDatabase[data.skillName].targetArea;
                    }
                    if (typeof SkillDatabase[data.skillName].power === 'number') {
                        basePower = SkillDatabase[data.skillName].power;
                    }
                    if (typeof SkillDatabase[data.skillName].cowndown === 'number') {
                        baseCooldownSeconds = SkillDatabase[data.skillName].cowndown;
                    } else if (typeof SkillDatabase[data.skillName].cooldown === 'number') {
                        baseCooldownSeconds = SkillDatabase[data.skillName].cooldown;
                    }
                }
            } catch (e) {
				logger.warn('[use_skill] Erro ao buscar targetArea/power:', e);
            }

            // Cooldown server-authoritative (com redução por atributo do player)
            try {
                if (!player._skillNextAvailableAt) player._skillNextAvailableAt = {};
                const now = Date.now();
                const nextAt = player._skillNextAvailableAt[data.skillName] || 0;
                if (now < nextAt) {
                    const remainingMs = nextAt - now;
                    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 100) / 10);
                    client.send('system_message', { message: `Skill em cooldown (${remainingSeconds}s)`, color: 'yellow' });
                    return;
                }
                const adjustedCd = adjustCooldownSeconds(player, baseCooldownSeconds);
                if (adjustedCd > 0) {
                    player._skillNextAvailableAt[data.skillName] = now + Math.floor(adjustedCd * 1000);
                }
            } catch {}

            // Dano com atributos (damage + crit)
            const dmgRoll = computeOutgoingSkillDamage(player, basePower);
            const damage = dmgRoll.damage;

            // --- Controle de dano e XP por atacante (corrigido: só envia XP para quem finaliza) ---
            if (!this.monsterAttackers) this.monsterAttackers = new Map();
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
                for (const monster of wildPokemons) {
                    if (areaTiles.some(tile => tile.x === monster.x && tile.y === monster.y && tile.z === monster.z)) {
                        if (typeof monster.hp === 'number') {
                            if (!this.monsterAttackers.has(monster.id)) {
                                this.monsterAttackers.set(monster.id, new Map());
                            }
                            const attackers = this.monsterAttackers.get(monster.id);
                            let prev = attackers.get(playerId) || 0;
                            let danoReal = Math.min(damage, monster.hp); // não pode passar do hp atual
                            attackers.set(playerId, prev + danoReal);
                            monster.hp -= danoReal;
                            if (monster.hp < 0) monster.hp = 0;
                            // Marca como morto se hp zerar
                            if (monster.hp === 0 && !monster.isDead) {
                                monster.isDead = true;
                                monster.deadSince = Date.now();

                                // Quests: kill objective progress (best-effort)
                                try {
                                    this.gameWorld?.questManager?.onEnemyKilled?.(client.player, monster.name, 1);
                                } catch {}

                                // Registra o monstro derrotado para o scanner (usa a mesma chave do SCAN)
                                const scanPlayerId = client.player?.dbId || client.player?.id;
                                if (scanPlayerId) {
                                    registerDefeatedMonster(scanPlayerId, {
                                        name: monster.name,
                                        level: monster.level || 1
                                    });
                                    logger.debug(`[use_skill] registerDefeatedMonster playerId=${scanPlayerId} monster=${monster.name} lvl=${monster.level || 1} id=${monster.id}`);
                                }

                                // --- Só adiciona XP ao player que finalizou ---
                                const monsterXp = monster.exp || 0;
                                const totalDano = Array.from(attackers.values()).reduce((a, b) => a + b, 0);
                                const danoPlayer = attackers.get(playerId) || 0;
                                let xp = 0;
                                if (totalDano > 0) {
                                    xp = Math.floor((danoPlayer / totalDano) * monsterXp);
                                }
                                // Adiciona XP diretamente ao player

                                if (player && typeof player.gainExpAndCheckLevelUp === 'function') {
                                    player.gainExpAndCheckLevelUp(xp);
							logger.debug(`[use_skill] XP adicionada ao player: playerId=${playerId} xp=${xp} monsterId=${monster.id}`);
                                } else {
							logger.warn(`[use_skill] player.gainExpAndCheckLevelUp não encontrado para playerId=${playerId}`);
                                }

                                // Gold drop (server-side) + Lucky para dobrar
                                try {
                                    const dbId = player?.dbId;
                                    const expVal = Number(monsterXp) || 0;
                                    const lvlVal = Number(monster.level) || 1;
                                    const baseGold = Math.max(1, Math.floor(((expVal > 0 ? expVal : (lvlVal * 10)) / 5)));
                                    const luckyChance = getLuckyDoubleCoinChance(player);
                                    const doubled = Math.random() < luckyChance;
                                    const goldGain = doubled ? baseGold * 2 : baseGold;

                                    if (dbId && this.gameWorld?.balanceRepository?.addGold) {
                                        const newBalance = await this.gameWorld.balanceRepository.addGold(dbId, goldGain);
                                        player.goldCoin = newBalance;
                                    }

                                    // Envia gamestate atualizado para refletir gold/exp/hp imediatamente
                                    if (typeof this.gameWorld.getGameState === 'function') {
                                        const gs = this.gameWorld.getGameState(player);
                                        client.send('gameState', gs);
                                    }

                                    logger.debug(`[use_skill] Gold ganho: playerId=${playerId} gold=${goldGain} doubled=${doubled}`);
                                } catch (e) {
                                    logger.warn('[use_skill] Falha ao adicionar gold:', e?.message || e);
                                }

                                // Limpa registro de atacantes
                                this.monsterAttackers.delete(monster.id);
                            }
                        }
                        affectedMonsters.push({ id: monster.id, hp: monster.hp });
                        if (this.gameWorld.wildPokemonManager.broadcastUpdate) {
                            this.gameWorld.wildPokemonManager.broadcastUpdate(monster);
                        }
                    }
                }
            } catch (e) {
				logger.warn('[use_skill] Erro ao aplicar dano nos wildPokemons:', e);
            }
            // Broadcast da animação
            if (this.wsServer && typeof this.wsServer.broadcast === 'function') {
                this.wsServer.broadcast('skill_animation', {
                    playerId: playerId,
                    skillName: data.skillName,
                    tile: data.tile,
                    targetArea: targetArea,
                    affectedMonsters: affectedMonsters
                });
				logger.debug('[use_skill] Broadcast skill_animation enviado para todos os clientes.');
            } else if (client && typeof client.send === 'function') {
                client.send('skill_animation', {
                    playerId: playerId,
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
				logger.debug('[request_transform_pokemon] player não encontrado no gameWorld');
                return;
            }
			logger.debug('[request_transform_pokemon] player encontrado:', player.name);
            if (!data.pokemonName) {
                player.pokemonName = null;
                if (data.lastSprite) {
                    player.sprite = data.lastSprite;
					logger.debug('[request_transform_pokemon] Sprite anterior restaurada:', data.lastSprite);
                } else {
                    player.sprite = 'default';
                }
                player.skills = [];
                // Corrige: recalcula maxHp do player normal (100 + level*10 + hit_points*10)
                const baseHp = 100;
                const level = Number(player.level) || 1;
                const pontosHp = Number(player.conditions?.hit_points || 0);
                const calculatedMaxHp = baseHp + (level * 10) + (pontosHp * 10);
				logger.debug(`[request_transform_pokemon] Calculando maxHp: player='${player.name}', maxHp=${calculatedMaxHp}`);
                player.maxHp = calculatedMaxHp;
                player.hp = Math.min(player.hp, player.maxHp);
				logger.debug(`[request_transform_pokemon] Após cálculo: player='${player.name}', maxHp=${player.maxHp}, hp=${player.hp}`);
                client.send('player_outfit_update', { playerId: player.id, lookaddons: player.sprite });
                const gameState = this.gameWorld.getGameState(player);
                client.send('gameState', gameState);
                return;
            }
            try {
                player.pokemonName = data.pokemonName;
                const pokeData = PokemonEntities[data.pokemonName];
                if (!pokeData) {
					logger.warn('[request_transform_pokemon] Definição do Pokémon não encontrada:', data.pokemonName);
                    return;
                }
                let direction = player.direction || 'down';
                let spriteArr = pokeData[`sprite_${direction}`] || pokeData['sprite_down'];
                // Corrige: envia sprite como string, não array
                player.sprite = Array.isArray(spriteArr) ? String(spriteArr[0]) : String(spriteArr);
                player.skills = (pokeData.skills || []).map(skillName => {
                    const skillObj = SkillDatabase[skillName];
                    if (!skillObj) {
						logger.warn('[request_transform_pokemon] Skill não encontrada no SkillDatabase:', skillName);
                        return skillName;
                    }
                    return JSON.stringify(skillObj);
                });
                if (!player.baseMaxHp) player.baseMaxHp = player.maxHp || 100;


                // Ajuste: soma a vida do Pokémon apenas ao maxHp, hp permanece igual
                const pokemonHp = pokeData.maxHp || pokeData.hp || 0;
                const calculatedPokeMaxHp = player.baseMaxHp + pokemonHp;
                player.maxHp = calculatedPokeMaxHp;
                // Garante que hp não ultrapasse o novo maxHp
                if (player.hp > player.maxHp) player.hp = player.maxHp;

                client.send('player_outfit_update', { playerId: player.id, lookaddons: data.pokemonName });
                const gameState = this.gameWorld.getGameState(player);
                client.send('gameState', gameState);
            } catch (e) {
				logger.error('[request_transform_pokemon] Erro ao transformar player em Pokémon:', e);
            }
        });

                            // Handler for GM/ADM manual z-level change
                            this.handlers.set('gm_change_z', (client, data) => {
                                const playerId = client.player?.id || client.playerId;
                                if (!playerId) {
								logger.warn('[GM_CHANGE_Z] client has no player or playerId');
                                    return;
                                }
                                const player = this.gameWorld.players.get(playerId);
                                if (!player) {
								logger.warn('[GM_CHANGE_Z] player not found');
                                    return;
                                }
                                if (player.vocation !== 4) {
                                    client.send('system_message', { message: I18n.t(client?.lang, 'gm.only_gm_change_floor'), color: 'red' });
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
                                client.send('system_message', { message: I18n.t(client?.lang, 'gm.floor_changed', { z: player.z }), color: 'yellow' });
								logger.debug(`[GM_CHANGE_Z] Player ${player.name} mudou para z=${player.z}`);
                            });
                    // Handler para consulta de vocation do player
                this.handlers.set('get_player_vocation', (client, data) => {
                    let vocation = 0;
                    if (client.player && typeof client.player.vocation !== 'undefined') {
                        vocation = client.player.vocation;
                    }
                    client.send('player_vocation', { vocation });
                });

                // Language / Locale: permite o client (Unity) trocar idioma em runtime.
                // Aceita payload: { lang: 'pt' } | { language: 'pt' } | { locale: 'pt-BR' } | 'pt'
                // Cada conexão tem seu próprio client.lang, então cada player recebe mensagens no seu idioma.
                const setClientLanguage = (client, data) => {
                    const requested =
                        (data && typeof data === 'object')
                            ? (data.lang ?? data.language ?? data.locale)
                            : data;
                    const normalized = I18n.normalizeLang(requested);
                    client.lang = normalized;
                    if (client.player) client.player.lang = normalized;
                };

                // Aliases para facilitar integração com clients diferentes
                this.handlers.set('set_language', setClientLanguage);
                this.handlers.set('set_lang', setClientLanguage);
                this.handlers.set('change_language', setClientLanguage);
                this.handlers.set('language_change', setClientLanguage);
                    
              
              
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
        // Handler para adicionar ponto em atributo do player
        this.handlers.set('add_points_player', async (client, data) => {
            // data: { atributo: 'hit_points' }
            const playerId = client.player?.id || client.playerId;
            if (!playerId) return;
            const player = this.gameWorld.players.get(playerId);
            if (!player) return;
            // Lista de atributos válidos
            const validAttrs = [
                'hit_points', 'velocity', 'damage', 'defense', 'crit_chance',
                'crit_damage', 'dodge', 'coundown', 'scan_efficiency', 'lucky'
            ];
            const attr = data?.atributo;
            if (!validAttrs.includes(attr)) {
                client.send('system_message', { message: I18n.t(client?.lang, 'player.attr_invalid', { attr }) });
                return;
            }
            // Atualiza o campo conditions (JSON)
            if (!player.conditions) player.conditions = {};
            if (typeof player.conditions === 'string') {
                try { player.conditions = JSON.parse(player.conditions); } catch {}
            }
            if (!player.conditions[attr]) player.conditions[attr] = 0;
            player.conditions[attr] = Number(player.conditions[attr]) + 1;
            // Atualiza points: subtrai 1
            if (!player.conditions.points) player.conditions.points = 0;
            player.conditions.points = Math.max(0, Number(player.conditions.points) - 1);

            // Se for hit_points, recalcula maxHp do player (100 + level*10 + hit_points*10)
            if (attr === 'hit_points') {
                const baseHp = 100;
                const level = Number(player.level) || 1;
                const pontosHp = Number(player.conditions.hit_points || 0);
                player.maxHp = baseHp + (level * 10) + (pontosHp * 10);
                player.hp = player.maxHp;
            }

            // Atualiza no banco se necessário
            if (this.gameWorld.playerRepository && typeof this.gameWorld.playerRepository.updateConditions === 'function') {
                await this.gameWorld.playerRepository.updateConditions(playerId, player.conditions);
            }
            // Envia novo estado do jogo para o client
            const gameState = this.gameWorld.getGameState(player);
            client.send('gameState', gameState);
            client.send('system_message', { message: I18n.t(client?.lang, 'player.add_point_success', { attr }) });
        });
        
        // Wild Pokémon handlers
        const wildPokemonHandlers = setupWildPokemonHandler(this.gameWorld);
        Object.keys(wildPokemonHandlers).forEach(eventType => {
            this.handlers.set(eventType, wildPokemonHandlers[eventType]);
        });

        // Houses (Modelo A)
        this.handlers.set('house_get_info', async (client, data) => {
            const houseId = Number(data?.houseId ?? data?.house_id);
            if (!houseId) {
                client.send('house_info', { success: false, reason: 'invalid_house_id' });
                return;
            }
            const info = await this.gameWorld.houseService?.getHouseInfo?.(houseId);
            if (!info) {
                client.send('house_info', { success: false, reason: 'house_not_found' });
                return;
            }
            client.send('house_info', { success: true, ...info });
        });

        this.handlers.set('house_bid', async (client, data) => {
            const houseId = Number(data?.houseId ?? data?.house_id);
            const amount = Number(data?.amount ?? data?.bid);
            if (!houseId || !Number.isFinite(amount)) {
                client.send('house_bid_result', { success: false, reason: 'invalid_request' });
                return;
            }

            const result = await this.gameWorld.houseService?.placeBid?.({ client, houseId, amount });
            if (!result) {
                client.send('house_bid_result', { success: false, reason: 'house_system_unavailable' });
                return;
            }
            client.send('house_bid_result', result);
        });

        // House items (inventário-based)
        this.handlers.set('house_get_items', async (client) => {
            try {
                const p = client?.player;
                logger.info(`[HOUSE_GET_ITEMS] player=${p?.name ?? p?.id ?? 'unknown'} pos=(${p?.x},${p?.y},${p?.z})`);
                const result = await this.gameWorld.houseService?.getCurrentHouseItems?.({ client });
                if (!result) {
                    client.send('house_items', { success: false, reason: 'house_system_unavailable' });
                    return;
                }
                logger.info(`[HOUSE_GET_ITEMS_RESULT] success=${Boolean(result?.success)} reason=${result?.reason ?? ''} house_id=${result?.house_id ?? ''}`);
                client.send('house_items', result);
            } catch (e) {
                logger.error(`[HOUSE_GET_ITEMS_ERROR] ${e?.message ?? e}`);
                client.send('house_items', { success: false, reason: 'internal_error' });
            }
        });

        this.handlers.set('house_item_place', async (client, data) => {
            try {
                const p = client?.player;
                const templateId = data?.item_id ?? data?.itemId;
                logger.info(`[HOUSE_ITEM_PLACE] player=${p?.name ?? p?.id ?? 'unknown'} pos=(${p?.x},${p?.y},${p?.z}) item_id=${templateId}`);
                const result = await this.gameWorld.houseService?.placeHouseItemFromInventory?.({
                    client,
                    item_id: data?.item_id ?? data?.itemId
                });
                if (!result) {
                    client.send('house_item_place_result', { success: false, reason: 'house_system_unavailable' });
                    return;
                }
                logger.info(`[HOUSE_ITEM_PLACE_RESULT] success=${Boolean(result?.success)} reason=${result?.reason ?? ''}`);
                client.send('house_item_place_result', result);
            } catch (e) {
                logger.error(`[HOUSE_ITEM_PLACE_ERROR] ${e?.message ?? e}`);
                client.send('house_item_place_result', { success: false, reason: 'internal_error' });
            }
        });

        // Move não existe no novo fluxo (sem modo construção)
        this.handlers.set('house_item_move', async (client) => {
            client.send('house_item_move_result', { success: false, reason: 'unsupported' });
        });

        this.handlers.set('house_item_remove', async (client, data) => {
            try {
                const p = client?.player;
                const instanceId = data?.item_instance_id ?? data?.itemInstanceId ?? data?.id;
                logger.info(`[HOUSE_ITEM_REMOVE] player=${p?.name ?? p?.id ?? 'unknown'} pos=(${p?.x},${p?.y},${p?.z}) item_instance_id=${instanceId}`);
                const result = await this.gameWorld.houseService?.removeHouseItemToInventory?.({
                    client,
                    item_instance_id: data?.item_instance_id ?? data?.itemInstanceId ?? data?.id
                });
                if (!result) {
                    client.send('house_item_remove_result', { success: false, reason: 'house_system_unavailable' });
                    return;
                }
                logger.info(`[HOUSE_ITEM_REMOVE_RESULT] success=${Boolean(result?.success)} reason=${result?.reason ?? ''}`);
                client.send('house_item_remove_result', result);
            } catch (e) {
                logger.error(`[HOUSE_ITEM_REMOVE_ERROR] ${e?.message ?? e}`);
                client.send('house_item_remove_result', { success: false, reason: 'internal_error' });
            }
        });


        // Guilds (estilo Tibia) - server-authoritative
        const sendToDbPlayerId = (dbPlayerId, type, data) => {
            const id = Number(dbPlayerId);
            if (!id || !this.wsServer) return;
            for (const c of this.wsServer.clients.values()) {
                const pid = c?.player?.dbId;
                if (Number(pid) === id) {
                    c.send(type, data);
                }
            }
        };

        const refreshGuildForPlayer = async (dbPlayerId) => {
            const id = Number(dbPlayerId);
            if (!id) return;
            // Envia um painel atualizado caso o player esteja em guild.
            try {
                const pg = await this.gameWorld.guildService.guildRepository.getPlayerGuild(id);
                if (!pg) {
                    sendToDbPlayerId(id, 'guild_update', { success: true, my_guild: null });
                    return;
                }
                const panel = await this.gameWorld.guildService.getGuildPanel(pg.guild_id);
                sendToDbPlayerId(id, 'guild_update', {
                    success: true,
                    my_guild: {
                        guild_id: Number(pg.guild_id),
                        guild_name: String(pg.guild_name ?? ''),
                        ownerid: Number(pg.ownerid),
                        motd: String(pg.motd ?? ''),
                        my_rank: {
                            rank_id: Number(pg.rank_id),
                            rank_name: String(pg.rank_name ?? ''),
                            rank_level: Number(pg.rank_level)
                        },
                        panel
                    }
                });
            } catch (e) {
                logger.warn(`[GUILD] refreshGuildForPlayer error: ${e?.message ?? e}`);
            }
        };

        const registerGuildHandler = (type, fn) => {
            this.handlers.set(type, fn);
            this.handlers.set(String(type).toLowerCase(), fn);
        };

        registerGuildHandler('OPEN_GUILD_MENU', async (client) => {
            const result = await this.gameWorld.guildService?.openMenu?.({ client });
            client.send('guild_menu', result ?? { success: false, reason: 'guild_system_unavailable' });
        });

        registerGuildHandler('CREATE_GUILD', async (client, data) => {
            const result = await this.gameWorld.guildService?.createGuild?.({
                client,
                name: data?.name,
                motd: data?.motd
            });

            if (!result) {
                client.send('guild_create_result', { success: false, reason: 'guild_system_unavailable' });
                return;
            }
            client.send('guild_create_result', result);
            // Após criar, atualiza menu completo.
            if (result?.success) {
                client.send('guild_menu', result.menu);
            }
        });

        registerGuildHandler('APPLY_GUILD', async (client, data) => {
            const result = await this.gameWorld.guildService?.applyToGuild?.({
                client,
                guildId: data?.guild_id ?? data?.guildId ?? data?.id
            });
            client.send('guild_apply_result', result ?? { success: false, reason: 'guild_system_unavailable' });
        });

        registerGuildHandler('GET_GUILD_INVITES', async (client) => {
            const result = await this.gameWorld.guildService?.listInvites?.({ client });
            client.send('guild_invites', result ?? { success: false, reason: 'guild_system_unavailable' });
        });

        registerGuildHandler('APPROVE_GUILD_INVITE', async (client, data) => {
            const result = await this.gameWorld.guildService?.approveInvite?.({
                client,
                playerId: data?.player_id ?? data?.playerId
            });
            client.send('guild_approve_result', result ?? { success: false, reason: 'guild_system_unavailable' });

            if (result?.success) {
                // Atualiza líder e player aprovado.
                const leaderDbId = client?.player?.dbId;
                if (leaderDbId) await refreshGuildForPlayer(leaderDbId);
                await refreshGuildForPlayer(result.player_id);

                // Atualiza lista de invites do líder.
                const inv = await this.gameWorld.guildService.listInvites({ client });
                client.send('guild_invites', inv);
            }
        });

        registerGuildHandler('REJECT_GUILD_INVITE', async (client, data) => {
            const result = await this.gameWorld.guildService?.rejectInvite?.({
                client,
                playerId: data?.player_id ?? data?.playerId
            });
            client.send('guild_reject_result', result ?? { success: false, reason: 'guild_system_unavailable' });

            if (result?.success) {
                const inv = await this.gameWorld.guildService.listInvites({ client });
                client.send('guild_invites', inv);
            }
        });

        registerGuildHandler('UPDATE_GUILD_MOTD', async (client, data) => {
            const result = await this.gameWorld.guildService?.updateMotd?.({
                client,
                motd: data?.motd
            });
            client.send('guild_motd_result', result ?? { success: false, reason: 'guild_system_unavailable' });

            if (result?.success) {
                // Atualiza todos os membros online (best-effort)
                try {
                    const panel = await this.gameWorld.guildService.getGuildPanel(result.guild_id);
                    const members = panel?.members || [];
                    for (const m of members) {
                        await refreshGuildForPlayer(m.player_id);
                    }
                } catch {}
            }
        });

        registerGuildHandler('GET_GUILD_PANEL', async (client) => {
            // Não cria um type novo: apenas dispara o guild_update atualizado via helper.
            const leaderDbId = client?.player?.dbId;
            if (leaderDbId) await refreshGuildForPlayer(leaderDbId);
        });

        registerGuildHandler('PROMOTE_GUILD_MEMBER', async (client, data) => {
            const result = await this.gameWorld.guildService?.promoteMember?.({
                client,
                playerId: data?.player_id ?? data?.playerId
            });
            client.send('guild_member_promote_result', result ?? { success: false, reason: 'guild_system_unavailable' });

            if (result?.success) {
                const leaderDbId = client?.player?.dbId;
                if (leaderDbId) await refreshGuildForPlayer(leaderDbId);
                if (result.player_id) await refreshGuildForPlayer(result.player_id);
            }
        });

        registerGuildHandler('EXPULSE_GUILD_MEMBER', async (client, data) => {
            const result = await this.gameWorld.guildService?.expulseMember?.({
                client,
                playerId: data?.player_id ?? data?.playerId
            });
            client.send('guild_member_expulse_result', result ?? { success: false, reason: 'guild_system_unavailable' });

            if (result?.success) {
                const leaderDbId = client?.player?.dbId;
                if (leaderDbId) await refreshGuildForPlayer(leaderDbId);
                if (result.player_id) await refreshGuildForPlayer(result.player_id);
            }
        });

        registerGuildHandler('DELETE_GUILD', async (client) => {
            const result = await this.gameWorld.guildService?.deleteGuild?.({ client });
            client.send('guild_delete_result', result ?? { success: false, reason: 'guild_system_unavailable' });

            if (result?.success) {
                // Atualiza todos os membros que estavam na guild (inclui o líder).
                const ids = Array.isArray(result.member_ids) ? result.member_ids : [];
                for (const pid of ids) {
                    await refreshGuildForPlayer(pid);
                }
            }
        });
        
        // Outfit change handler
        this.handlers.set('change_outfit', handleChangeOutfit);


        // Handler para troca de andar
        this.handlers.set(ClientEvents.CHANGE_FLOOR, this.handleChangeFloor.bind(this));

        // Handler para atualização de mapa
        this.handlers.set('requestMapUpdate', this.handleMapUpdate.bind(this));

        // =====================
        // Guilds
        // =====================
        const guildSvc = this.gameWorld.guildService;
        if (guildSvc)
        {
            const openMenu = async (client) => {
                const res = await guildSvc.openMenu({ client });
                client.send('guild_menu', res);
            };

            this.handlers.set('OPEN_GUILD_MENU', async (client) => {
                await openMenu(client);
            });

            this.handlers.set('CREATE_GUILD', async (client, data) => {
                const res = await guildSvc.createGuild({
                    client,
                    name: data?.name,
                    motd: data?.motd
                });
                client.send('guild_create_result', res);
                if (res?.success)
                    await openMenu(client);
            });

            this.handlers.set('APPLY_GUILD', async (client, data) => {
                const res = await guildSvc.applyToGuild({ client, guildId: data?.guild_id });
                client.send('guild_apply_result', res);
            });

            this.handlers.set('APPROVE_GUILD_INVITE', async (client, data) => {
                const res = await guildSvc.approveInvite({ client, playerId: data?.player_id });
                client.send('guild_approve_result', res);
                // Atualiza a lista de invites do leader
                const inv = await guildSvc.listInvites({ client });
                client.send('guild_invites', inv);
            });

            this.handlers.set('REJECT_GUILD_INVITE', async (client, data) => {
                const res = await guildSvc.rejectInvite({ client, playerId: data?.player_id });
                client.send('guild_reject_result', res);
                const inv = await guildSvc.listInvites({ client });
                client.send('guild_invites', inv);
            });

            this.handlers.set('UPDATE_GUILD_MOTD', async (client, data) => {
                const res = await guildSvc.updateMotd({ client, motd: data?.motd });
                client.send('guild_motd_result', res);
                if (res?.success)
                    await openMenu(client);
            });

            this.handlers.set('GET_GUILD_PANEL', async (client) => {
                const res = await guildSvc.openMenu({ client });
                client.send('guild_update', { success: res?.success ?? false, reason: res?.reason, my_guild: res?.my_guild ?? null });
                // Também sincroniza invites (apenas leader recebe dados úteis)
                client.send('guild_invites', { success: res?.success ?? false, reason: res?.reason, guild_id: res?.my_guild?.guild_id ?? 0, invites: res?.invites ?? [] });
            });

            this.handlers.set('PROMOTE_GUILD_MEMBER', async (client, data) => {
                const res = await guildSvc.promoteMember({ client, playerId: data?.player_id });
                client.send('guild_member_promote_result', res);
                if (res?.success)
                    await openMenu(client);
            });

            this.handlers.set('EXPULSE_GUILD_MEMBER', async (client, data) => {
                const res = await guildSvc.expulseMember({ client, playerId: data?.player_id });
                client.send('guild_member_expulse_result', res);
                if (res?.success)
                    await openMenu(client);
            });

            this.handlers.set('DELETE_GUILD', async (client) => {
                const res = await guildSvc.deleteGuild({ client });
                client.send('guild_delete_result', res);
                if (res?.success)
                    await openMenu(client);
            });
        }

        const turnHandler = new TurnHandler(this.gameWorld);
        this.handlers.set(ClientEvents.TURN, turnHandler.handleTurn.bind(turnHandler));
    }    

    handleChangeFloor(client, data) {
        // Verifica player
        const playerId = client.player?.id || client.playerId;
        if (!playerId) {
			logger.warn('changeFloor: client has no player or playerId');
            return;
        }
        const player = this.gameWorld.players.get(playerId);
        if (!player) {
			logger.warn('changeFloor: player not found');
            return;
        }
        // Nunca altera x/y do player, apenas z
        if (data.direction === 'up') {
            player.z += 1;
        } else if (data.direction === 'down') {
            player.z -= 1;
        }
        // Não faz nenhuma checagem de existência de floor/txt, aceita qualquer z
		logger.debug(`[changeFloor] Player ${player.name} mudou para andar z=${player.z}`);

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
			logger.warn('Map update requested but client has no player or playerId');
            return;
        }
        
        const player = this.gameWorld.players.get(playerId);
        if (!player) {
			logger.warn('Map update requested but player not found in gameWorld');
			logger.debug('Looking for player ID:', playerId);
			logger.debug('Available players:', Array.from(this.gameWorld.players.keys()));
            return;
        }
        
        // Obtém estado do jogo com mapa atualizado
        const gameState = this.gameWorld.getGameState(player);
        
        // Envia atualização
        client.send('gameState', gameState);
        
		logger.debug(`Map updated for player ${player.name} at (${data.x}, ${data.y}, ${data.z})`);
    }
    
    route(client, message) {
		logger.debug(`Routing message type: ${message.type}`);

        // Detection: soft rate limit (drops excess spam) to reduce bot/external floods.
        try {
            if (this.gameWorld?.detectionService?.shouldDropMessage?.(client, message?.type)) {
                return;
            }
        } catch {
            // ignore
        }
        
        const handler = this.handlers.get(message.type);
        
        if (handler) {
            try {
                const res = handler(client, message.data);
                if (res && typeof res.then === 'function') {
                    res.catch((err) => {
                        logger.error(`Handler error for type ${message.type}:`, err);
                    });
                }
            } catch (err) {
                logger.error(`Handler throw for type ${message.type}:`, err);
            }
        } else {
			logger.warn(`No handler for message type: ${message.type}`);

            // Detection: unknown message type (possible external tooling/bot)
            try {
                this.gameWorld?.detectionService?.onUnknownMessage?.(client, message?.type);
            } catch {
                // ignore
            }
        }
    }
}
