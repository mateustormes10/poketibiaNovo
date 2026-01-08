export class SpawnSystem {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
        this.spawnPoints = [];
        this.spawnTimers = new Map();
    }
    
    addSpawnPoint(spawnPoint) {
        this.spawnPoints.push(spawnPoint);
    }
    
    update(deltaTime) {
        this.spawnPoints.forEach(spawnPoint => {
            this.updateSpawnPoint(spawnPoint, deltaTime);
        });
    }
    
    updateSpawnPoint(spawnPoint, deltaTime) {
        const timer = this.spawnTimers.get(spawnPoint.id) || 0;
        
        if (timer <= 0) {
            this.spawn(spawnPoint);
            this.spawnTimers.set(spawnPoint.id, spawnPoint.respawnTime);
        } else {
            this.spawnTimers.set(spawnPoint.id, timer - deltaTime);
        }
    }
    
    spawn(spawnPoint) {
        // Implementar spawn de monstros/NPCs
        console.log(`Spawning at ${spawnPoint.x}, ${spawnPoint.y}, ${spawnPoint.z}`);
    }
}
