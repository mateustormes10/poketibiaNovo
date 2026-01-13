import { MapManager } from './map/MapManager.js';
import { ZoneManager } from './zones/ZoneManager.js';
import { Player } from './entities/Player.js';
import { Npc } from './entities/Npc.js';
import { SpatialGrid } from './systems/SpatialGrid.js';
import { DeltaManager } from './systems/DeltaManager.js';
import { VisionSystem } from './systems/VisionSystem.js';
import { WildPokemonManager } from './systems/WildPokemonManager.js';
import { PlayerActivePokemonRepository } from '../persistence/PlayerActivePokemonRepository.js';
import { PlayerRepository } from '../persistence/PlayerRepository.js';
import { PlayerDeathRepository } from '../persistence/PlayerDeathRepository.js';
import { NpcRepository } from '../persistence/NpcRepository.js';
import { BalanceRepository } from '../persistence/BalanceRepository.js';
import { InventoryRepository } from '../persistence/InventoryRepository.js';
import { GameConstants } from '../../shared/constants/GameConstants.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('GameWorld');

export class GameWorld {
    constructor(database) {
        this.database = database; // Instância do banco de dados
        this.players = new Map();
        this.npcs = new Map();
        this.monsters = new Map();
        this.items = new Map();
        
        this.mapManager = new MapManager();
        this.zoneManager = new ZoneManager();
        this.wildPokemonManager = new WildPokemonManager(this);
        
        // Repositórios
        this.playerActivePokemonRepository = new PlayerActivePokemonRepository(database);
        this.playerRepository = new PlayerRepository(database);
        this.playerDeathRepository = new PlayerDeathRepository(database);
        this.npcRepository = new NpcRepository(database);
        this.balanceRepository = new BalanceRepository(database);
        this.inventoryRepository = new InventoryRepository(database);
        
        // Sistemas de otimização
        this.spatialGrid = new SpatialGrid(GameConstants.SPATIAL_GRID_SIZE);
        this.deltaManager = new DeltaManager();
        this.visionSystem = new VisionSystem(this); // Sistema de visão
        
        this.tick = 0;
        this.wsServer = null; // Será definido após criação do WsServer
    }
    
    setWsServer(wsServer) {
        this.wsServer = wsServer;
        this.server = wsServer; // Alias para compatibilidade
        logger.info('WsServer reference set in GameWorld');
    }
    
    async loadPlayerPokemons(player, dbPlayerId) {
        const playerIdToUse = dbPlayerId || player.dbId || player.id;
        try {
            const pokemonData = await this.playerActivePokemonRepository.findByPlayerId(playerIdToUse);
            player.pokemons = pokemonData.map(p => ({
                id: p.id,
                pokemonId: p.pokemon_id,
                name: p.pokemon_name,
                nickname: p.nickname,
                level: p.level,
                hp: p.hp || p.current_hp,
                maxHp: p.max_hp,
                mana: p.current_mana,
                maxMana: p.max_mana,
                experience: p.experience,
                slot: p.slot,
                sprite_up: p.sprite_up,
                sprite_down: p.sprite_down,
                sprite_left: p.sprite_left,
                sprite_right: p.sprite_right
            }));
            logger.info(`Loaded ${player.pokemons.length} ACTIVE pokemons for player ${player.name}`);
        } catch (error) {
            logger.error(`Error loading ACTIVE pokemons for player ${playerIdToUse}:`, error);
            player.pokemons = [];
        }
    }

        /**
     * Verifica se há um tile de telhado/casa acima do player (z+1)
     * Considera type: 'roof' ou 'house' no tile
     */
    isPlayerUnderRoof(player) {
        return false;
    }
    
    async savePlayer(player) {
        if (!player.dbId) {
            logger.warn(`Cannot save player ${player.name} - no database ID`);
            return;
        }
        await this.playerRepository.update(player.dbId, {
                x: player.x,
                y: player.y,
                z: player.z,
                hp: player.hp,
                mp: player.mp,
                level: player.level,
                exp: player.exp || 0,
                direction: player.toDirectionNumber(),
                sprite: player.sprite
            });
            
            logger.info(`Player ${player.name} saved successfully (pos: ${player.x},${player.y},${player.z}, hp: ${player.hp})`);

    }
    
