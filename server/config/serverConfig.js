export const config = {
    port: 3000,
    tickRate: 20, // 20 ticks por segundo
    
    game: {
        maxPlayers: 100,
        visionRange: 15,
        saveInterval: 60000 // 1 minuto
    },
    
    map: {
        defaultSpawn: { x: 50, y: 50, z: 1 }
    },
    
    database: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'poketibia'
    }
};
