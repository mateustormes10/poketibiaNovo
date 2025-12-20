/**
 * WildPokemon
 * 
 * Representa um Pokémon selvagem no mapa
 * Controlado 100% pelo servidor
 */

import { WildPokemonState, WildPokemonConfig } from '../../../shared/protocol/WildPokemonProtocol.js';
import { Logger } from '../../utils/Logger.js';

const logger = new Logger('WildPokemon');

export class WildPokemon {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.level = data.level || 5;
        this.hp = data.hp;
        this.maxHp = data.maxHp || data.hp;
        
        // Posição
        this.x = data.x;
        this.y = data.y;
        this.z = data.z;
        
        // Comportamento
        this.attackRange = data.attackRange || WildPokemonConfig.ATTACK_RANGE_DEFAULT;
        this.moveRange = this.attackRange * WildPokemonConfig.MOVE_RANGE_MULTIPLIER;
        this.state = WildPokemonState.IDLE;
        
        // Controle de movimento
        this.lastMoveTime = 0;
        this.movementSpeed = WildPokemonConfig.MOVEMENT_SPEED;
        
        // Posição de spawn (para voltar)
        this.spawnX = this.x;
        this.spawnY = this.y;
        this.spawnZ = this.z;
        
        // Log de spawn
        logger.info(`[WILD] Pokémon spawnado: ${this.name} (id=${this.id}) em x=${this.x}, y=${this.y}, z=${this.z} | HP=${this.hp}`);
    }

    /**
     * Calcula distância até um player (Chebyshev distance)
     * @param {Object} player - Player alvo
     * @returns {number} Distância em tiles
     */
    getDistanceToPlayer(player) {
        if (this.z !== player.z) {
            return Infinity; // Andares diferentes
        }
        
        const dx = Math.abs(this.x - player.x);
        const dy = Math.abs(this.y - player.y);
        
        return Math.max(dx, dy);
    }

    /**
     * Atualiza comportamento baseado em players próximos
     * @param {Array} players - Lista de players
     * @param {number} currentTime - Tempo atual
     */
    update(players, currentTime) {
        // Encontra player mais próximo
        let closestPlayer = null;
        let minDistance = Infinity;
        
        for (const player of players) {
            const distance = this.getDistanceToPlayer(player);
            if (distance < minDistance) {
                minDistance = distance;
                closestPlayer = player;
            }
        }
        
        // Define estado baseado na distância
        if (minDistance > this.moveRange) {
            this.state = WildPokemonState.IDLE;
        } else if (minDistance <= this.attackRange) {
            this.state = WildPokemonState.ENGAGE;
        } else {
            this.state = WildPokemonState.ROAMING;
        }
        
        // Executa comportamento
        switch (this.state) {
            case WildPokemonState.IDLE:
                // Não faz nada
                break;
                
            case WildPokemonState.ROAMING:
                // Movimento aleatório ocasional
                if (currentTime - this.lastMoveTime >= this.movementSpeed) {
                    this.randomMove();
                    this.lastMoveTime = currentTime;
                }
                break;
                
            case WildPokemonState.ENGAGE:
                // Aproxima do player
                if (closestPlayer && currentTime - this.lastMoveTime >= this.movementSpeed) {
                    this.moveTowards(closestPlayer);
                    this.lastMoveTime = currentTime;
                }
                break;
        }
    }

    /**
     * Movimento aleatório (roaming)
     */
    randomMove() {
        // Escolhe direção aleatória
        const directions = [
            { dx: 0, dy: -1 },  // cima
            { dx: 0, dy: 1 },   // baixo
            { dx: -1, dy: 0 },  // esquerda
            { dx: 1, dy: 0 }    // direita
        ];
        
        const dir = directions[Math.floor(Math.random() * directions.length)];
        
        // Não se afasta muito do spawn
        const newX = this.x + dir.dx;
        const newY = this.y + dir.dy;
        
        const distanceFromSpawn = Math.max(
            Math.abs(newX - this.spawnX),
            Math.abs(newY - this.spawnY)
        );
        
        if (distanceFromSpawn <= this.moveRange) {
            this.x = newX;
            this.y = newY;
        }
    }

    /**
     * Move em direção a um alvo
     * @param {Object} target - Alvo (player)
     */
    moveTowards(target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        
        // Move um tile por vez
        if (Math.abs(dx) > Math.abs(dy)) {
            this.x += dx > 0 ? 1 : -1;
        } else if (dy !== 0) {
            this.y += dy > 0 ? 1 : -1;
        }
    }

    /**
     * Recebe dano
     * @param {number} damage - Quantidade de dano
     * @returns {boolean} true se morreu
     */
    takeDamage(damage) {
        this.hp = Math.max(0, this.hp - damage);
        logger.debug(`[WILD] ${this.name} (id=${this.id}) recebeu ${damage} de dano. HP: ${this.hp}/${this.maxHp}`);
        return this.hp <= 0;
    }

    /**
     * Retorna dados para envio ao cliente
     */
    toDTO() {
        return {
            id: this.id,
            name: this.name,
            level: this.level,
            hp: this.hp,
            maxHp: this.maxHp,
            x: this.x,
            y: this.y,
            z: this.z
        };
    }
}
