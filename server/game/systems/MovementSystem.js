export class MovementSystem {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
    }
    
    moveEntity(entity, direction) {
        const newPos = this.getNewPosition(entity, direction);
        // Sem validação: aceita qualquer movimento
        entity.x = newPos.x;
        entity.y = newPos.y;
        entity.direction = direction;
        return true;
    }
    
    getNewPosition(entity, direction) {
        const pos = { x: entity.x, y: entity.y, z: entity.z };
        
        switch (direction) {
            case 'up':
                pos.y -= 1;
                break;
            case 'down':
                pos.y += 1;
                break;
            case 'left':
                pos.x -= 1;
                break;
            case 'right':
                pos.x += 1;
                break;
        }
        
        return pos;
    }
    
    canMove(entity, newPos) {
        // Sempre retorna true: sem validação de colisão ou walkable
        return true;
    }
    
    hasEntityAt(x, y, z, excludeId) {
        // Verifica colisão com players
        for (const [id, player] of this.gameWorld.players) {
            if (id !== excludeId && player.x === x && player.y === y && player.z === z) {
                return true;
            }
        }
        
        // Verifica colisão com NPCs
        for (const [id, npc] of this.gameWorld.npcs) {
            if (npc.x === x && npc.y === y && npc.z === z) {
                return true;
            }
        }
        
        // Verifica colisão com wild pokémons (ignora corpos mortos)
        if (this.gameWorld.wildPokemonManager && this.gameWorld.wildPokemonManager.wildPokemons) {
            for (const wildPokemon of this.gameWorld.wildPokemonManager.wildPokemons.values()) {
                if (wildPokemon.id !== excludeId && wildPokemon.x === x && wildPokemon.y === y && wildPokemon.z === z) {
                    if (!wildPokemon.isDead) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
}
