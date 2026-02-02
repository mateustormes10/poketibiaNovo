function parseIntEnv(value) {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number.parseInt(String(value), 10);
    return Number.isFinite(n) ? n : undefined;
}

export const config = {
    // WebSocket/Game
    port: parseIntEnv(process.env.PORT) ?? 3000,
    // HTTP API
    httpPort: parseIntEnv(process.env.HTTP_PORT) ?? 3001,

    tickRate: parseIntEnv(process.env.TICK_RATE) ?? 10, // ticks por segundo
    
    game: {
        maxPlayers: 100,
        visionRange: 15,
        saveInterval: 60000 // 1 minuto
    },
    
    map: {
        defaultSpawn: { x: 50, y: 50, z: 1 }
    },
    
    database: {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseIntEnv(process.env.DB_PORT) ?? 3306,
        user: process.env.DB_USER ?? 'root',
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME ?? 'chaoswar'
    }
};
