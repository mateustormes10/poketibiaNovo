/**
 * WildPokemonManager
 * 
 * Gerencia spawn, comportamento e atualização de Pokémon selvagens
 * Roda no loop do servidor
 */

import { WildPokemon } from '../entities/WildPokemon.js';
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
        const spawnData = [
            { name: 'Rattata', level: 3, hp: 20, maxHp: 20, x: 18, y: 19, z: 3, "sprite_up": ["33533"], "sprite_down": [ "33535"],  "sprite_left": [ "33536"], "sprite_right": ["33534"] },
            { name: 'Horsea', level: 3, hp: 20, maxHp: 20, x: 16, y: 19, z: 3, "sprite_up": ["33412"], "sprite_down": [ "33414"],  "sprite_left": [ "33415"], "sprite_right": ["33417"] },
            { name: 'Pidgey', level: 4, hp: 22, maxHp: 22, x: 20, y: 21, z: 3, "sprite_up": ["33368"], "sprite_down": [ "33370"],  "sprite_left": [ "33371"], "sprite_right": ["33369"] },
            { name: 'Caterpie', level: 2, hp: 15, maxHp: 15, x: 17, y: 16, z: 3, "sprite_up": ["33400"], "sprite_down": [ "33402"],  "sprite_left": [ "33403"], "sprite_right": ["33401"] },
            { name: 'Charmander', level: 2, hp: 16, maxHp: 16, x: 12, y: 18, z: 3, "sprite_up": ["33356"], "sprite_down": [ "33358"],  "sprite_left": [ "33359"], "sprite_right": ["33357"] },
            { name: 'Venusaur', level: 20, hp: 160, maxHp: 160, x: 20, y: 18, z: 3, "sprite_up": ["33170","33171","33172","33173"], "sprite_down": [ "33178","33179","33180","33181"],  "sprite_left": [ "33182","33183","33184","33185"], "sprite_right": ["33174","33175","33176","33177"] }
        ];
        for (const data of spawnData) {
            let spriteData = {};
            this.spawnPokemon({ ...data, ...spriteData }, false);
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
        const id = this.nextId++;
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
            id,
            ...data,
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
            console.log(`[WildPokemonManager] Update: ${this.wildPokemons.size} pokémons, ${players.length} players online, currentTime=${currentTime}`);
        }
        
        // Atualiza cada Pokémon
        for (const wildPokemon of this.wildPokemons.values()) {
            const oldState = wildPokemon.state;
            const oldX = wildPokemon.x;
            const oldY = wildPokemon.y;
            
            wildPokemon.update(players, currentTime);
            
            // Se mudou de estado ou posição, notifica clientes
            if (wildPokemon.state !== oldState || wildPokemon.x !== oldX || wildPokemon.y !== oldY) {
                // console.log(`[WildPokemonManager] ${wildPokemon.name} (id=${wildPokemon.id}) mudou! State: ${oldState}->${wildPokemon.state}, Pos: (${oldX},${oldY})->(${wildPokemon.x},${wildPokemon.y})`);
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
            if (wildPokemon.z !== player.z) continue;
            
            const distance = wildPokemon.getDistanceToPlayer(player);
            if (distance <= range) {
                nearby.push(wildPokemon);
            }
        }
        
        return nearby;
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
        console.log('[WildPokemonManager] broadcastSpawn DTO:', JSON.stringify(data, null, 2));
        for (const client of this.gameWorld.server.clients.values()) {
            if (client.player) {
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
        console.log('[WildPokemonManager] broadcastUpdate DTO:', JSON.stringify(data, null, 2));
        let clientCount = 0;
        for (const client of this.gameWorld.server.clients.values()) {
            if (client.player) {
                // console.log(`[WildPokemonManager] Enviando update de ${wildPokemon.name} para ${client.player.name}`);
                client.send(WildPokemonServerEvents.WILD_POKEMON_UPDATE, data);
                clientCount++;
            }
        }
        if (clientCount === 0) {
            console.log(`[WildPokemonManager] AVISO: Nenhum cliente conectado para receber update de ${wildPokemon.name}`);
        }
    }

    /**
     * Broadcast de despawn para todos os players
     * @param {number} id - ID do Pokémon
     */
    broadcastDespawn(id) {
        for (const client of this.gameWorld.server.clients.values()) {
            if (client.player) {
                client.send(WildPokemonServerEvents.WILD_POKEMON_DESPAWN, { id });
            }
        }
    }
}
