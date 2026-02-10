/**
 * WildPokemonManager
 * 
 * Gerencia spawn, comportamento e atualização de Pokémon selvagens
 * Roda no loop do servidor
 */

import { WildPokemon } from '../entities/WildPokemon.js';
import { PokemonEntities } from '../entities/PokemonEntities.js';
import { WildPokemonServerEvents } from '../../../shared/protocol/WildPokemonProtocol.js';
import { Logger } from '../../utils/Logger.js';

const logger = new Logger('WildPokemonManager');

export class WildPokemonManager {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
        this.wildPokemons = new Map(); // id -> WildPokemon
        this.nextId = 1;
        
        logger.info('[WILD] WildPokemonManager inicializado');
    }

    /**
     * Spawna Pokémon selvagens iniciais
     */
    async initialize() {
        logger.info('[WILD] Iniciando spawn de Pokémon selvagens...');
        // Lista de nomes dos pokémons iniciais para spawnar
        const initialPokemonNames = [
            'Skeleton Warrior',
            'Skeleton Green',
            'Skeleton Purple',
            'Skeleton Medusa',
            'Skeleton Wizard',
            'Skeleton Bandid',
            'Skeleton Necromancer',
            'Skeleton'
        ];
        let fixedId = 1;
        for (const name of initialPokemonNames) {
            const data = PokemonEntities[name];
            if (data) {
                // Só cria se não existir
                if (!this.wildPokemons.has(fixedId)) {
                    this.spawnPokemon({ ...data, id: fixedId }, false);
                }
                fixedId++;
            } else {
                logger.warn(`[WILD] Dados não encontrados para o Pokémon: ${name}`);
            }
        }
        logger.info(`[WILD] ${this.wildPokemons.size} Pokémon selvagens spawned`);
    }

    /**
     * Spawna um Pokémon selvagem
     * @param {Object} data - Dados do Pokémon
     * @param {boolean} broadcast - Se deve enviar broadcast (default: true)
     * @returns {WildPokemon}
     */
    spawnPokemon(data, broadcast = true) {
		logger.debug('[WILD] spawnPokemon called:', { id: data?.id, name: data?.name, x: data?.x, y: data?.y, z: data?.z, hp: data?.hp });
        // Se vier ID fixo, usa ele, senão gera novo
        const id = data.id ?? this.nextId++;
        // Se já existe um Pokémon com esse ID, nunca sobrescreve HP ou estado!
        if (this.wildPokemons.has(id)) {
            const existing = this.wildPokemons.get(id);
            // Protege para nunca sobrescrever HP, posição, etc.
            return existing;
        }
        // Parse dos campos de sprite se vierem como string JSON
        const parseSprite = (val) => {
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                } catch {
                    return ['black'];
                }
            }
            return val ?? ['black'];
        };
        const wildPokemon = new WildPokemon({
            ...data,
            id,
            sprite_up: parseSprite(data.sprite_up),
            sprite_down: parseSprite(data.sprite_down),
            sprite_left: parseSprite(data.sprite_left),
            sprite_right: parseSprite(data.sprite_right)
        });

        // Seta referência ao GameWorld para verificação de colisão
        wildPokemon.gameWorld = this.gameWorld;

        this.wildPokemons.set(id, wildPokemon);

        // Notifica todos os players próximos (apenas se broadcast ativo e servidor disponível)
        if (broadcast && this.gameWorld.server) {
            this.broadcastSpawn(wildPokemon);
        }

        return wildPokemon;
    }

    /**
     * Remove um Pokémon selvagem
     * @param {number} id - ID do Pokémon
     */
    despawnPokemon(id) {
        const wildPokemon = this.wildPokemons.get(id);
        if (!wildPokemon) return;
        
        this.wildPokemons.delete(id);
        
        // Notifica todos os players
        this.broadcastDespawn(id);
        
        logger.info(`[WILD] ${wildPokemon.name} (id=${id}) despawned`);
    }

    /**
     * Atualiza todos os Pokémon selvagens
     * @param {number} currentTime - Timestamp atual
     */
    update(currentTime) {
        // Lista de players online
        const players = Array.from(this.gameWorld.players.values());
        
        if (players.length === 0) {
            // Sem players online, pokémons ficam idle
            return;
        }
        
        // Log ocasional para debug
        if (Math.random() < 0.01) { // 1% de chance
			logger.debug(`[WILD] Update: ${this.wildPokemons.size} pokémons, ${players.length} players online, currentTime=${currentTime}`);
        }
        
        // Atualiza cada Pokémon
        for (const wildPokemon of this.wildPokemons.values()) {
            const oldState = wildPokemon.state;
            const oldX = wildPokemon.x;
            const oldY = wildPokemon.y;

            // Respawn automático após 40s morto
            if (wildPokemon.isDead && wildPokemon.deadSince && currentTime - wildPokemon.deadSince >= 40000) {
                // Respawn: restaura HP, posição e estado
                wildPokemon.hp = wildPokemon.maxHp;
                wildPokemon.x = wildPokemon.spawnX;
                wildPokemon.y = wildPokemon.spawnY;
                wildPokemon.z = wildPokemon.spawnZ;
                wildPokemon.isDead = false;
                wildPokemon.deadSince = null;
                this.broadcastUpdate(wildPokemon);
                logger.info(`[WILD] Respawn automático de ${wildPokemon.name} (id=${wildPokemon.id})`);
                continue;
            }

            wildPokemon.update(players, currentTime);

            // Se mudou de estado ou posição, notifica clientes
            if (wildPokemon.state !== oldState || wildPokemon.x !== oldX || wildPokemon.y !== oldY) {
                this.broadcastUpdate(wildPokemon);
            }
        }
    }

    /**
     * Retorna lista de Pokémon próximos a um player
     * @param {Object} player - Player
     * @param {number} range - Alcance em tiles
     * @returns {Array}
     */
    getNearbyPokemons(player, range = 20) {
        const nearby = [];
        
        for (const wildPokemon of this.wildPokemons.values()) {
            if ((wildPokemon.town_id ?? 1) !== (player.town_id ?? 1)) continue;
            if (wildPokemon.z !== player.z) continue;
            
            const distance = wildPokemon.getDistanceToPlayer(player);
            if (distance <= range) {
                nearby.push(wildPokemon);
            }
        }
        
        return nearby;
    }

    /**
     * Retorna DTOs visíveis para um player (town_id + z + range)
     * @param {Object} player
     * @param {number} range
     * @returns {Array}
     */
    getVisiblePokemonDTOsForPlayer(player, range = 25) {
        if (!player) return [];
        return this.getNearbyPokemons(player, range).map(wp => wp.toDTO());
    }

    /**
     * Retorna lista completa de Pokémon selvagens (para uso interno)
     * @returns {Array<WildPokemon>}
     */
    getAll() {
        return Array.from(this.wildPokemons.values());
    }
    
    /**
     * Retorna lista completa de Pokémon selvagens (DTOs para envio ao cliente)
     * @returns {Array}
     */
    getAllPokemons() {
        return Array.from(this.wildPokemons.values()).map(wp => wp.toDTO());
    }

    /**
     * Broadcast de spawn para todos os players
     * @param {WildPokemon} wildPokemon
     */
    broadcastSpawn(wildPokemon) {
        const data = wildPokemon.toDTO();
        const range = 25;
        for (const client of this.gameWorld.server.clients.values()) {
            if (!client.player) continue;
            if ((client.player.town_id ?? 1) !== (wildPokemon.town_id ?? 1)) continue;
            if (client.player.z !== wildPokemon.z) continue;
            const dx = Math.abs(client.player.x - wildPokemon.x);
            const dy = Math.abs(client.player.y - wildPokemon.y);
            if (dx <= range && dy <= range) {
                client.send(WildPokemonServerEvents.WILD_POKEMON_SPAWN, data);
            }
        }
    }

    /**
     * Broadcast de update para todos os players
     * @param {WildPokemon} wildPokemon
     */
    broadcastUpdate(wildPokemon) {
        const data = wildPokemon.toDTO();
		logger.debug('[WILD] broadcastUpdate DTO:', data);
        let clientCount = 0;
		const range = 25;
		for (const client of this.gameWorld.server.clients.values()) {
			if (!client.player) continue;
            if ((client.player.town_id ?? 1) !== (wildPokemon.town_id ?? 1)) continue;
			if (client.player.z !== wildPokemon.z) continue;
			const dx = Math.abs(client.player.x - wildPokemon.x);
			const dy = Math.abs(client.player.y - wildPokemon.y);
			if (dx <= range && dy <= range) {
				client.send(WildPokemonServerEvents.WILD_POKEMON_UPDATE, data);
				clientCount++;
			}
		}
        if (clientCount === 0) {
			logger.debug(`[WILD] Nenhum cliente conectado para receber update de ${wildPokemon.name}`);
        }
    }

    /**
     * Broadcast de despawn para todos os players
     * @param {number} id - ID do Pokémon
     */
    broadcastDespawn(id) {
		// Para despawn, manda para todos (baixo volume) para evitar clientes com cache de monstro
		for (const client of this.gameWorld.server.clients.values()) {
			if (client.player) {
				client.send(WildPokemonServerEvents.WILD_POKEMON_DESPAWN, { id });
			}
		}
    }
}
