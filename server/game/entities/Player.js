import { Entity } from './Entity.js';
import { GameConstants } from '../../../shared/constants/GameConstants.js';

export class Player extends Entity {
    constructor(data) {
        super({ ...data, type: 'player' });
        
        this.dbId = data.dbId; // ID do banco de dados
        this.name = data.name || 'Player';
        this.level = data.level || GameConstants.DEFAULT_PLAYER_LEVEL;
        this.vocation = data.vocation || 0; // 0 = No vocation, 4 = GM
        this.hp = data.hp || GameConstants.DEFAULT_PLAYER_HP;
        this.maxHp = data.maxHp || GameConstants.DEFAULT_PLAYER_MAX_HP;
        this.mp = data.mp || GameConstants.DEFAULT_PLAYER_MP;
        this.maxMp = data.maxMp || GameConstants.DEFAULT_PLAYER_MAX_MP;
        this.exp = data.exp || 0;
        
        this.attack = data.attack || GameConstants.DEFAULT_PLAYER_ATTACK;
        this.defense = data.defense || GameConstants.DEFAULT_PLAYER_DEFENSE;
        this.attackRange = data.attackRange || GameConstants.DEFAULT_ATTACK_RANGE;
        this.attackCooldown = 0;
        this.attackSpeed = data.attackSpeed || GameConstants.DEFAULT_ATTACK_SPEED; // ms
        
        this.inventory = data.inventory || [];
        this.equipment = data.equipment || {};
        this.pokemons = []; // Será carregado do banco
        this.direction = data.direction || 'down'; // up, down, left, right
        this.sprite = data.sprite || 'default'; // lookaddons
        this.isDead = false;
        this.gameWorld = null; // Será setado quando adicionado ao mundo
        this.wsServer = null; // Será setado quando adicionado ao mundo
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime * 1000;
        }
    }
    
    takeDamage(damage) {
        this.hp = Math.max(0, this.hp - damage);
        
        // Verifica se morreu
        if (this.hp === 0 && !this.isDead) {
            this.onDeath();
        }
    }
    
    onDeath() {
        // Marca como morto para evitar múltiplas chamadas
        this.isDead = true;
        
        // Chama handlePlayerDeath do GameWorld se disponível
        if (this.gameWorld && this.wsServer) {
            this.gameWorld.handlePlayerDeath(this, this.wsServer);
        }
    }
    
    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }
    
    gainExp(amount) {
        this.exp += amount;
        // Implementar level up
    }
    
    toDirectionNumber() {
        // Converte direção string para número do banco
        const directionMap = {
            'up': 1,    // Norte
            'right': 2, // Leste
            'down': 3,  // Sul
            'left': 4   // Oeste
        };
        return directionMap[this.direction] || 3; // Default: Sul
    }
    
    /**
     * Envia mensagem ao client do player
     */
    sendMessage(data) {
        if (this.wsServer) {
            // Busca o client do player
            const client = Array.from(this.wsServer.clients.values())
                .find(c => c.player?.id === this.id);
            
            if (client) {
                client.send(data.action, data);
            }
        }
    }
    
    serialize() {
        return {
            ...super.serialize(),
            name: this.name,
            level: this.level,
            vocation: this.vocation,
            hp: this.hp,
            maxHp: this.maxHp,
            mp: this.mp,
            maxMp: this.maxMp,
            sprite: this.sprite,
            direction: this.direction,
            goldCoin: this.goldCoin || 0,
            pokemons: this.pokemons || [],
            pokemonName: this.pokemonName || null // Adiciona pokemonName para o cliente
        };
    }
}
