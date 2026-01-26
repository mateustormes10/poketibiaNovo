import { Entity } from './Entity.js';
import { GameConstants } from '../../../shared/constants/GameConstants.js';

export class Player extends Entity {
    constructor(data) {
        super({ ...data, type: 'player' });
        this.clientState = null; // Referência ao WsClient (socket), usada para broadcast
        this.dbId = data.dbId;
        this.name = data.name || 'Player';
        this.level = data.level || GameConstants.DEFAULT_PLAYER_LEVEL;
        this.vocation = data.vocation || 0;
        this.hp = data.hp || GameConstants.DEFAULT_PLAYER_HP;
        this.maxHp = data.maxHp || GameConstants.DEFAULT_PLAYER_MAX_HP;
        this.mp = data.mp || GameConstants.DEFAULT_PLAYER_MP;
        this.maxMp = data.maxMp || GameConstants.DEFAULT_PLAYER_MAX_MP;
        this.exp = data.exp || 0;
        this.town_id = (data.town_id !== undefined && data.town_id !== null) ? data.town_id : 4;
        // Garante que o campo sprite sempre seja preenchido corretamente
        if (typeof data.sprite === 'string' && data.sprite.length > 0) {
            this.sprite = data.sprite;
        } else if (typeof data.lookaddons === 'string' && data.lookaddons.length > 0) {
            this.sprite = data.lookaddons;
        } else {
            this.sprite = 'default';
        }
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

    /**
     * Ganha exp, faz level up se necessário, retorna true se upou
     */
    gainExpAndCheckLevelUp(amount) {
        this.exp += amount;
        let leveledUp = false;
        // Level up: 1000 + level*1000
        let nextLevelExp = 1000 + this.level * 1000;
        while (this.exp >= nextLevelExp) {
            this.exp -= nextLevelExp;
            this.level += 1;
            leveledUp = true;
            nextLevelExp = 1000 + this.level * 1000;
        }
        return leveledUp;
    }
    
    toDirectionNumber() {
        // Converte direção string para número do banco
        const directionMap = {
            'up': 0,    // Norte
            'right': 1, // Leste
            'down': 2,  // Sul
            'left': 3   // Oeste
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
            exp: this.exp,
            maxMp: this.maxMp,
            sprite: this.sprite,
            direction: this.direction,
            goldCoin: this.goldCoin || 0,
            pokemons: this.pokemons || [],
            pokemonName: this.pokemonName || null,
            // Corrige: envia skills como array de strings (JSON serializados)
            skills: this.skills ? this.skills.map(skill => typeof skill === 'string' ? skill : JSON.stringify(skill)) : [],
            town_id: this.town_id || 1
        };
    }
}
