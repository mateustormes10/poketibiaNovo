import { Entity } from './Entity.js';

export class Monster extends Entity {
    constructor(data) {
        super({ ...data, type: 'monster' });
        
        this.name = data.name || 'Monster';
        this.level = data.level || 1;
        this.hp = data.hp || 50;
        this.maxHp = data.maxHp || 50;
        this.attack = data.attack || 5;
        this.defense = data.defense || 2;
        this.exp = data.exp || 10;
        this.hostile = data.hostile !== false;
        
        this.target = null;
        this.attackCooldown = 0;
        this.attackSpeed = data.attackSpeed || 2000;
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
            maxHp: this.maxHp
        };
    }
}
