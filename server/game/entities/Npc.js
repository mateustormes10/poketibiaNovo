import { Entity } from './Entity.js';

export class Npc extends Entity {
    constructor(data) {
        super({ ...data, type: 'npc' });
        
        this.name = data.name || 'NPC';
        this.dialogue = data.dialogue || [];
        this.shop = data.shop || null;
        this.quest = data.quest || null;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
    }
    
    serialize() {
        return {
            ...super.serialize(),
            name: this.name
        };
    }
}