    async handlePlayerDeath(player, wsServer) {
        if (!player.dbId) {
            logger.warn(`Cannot handle death for player ${player.name} - no database ID`);
            return;
        }
        
        try {
            logger.info(`Player ${player.name} died at level ${player.level}`);
            
            // Registra morte na tabela player_deaths
            await this.playerDeathRepository.create(player.dbId, player.level);
            
            // Define coordenadas do templo (respawn)
            const templeX = GameConstants.TEMPLE_SPAWN.x;
            const templeY = GameConstants.TEMPLE_SPAWN.y;
            const templeZ = GameConstants.TEMPLE_SPAWN.z;
            
            // Teleporta player para o templo
            player.x = templeX;
            player.y = templeY;
            player.z = templeZ;
            
            // Restaura HP
            player.hp = player.maxHp;
            player.isDead = false;
            
            // Salva nova posição no banco
            await this.savePlayer(player);
            
            // Envia evento de morte para o cliente
            const client = Array.from(wsServer.clients.values()).find(c => c.player?.id === player.id);
            if (client) {
                client.send('playerDeath', {
                    message: 'Você morreu!',
                    respawnX: templeX,
                    respawnY: templeY,
                    respawnZ: templeZ
                });
            }
            
            logger.info(`Player ${player.name} respawned at temple (${templeX}, ${templeY}, ${templeZ})`);
        } catch (error) {
            logger.error(`Error handling death forer.name} saved successfully (pos: ${player.x},${player.y},${player.z}, hp: ${player.hp})`);
        }
    }

    async init() {
        logger.info('Initializing game world...');
        if (this.mapManager && typeof this.mapManager.loadMaps === 'function') {
            await this.mapManager.loadMaps();
        }
        await this.zoneManager.init();
        // Carrega NPCs do banco de dados
        await this.loadNpcs();
        // Inicializa Pokémon selvagens
        await this.wildPokemonManager.initialize();
        logger.info('Game world initialized');
    }
    
    async loadNpcs() {
        try {
            logger.info('Loading NPCs from database...');
            const npcData = await this.npcRepository.loadAll();
            logger.info(`Found ${npcData.length} NPCs in database`);
            
            for (const data of npcData) {
                const npc = new Npc({
                    id: data.id,
                    name: data.name,
                    type: data.type,
                    x: data.x,
                    y: data.y,
                    z: data.z,
                    sprite: data.sprite,
                    worldId: data.world_id
                });
                
                this.npcs.set(npc.id, npc);
                logger.info(`[NPC] Spawnado: ${npc.name} (id=${npc.id}) em x=${npc.x}, y=${npc.y}, z=${npc.z}`);
            }
            
            logger.info(`Loaded ${this.npcs.size} NPCs`);
        } catch (error) {
            logger.error('Error loading NPCs:', error);
        }
    }
    
