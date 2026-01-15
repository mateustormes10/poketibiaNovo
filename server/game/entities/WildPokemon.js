/**
 * WildPokemon
 * 
 * Representa um Pokémon selvagem no mapa
 * Controlado 100% pelo servidor
 */

import { WildPokemonState, WildPokemonConfig } from '../../../shared/protocol/WildPokemonProtocol.js';
import { Logger } from '../../utils/Logger.js';

import { SkillDatabase } from '../../../shared/SkillDatabase.js';

const logger = new Logger('WildPokemon');

export class WildPokemon {
    constructor(data) {
        console.log('[DEBUG] Criando WildPokemon:', { id: data.id, name: data.name, x: data.x, y: data.y, z: data.z, hp: data.hp });
        this.id = data.id;
        this.name = data.name;
        this.level = data.level || 5;
        this.hp = data.hp;
        this.maxHp = data.maxHp || data.hp;
        // Skills e cooldowns
        this.skills = [];
        this.skillCooldowns = {};
        if (data.skills && Array.isArray(data.skills)) {
            for (const skillName of data.skills) {
                if (SkillDatabase[skillName]) {
                    this.skills.push(skillName);
                    this.skillCooldowns[skillName] = 0;
                }
            }
        }
        // spriteDead sempre vem do data (PokemonEntities), nunca valor fixo
        this.spriteDead = data.spriteDead;
        this.isDead = false;
        this.deadSince = null;

        // Sprites (podem vir do banco ou ser undefined)
        this.sprite_up = data.sprite_up ?? ['black'];
        this.sprite_down = data.sprite_down ?? ['black'];
        this.sprite_left = data.sprite_left ?? ['black'];
        this.sprite_right = data.sprite_right ?? ['black'];

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

        // Referência ao GameWorld (será setada pelo manager)
        this.gameWorld = null;

        // Log de spawn
        logger.info(`[WILD] Pokémon spawnado: ${this.name} (id=${this.id}) em x=${this.x}, y=${this.y}, z=${this.z} | HP=${this.hp}`);
    }

    /**
     * Verifica se uma posição está ocupada por outra entidade
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @param {number} z - Coordenada Z
     * @returns {boolean} true se posição ocupada
     */
    isPositionOccupied(x, y, z) {
        if (!this.gameWorld) return false;
        
        // Verifica players
        for (const [id, player] of this.gameWorld.players) {
            if ((player.x === x) && (player.y === y) && (player.z === z)) {
                return true;
            }
        }
        
        // Verifica NPCs
        for (const [id, npc] of this.gameWorld.npcs) {
            if ((npc.x === x) && (npc.y === y) && (npc.z === z)) {
                return true;
            }
        }
        
        // Verifica outros wild pokémons
        if (this.gameWorld.wildPokemonManager && this.gameWorld.wildPokemonManager.wildPokemons) {
            for (const wildPokemon of this.gameWorld.wildPokemonManager.wildPokemons.values()) {
                if ((wildPokemon.id !== this.id) && (wildPokemon.x === x) && (wildPokemon.y === y) && (wildPokemon.z === z)) {
                    // Permite passar por cima de corpos mortos
                    if (!wildPokemon.isDead) {
                        return true;
                    }
                }
            }
        }
        
        return false;
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
        // logger.debug(`[UPDATE] ${this.name} (${this.id}) update iniciado. Pos: (${this.x},${this.y},${this.z}) HP: ${this.hp}`);
        if (this.hp <= 0) {
            if (!this.isDead) {
                this.isDead = true;
                this.deadSince = currentTime;
            }
            // Fica morto por 60 segundos
            if (currentTime - this.deadSince >= 60000) {
                // Pode ser removido ou respawnado pelo manager (não faz nada aqui)
            }
            return; // Não age enquanto morto
        }

        // Atualiza cooldowns das skills
        for (const skillName of this.skills) {
            if (this.skillCooldowns[skillName] > 0) {
                this.skillCooldowns[skillName] = Math.max(0, this.skillCooldowns[skillName] - (currentTime - (this._lastUpdateTime || currentTime)) / 1000);
            }
        }
        this._lastUpdateTime = currentTime;

        // ...comportamento normal se vivo...
        let closestPlayer = null;
        let minDistance = Infinity;
        for (const player of players) {
            const distance = this.getDistanceToPlayer(player);
            // logger.debug(`[UPDATE] ${this.name} (${this.id}) distância até player ${player.id}: ${distance}`);
            if (distance < minDistance) {
                minDistance = distance;
                closestPlayer = player;
            }
        }
        if (!closestPlayer) {
            // logger.debug(`[UPDATE] ${this.name} (${this.id}) nenhum player encontrado para perseguir.`);
        }
        if (minDistance > this.moveRange) {
            this.state = WildPokemonState.IDLE;
            // logger.debug(`[UPDATE] ${this.name} (${this.id}) está fora do moveRange (${this.moveRange}), entrando em IDLE.`);
        } else {
            // Checa se está adjacente ao player (incluindo diagonal)
            let isAdjacent = false;
            if (closestPlayer) {
                const dx = Math.abs(this.x - closestPlayer.x);
                const dy = Math.abs(this.y - closestPlayer.y);
                isAdjacent = ((dx <= 1) && (dy <= 1) && ((dx !== 0) || (dy !== 0)));
            }
            if (currentTime - this.lastMoveTime >= this.movementSpeed) {
                if (!isAdjacent) {
                    // logger.debug(`[UPDATE] ${this.name} (${this.id}) não está adjacente ao player, vai tentar mover.`);
                    this.moveTowards(closestPlayer);
                } else {
                    // logger.debug(`[UPDATE] ${this.name} (${this.id}) já está adjacente ao player.`);
                }
                this.lastMoveTime = currentTime;
            } else {
                // logger.debug(`[UPDATE] ${this.name} (${this.id}) aguardando cooldown de movimento.`);
            }
            // Se está na distância de ataque E tem linha de visão, ataca
            if ((minDistance <= this.attackRange) && closestPlayer && this.hasLineOfSightTo(closestPlayer)) {
                // logger.debug(`[UPDATE] ${this.name} (${this.id}) vai atacar player ${closestPlayer.id}`);
                const skillResult = this.useRandomSkill(closestPlayer, currentTime);
                if (skillResult && this.gameWorld && this.gameWorld.wildPokemonManager) {
                    this.gameWorld.wildPokemonManager.broadcastUpdate(this);
                }
            }
        }
           
        
    }

