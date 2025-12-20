export class PlayerDTO {
    static serialize(player) {
        return {
            id: player.id,
            name: player.name,
            x: player.x,
            y: player.y,
            z: player.z,
            hp: player.hp,
            maxHp: player.maxHp,
            mp: player.mp,
            maxMp: player.maxMp,
            level: player.level,
            direction: player.direction,
            sprite: player.sprite || 'player'
        };
    }
    
    static deserialize(data) {
        return {
            id: data.id,
            name: data.name,
            x: data.x,
            y: data.y,
            z: data.z,
            hp: data.hp,
            maxHp: data.maxHp,
            mp: data.mp,
            maxMp: data.maxMp,
            level: data.level,
            direction: data.direction,
            sprite: data.sprite
        };
    }
}