    async addPlayer(playerData) {
        const player = new Player(playerData);
        player.gameWorld = this; // Referência ao GameWorld
        this.players.set(player.id, player);
        
        // Adiciona ao spatial grid
        this.spatialGrid.insert(player);
        logger.info(`Player added: ${player.name} (${player.id})`);
        return player;
    }
    
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            // Remove do spatial grid
            this.spatialGrid.remove(playerId);
            // Lógica de mapa removida do servidor
            // Limpa estados de delta
            this.deltaManager.clearObserver(playerId);
            // Notifica todos os clientes que viam esse player para remover sprite
            if (this.wsServer) {
                for (const client of this.wsServer.clients.values()) {
                    if (client.player && client.player._lastVisiblePlayers && client.player._lastVisiblePlayers.has(playerId)) {
                        client.send('removePlayer', { id: playerId });
                        client.player._lastVisiblePlayers.delete(playerId);
                    }
                }
            }
            this.players.delete(playerId);
            logger.info(`Player removed: ${player.name} (${playerId})`);
        }
    }
    
    getPlayersInArea(x, y, z, range) {
        // Usa spatial grid para busca O(1) ao invés de O(n)
        const entities = this.spatialGrid.queryRange(x, y, z, range);
        return entities.filter(e => e.type === 'player');
    }
    
    getEntitiesInArea(x, y, z, range) {
        // Retorna todas as entidades na área
        return this.spatialGrid.queryRange(x, y, z, range);
    }
    
    getEntityAt(x, y, z) {
        // Busca entidade exata na posição
        const entities = this.spatialGrid.queryExact(x, y, z);
        return entities[0] || null;
    }
    
    update(deltaTime) {
        this.tick++;
        
        const currentTime = Date.now();
        
        // Atualiza todas as entidades
        this.players.forEach(player => {
            player.update(deltaTime);
            // Atualiza no spatial grid se mudou de posição
            this.spatialGrid.update(player);
        });
        
        this.npcs.forEach(npc => {
            npc.update(deltaTime);
            this.spatialGrid.update(npc);
        });
        
        this.monsters.forEach(monster => {
            monster.update(deltaTime);
            this.spatialGrid.update(monster);
        });
        
        // Atualiza Pokémon selvagens
        this.wildPokemonManager.update(currentTime);
        
        // Atualiza zonas
        this.zoneManager.update(deltaTime);
        
        // Log de performance a cada 100 ticks
        if (this.tick % 100 === 0) {
            const stats = this.spatialGrid.getStats();
            logger.debug(`Grid stats: ${stats.cells} cells, ${stats.entities} entities, avg ${stats.avgEntitiesPerCell.toFixed(2)}/cell`);
        }
    }
    
    getGameState(player) {
        // Retorna o estado do jogo visível para o player
        const visionRange = 24;
        
        // Inclui todos os players próximos em X/Y, independente do andar (z)
        const playersInView = [];
        if (!player._lastVisiblePlayers) player._lastVisiblePlayers = new Set();
        const currentVisiblePlayers = new Set();
        for (const p of this.players.values()) {
            const dx = Math.abs(p.x - player.x);
            const dy = Math.abs(p.y - player.y);
            if (dx <= visionRange && dy <= visionRange) {
                playersInView.push(p);
                currentVisiblePlayers.add(p.id);
            }
        }
        // Find players that left visibility
        const removedPlayers = [...player._lastVisiblePlayers].filter(id => !currentVisiblePlayers.has(id));
        if (removedPlayers.length && this.wsServer) {
            const client = Array.from(this.wsServer.clients.values()).find(c => c.player?.id === player.id);
            if (client) {
                removedPlayers.forEach(id => {
                    client.send('removePlayer', { id });
                });
            }
        }
        player._lastVisiblePlayers = currentVisiblePlayers;
        let maxMapUp = 5;
        let minMapDown = 1;
        
        // Obtém tiles visíveis (28 tiles largura x 15 tiles altura)
        const mapData = this.visionSystem.getVisibleTiles(player, 32, 17);
        // Só envia mapUp se o player NÃO estiver sob roof/house/construcao
        // Lógica de mapa removida do servidor

        const serializedPlayers = playersInView.map(p => {
            const data = p.serialize();
            if (p.id === player.id) {
                data.isLocal = true;
            }
            return data;
        });
        
        // Garante que o player local está sempre incluído
        if (!serializedPlayers.find(p => p.id === player.id)) {
            const localData = player.serialize();
            localData.isLocal = true;
            serializedPlayers.push(localData);
        }
        
        // Serializa apenas NPCs próximos (<=10 tiles em x ou y, mesmo z)
        const serializedNpcs = [];
        this.npcs.forEach(npc => {
            if (
                npc.z === player.z &&
                (Math.abs(npc.x - player.x) <= 10 && Math.abs(npc.y - player.y) <= 10)
            ) {
                serializedNpcs.push(npc.toClientData());
            }
        });
        
        return {
            tick: this.tick,
            players: serializedPlayers,
            npcs: serializedNpcs,
            monsters: []
        };
    }
    
    getGameStateDelta(player) {
        // Retorna apenas mudanças desde última atualização
        const visionRange = 15;
        
        const entitiesInView = this.getEntitiesInArea(
            player.x,
            player.y,
            player.z,
            visionRange
        );
        
        // Calcula delta de entidades
        const entitiesDelta = this.deltaManager.calculateEntitiesDelta(
            player.id,
            entitiesInView.map(e => e.serialize())
        );
        
        // Calcula delta de mapa
        const mapChunk = this.mapManager.getMapChunk(player.x, player.y, player.z);
        const mapDelta = this.deltaManager.calculateMapDelta(
            player.id,
            mapChunk.tiles || []
        );
        
        // Retorna apenas se houver mudanças
        if (!entitiesDelta && !mapDelta) {
            return null;
        }
        
        return {
            tick: this.tick,
            entities: entitiesDelta,
            map: mapDelta
        };
    }
    
    forceFullUpdate(playerId) {
        // Força reenvio completo do estado
        this.deltaManager.forceFullUpdate(playerId);

        // LOG: sprites do tile atual do player
        // ...removed tile logging...
    }
    
    getStats() {
        const gridStats = this.spatialGrid.getStats();
        const deltaStats = this.deltaManager.getStats();
        
        return {
            tick: this.tick,
            players: this.players.size,
            npcs: this.npcs.size,
            monsters: this.monsters.size,
            spatialGrid: gridStats,
            deltaManager: deltaStats
        };
    }
}
