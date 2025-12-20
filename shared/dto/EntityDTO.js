export class EntityDTO {
    static serialize(entity) {
        return {
            id: entity.id,
            type: entity.type,
            x: entity.x,
            y: entity.y,
            z: entity.z,
            direction: entity.direction,
            name: entity.name,
            sprite: entity.sprite
        };
    }
    
    static serializeWithStats(entity) {
        return {
            ...this.serialize(entity),
            hp: entity.hp,
            maxHp: entity.maxHp,
            level: entity.level
        };
    }
}
