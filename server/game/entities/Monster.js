import { Entity } from './Entity.js';
import { GameConstants } from '../../../shared/constants/GameConstants.js';

export class Monster extends Entity {
    constructor(data) {
        super({ ...data, type: 'monster' });
        
        this.name = data.name || 'Monster';
        this.level = data.level || GameConstants.DEFAULT_MONSTER_LEVEL;
        this.hp = data.hp || GameConstants.DEFAULT_MONSTER_HP;
        this.maxHp = data.maxHp || GameConstants.DEFAULT_MONSTER_MAX_HP;
        this.attack = data.attack || GameConstants.DEFAULT_MONSTER_ATTACK;
        this.defense = data.defense || GameConstants.DEFAULT_MONSTER_DEFENSE;
        this.exp = data.exp || GameConstants.DEFAULT_MONSTER_EXP;
        this.hostile = data.hostile !== false;
        
        this.target = null;
        this.attackCooldown = 0;
        this.attackSpeed = data.attackSpeed || GameConstants.DEFAULT_MONSTER_ATTACK_SPEED;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime * 1000;
        }
        
        // AI básica
        if (this.hostile && this.target) {
            this.updateAI(deltaTime);
        }
    }
    
    updateAI(deltaTime) {
        // Implementar IA de movimento e ataque
    }
    
    takeDamage(damage) {
        this.hp = Math.max(0, this.hp - damage);
    }
    
    serialize() {
        return {
            ...super.serialize(),
            name: this.name,
            level: this.level,
            hp: this.hp,
            maxHp: this.maxHp,
            exp: this.exp
        };
    }
}
