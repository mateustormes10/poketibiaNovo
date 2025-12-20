import { Entity } from './Entity.js';

export class Player extends Entity {
    constructor(data) {
        super({ ...data, type: 'player' });
        
        this.dbId = data.dbId; // ID do banco de dados
        this.name = data.name || 'Player';
        this.level = data.level || 1;
        this.vocation = data.vocation || 0; // 0 = No vocation, 4 = GM
        this.hp = data.hp || 100;
        this.maxHp = data.maxHp || 100;
        this.mp = data.mp || 50;
        this.maxMp = data.maxMp || 50;
        this.exp = data.exp || 0;
        
        this.attack = data.attack || 10;
        this.defense = data.defense || 5;
        this.attackRange = data.attackRange || 1;
        this.attackCooldown = 0;
        this.attackSpeed = data.attackSpeed || 1000; // ms
        
        this.inventory = data.inventory || [];
        this.equipment = data.equipment || {};
        this.pokemons = []; // Será carregado do banco
        this.direction = data.direction || 'down'; // up, down, left, right
        this.sprite = data.sprite || 'player'; // lookaddons
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
            pokemons: this.pokemons || []
        };
    }
}