     /**
             * Verifica se há linha de visão (sem obstáculos) até o alvo
             * @param {Object} target
             * @returns {boolean}
             */
            hasLineOfSightTo(target) {
                if (!this.gameWorld || !this.gameWorld.mapManager) return false;
                // Só suporta linha reta horizontal ou vertical (para ataques à distância)
                if (this.x === target.x) {
                    const minY = Math.min(this.y, target.y);
                    const maxY = Math.max(this.y, target.y);
                    for (let y = minY + 1; y < maxY; y++) {
                        // Lógica de colisão removida do servidor
                    }
                    return true;
                } else if (this.y === target.y) {
                    const minX = Math.min(this.x, target.x);
                    const maxX = Math.max(this.x, target.x);
                    for (let x = minX + 1; x < maxX; x++) {
                        // Lógica de colisão removida do servidor
                    }
                    return true;
                }
                // Não suporta diagonal (pode expandir se necessário)
                return false;
            }
    /**
         * Faz o Pokémon selvagem usar uma skill aleatória disponível no player alvo
         * @param {Player} targetPlayer
         * @param {number} currentTime
         * @returns {object|null} resultado do uso da skill
         */
        useRandomSkill(targetPlayer, currentTime) {
            if (!this.skills || this.skills.length === 0) return null;
            // Só skills sem cooldown
            const availableSkills = this.skills.filter(skillName => this.skillCooldowns[skillName] <= 0);
            if (availableSkills.length === 0) return null;
            const skillName = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            const skill = SkillDatabase[skillName];
            if (!skill) return null;
            let result = null;
            if (skill.type === 'damage') {
                const baseDamage = skill.power + Math.floor(this.level * 0.5);
                if (targetPlayer && typeof targetPlayer.takeDamage === 'function') {
                    targetPlayer.takeDamage(baseDamage);
                    result = { skillName, damage: baseDamage, targetId: targetPlayer.id };
                }
            }
            // TODO: status, área, buffs, etc.
            this.skillCooldowns[skillName] = skill.cowndown;

            // Envia evento de animação de skill para todos os clientes
            if (this.gameWorld && this.gameWorld.server) {
                for (const client of this.gameWorld.server.clients.values()) {
                    client.send('skill_animation', {
                        skillName,
                        tile: { x: targetPlayer.x, y: targetPlayer.y, z: targetPlayer.z },
                        attackerId: this.id
                    });
                }
            }
            return result;
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
        const newX = this.x + dir.dx;
        const newY = this.y + dir.dy;
        const distanceFromSpawn = Math.max(
            Math.abs(newX - this.spawnX),
            Math.abs(newY - this.spawnY)
        );
        const mapManager = this.gameWorld ? this.gameWorld.mapManager : null;
        // Corrige para garantir que o nome da cidade/mapa seja sempre o correto, nunca o nome do monstro
        let city = this.city || this.mapaAtual || (this.gameWorld && this.gameWorld.currentMapName) || 'CidadeInicial';
        if (
            distanceFromSpawn <= this.moveRange &&
            !this.isPositionOccupied(newX, newY, this.z) &&
            mapManager && typeof mapManager.isWalkable === 'function' &&
            mapManager.isWalkable(city, this.z, newX, newY)
        ) {
            this.x = newX;
            this.y = newY;
        }
    }

