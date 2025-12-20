export const EntityType = {
    PLAYER: 'player',
    NPC: 'npc',
    MONSTER: 'monster',
    ITEM: 'item',
    PROJECTILE: 'projectile',
    
    isCreature(type) {
        return [this.PLAYER, this.NPC, this.MONSTER].includes(type);
    },
    
    isInteractable(type) {
        return [this.NPC, this.ITEM].includes(type);
    }
};
