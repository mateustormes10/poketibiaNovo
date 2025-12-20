export class CombatSystem {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
    }
    
    attack(attacker, target) {
        if (!this.canAttack(attacker, target)) {
            return { success: false, reason: 'Cannot attack' };
        }
        
        const damage = this.calculateDamage(attacker, target);
        target.takeDamage(damage);
        
        return {
            success: true,
            damage,
            targetDead: target.hp <= 0
        };
    }
    
    canAttack(attacker, target) {
        // Verifica se está em range
        const distance = this.getDistance(attacker, target);
        if (distance > attacker.attackRange || distance === 0) {
            return false;
        }
        
        // Verifica se está no mesmo andar
        if (attacker.z !== target.z) {
            return false;
        }
        
        // Verifica cooldown de ataque
        if (attacker.attackCooldown > 0) {
            return false;
        }
        
        return true;
    }
    
    calculateDamage(attacker, target) {
        const baseDamage = attacker.attack || 10;
        const defense = target.defense || 0;
        
        const damage = Math.max(1, baseDamage - defense);
        const variance = Math.random() * 0.2 - 0.1; // ±10%
        
        return Math.floor(damage * (1 + variance));
    }
    
    getDistance(entity1, entity2) {
        const dx = Math.abs(entity1.x - entity2.x);
        const dy = Math.abs(entity1.y - entity2.y);
        return Math.max(dx, dy);
    }
}