    /**
     * Move em direção a um alvo
     * @param {Object} target - Alvo (player)
     */
    moveTowards(target) {
        // Pathfinding A* aprimorado para garantir encostar no player
        logger.debug(`[WILD] ${this.name} (${this.id}) tentando mover de (${this.x},${this.y}) para (${target.x},${target.y})`);

        // Tiles adjacentes ao player (incluindo diagonais)
        const mapManager = this.gameWorld ? this.gameWorld.mapManager : null;
        // Corrige para garantir que o nome da cidade/mapa seja sempre o correto, nunca o nome do monstro
        let city = this.city || this.mapaAtual || (this.gameWorld && this.gameWorld.currentMapName) || 'CidadeInicial';
        const adjacents = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue; // Ignora o tile do player
                adjacents.push({ x: target.x + dx, y: target.y + dy });
            }
        }
        // Filtra apenas os walkable e não ocupados
        const validAdjacents = adjacents.filter(pos =>
            !this.isPositionOccupied(pos.x, pos.y, this.z) &&
            mapManager && typeof mapManager.isWalkable === 'function' &&
            mapManager.isWalkable(city, this.z, pos.x, pos.y)
        );

        // Função heurística Manhattan
        function heuristic(ax, ay, bx, by) {
            return Math.abs(ax - bx) + Math.abs(ay - by);
        }

        // A* para múltiplos destinos (apenas tiles adjacentes válidos)
        let bestPath = null;
        let bestDest = null;
        let bestLen = Infinity;
        for (const dest of validAdjacents) {
            const open = [];
            const closed = new Set();
            open.push({ x: this.x, y: this.y, path: [] });
            let found = null;
            const maxSteps = 100; // Aumentado para evitar desistência prematura
            while (open.length > 0 && !found) {
                open.sort((a, b) => heuristic(a.x, a.y, dest.x, dest.y) - heuristic(b.x, b.y, dest.x, dest.y));
                const current = open.shift();
                const key = `${current.x},${current.y}`;
                if (closed.has(key)) continue;
                closed.add(key);
                if (current.x === dest.x && current.y === dest.y) {
                    found = current.path;
                    break;
                }
                if (current.path.length >= maxSteps) {
                    continue;
                }
                const directions = [
                    { dx: 0, dy: -1, dir: 'up' },
                    { dx: 0, dy: 1, dir: 'down' },
                    { dx: -1, dy: 0, dir: 'left' },
                    { dx: 1, dy: 0, dir: 'right' }
                ];
                for (const d of directions) {
                    const nx = current.x + d.dx;
                    const ny = current.y + d.dy;
                    const nkey = `${nx},${ny}`;
                    if (closed.has(nkey)) continue;
                    if (
                        (mapManager && typeof mapManager.isWalkable === 'function' && !mapManager.isWalkable(city, this.z, nx, ny)) ||
                        this.isPositionOccupied(nx, ny, this.z)
                    ) {
                        continue;
                    }
                    open.push({ x: nx, y: ny, path: [...current.path, d] });
                }
            }
            if (found && found.length < bestLen) {
                bestPath = found;
                bestDest = dest;
                bestLen = found.length;
            }
        }
        if (bestPath && bestPath.length > 0) {
            const step = bestPath[0];
            logger.debug(`[WILD] ${this.name} (${this.id}) moveu para (${this.x + step.dx},${this.y + step.dy}) direção ${step.dir}`);
            this.x += step.dx;
            this.y += step.dy;
            this.direction = step.dir;
        } else {
            logger.debug(`[WILD] ${this.name} (${this.id}) não encontrou caminho para nenhum tile adjacente ao player. Motivo provável: todos ocupados ou bloqueados.`);
        }
    }

    /**
     * Recebe dano
     * @param {number} damage - Quantidade de dano
     * @returns {boolean} true se morreu
     */
    takeDamage(damage) {
        if (this.hp <= 0) return true;
        this.hp = Math.max(0, this.hp - damage);
        logger.debug(`[WILD] ${this.name} (id=${this.id}) recebeu ${damage} de dano. HP: ${this.hp}/${this.maxHp}`);
        if (this.hp <= 0) {
            this.isDead = true;
            this.deadSince = Date.now();
            // Força broadcastUpdate imediatamente para mostrar corpo morto
            if (this.gameWorld && this.gameWorld.wildPokemonManager) {
                this.gameWorld.wildPokemonManager.broadcastUpdate(this);
            }
        }
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
            z: this.z,
            direction: this.direction || 'down',
            sprite_up: this.sprite_up,
            sprite_down: this.sprite_down,
            sprite_left: this.sprite_left,
            sprite_right: this.sprite_right,
            isDead: this.isDead,
            spriteDead: this.spriteDead
        };
    }
}
