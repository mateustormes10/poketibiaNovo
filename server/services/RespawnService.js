export class RespawnService {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
        this.respawnPoints = new Map();
    }
    
    addRespawnPoint(id, x, y, z) {
        this.respawnPoints.set(id, { x, y, z });
    }
    
    getRespawnPoint(id = 'default') {
        return this.respawnPoints.get(id) || { x: 50, y: 50, z: 1 };
    }
    
    respawnPlayer(player) {
        const respawnPoint = this.getRespawnPoint();
        
        player.x = respawnPoint.x;
        player.y = respawnPoint.y;
        player.z = respawnPoint.z;
        player.hp = player.maxHp;
        player.mp = player.maxMp;
    }
}
