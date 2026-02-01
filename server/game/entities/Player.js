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
        this.hp = (typeof data.hp === 'number') ? data.hp : GameConstants.DEFAULT_PLAYER_HP;
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
        // Garante que conditions sempre será um objeto
        if (data.conditions && typeof data.conditions === 'object') {
            this.conditions = data.conditions;
        } else {
            this.conditions = {};
        }
        // Controle de regeneração de stamina
        this._lastMoveTime = Date.now();
        this._staminaRegenTimer = 0;
        // Controle de fome
        this._lastFomeTime = Date.now();
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Inicialização dos timers (só precisa fazer uma vez no construtor, não no update)
        if (!this._lastFomeTime) this._lastFomeTime = Date.now();
        if (!this._lastFomeDanoTime) this._lastFomeDanoTime = Date.now();
        if (!this.conditions) this.conditions = {};

        let fome;
        if (typeof this.conditions.fome === 'number') {
            fome = this.conditions.fome;
        } else if (typeof this.conditions.fome === 'string') {
            fome = parseFloat(this.conditions.fome) || 0;
        } else {
            fome = 0;
        }
        const now = Date.now();

        // Fome abaixa 1 a cada 10s
        if (now - this._lastFomeTime >= 10000 && fome > 0) {
            fome = Math.max(0, fome - 10);
            this.conditions.fome = fome;
            this._lastFomeTime += 10000;
        }
        // Garante que fome nunca volte para 100 automaticamente
        if (fome <= 0) {
            this.conditions.fome = 0;
        }

        // Se fome zerou, perde 1 de vida a cada 10s
        if (fome <= 0 && this.hp > 0 && now - this._lastFomeDanoTime >= 10000) {
            this.hp = Math.max(0, this.hp - 1);
            this._lastFomeDanoTime += 10000;
        }
        // Se fome voltou a ser > 0, reseta timer de dano
        if (fome > 0) this._lastFomeDanoTime = now;

        // Regeneração de stamina se parado
        if (!this._lastMoveTime) this._lastMoveTime = Date.now();
        if (!this.conditions) this.conditions = {};
        let staminaAtual = 100;
        if (typeof this.conditions.stamina === 'number') {
            staminaAtual = this.conditions.stamina;
        } else if (typeof this.conditions.stamina === 'string') {
            staminaAtual = parseFloat(this.conditions.stamina) || 100;
        }
        // Se ficou 2s sem andar, regenera 2 pontos
        if (!this._lastPos) this._lastPos = {x: this.x, y: this.y, z: this.z};
        if (this.x !== this._lastPos.x || this.y !== this._lastPos.y || this.z !== this._lastPos.z) {
            this._lastMoveTime = Date.now();
            this._lastPos = {x: this.x, y: this.y, z: this.z};
        } else {
            // Parado
            const now = Date.now();
            if (now - this._lastMoveTime >= 2000 && staminaAtual < 100) {
                staminaAtual = Math.min(100, staminaAtual + 4);
                this.conditions.stamina = staminaAtual;
                this._lastMoveTime = now; // só regenera a cada 2s parado
            }
        }

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
            town_id: this.town_id || 1,
            conditions: this.conditions || {}
        };
    }
}
