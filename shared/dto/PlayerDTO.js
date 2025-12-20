export class PlayerDTO {
    static serialize(player) {
        // Converte direction de número para string se necessário
        const directionMap = { 0: 'up', 1: 'right', 2: 'down', 3: 'left' };
        let direction = player.direction;
        if (typeof direction === 'number') {
            direction = directionMap[direction] || 'down';
        }
        
        const dto = {
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
            direction: direction,
            sprite: player.sprite || 'default'
        };
        console.log(`[PlayerDTO] Serializing player ${player.name} with sprite: ${dto.sprite}, direction: ${dto.direction}`);
        return dto;
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
