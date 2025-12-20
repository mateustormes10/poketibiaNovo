export const GameConstants = {
    // Tamanhos
    TILE_SIZE: 64,
    CHUNK_SIZE: 64,
    
    // Visão
    VISION_RANGE: 20,
    
    // Combate
    DEFAULT_ATTACK_RANGE: 1,
    DEFAULT_ATTACK_SPEED: 1000, // ms
    
    // Movimento
    WALK_SPEED: 200, // ms por tile
    
    // Limites
    MAX_INVENTORY_SIZE: 20,
    MAX_CHAT_LENGTH: 100,
    MAX_NAME_LENGTH: 20,
    
    // Chat
    CHAT_PROXIMITY_RANGE: 15, // Distância para ouvir mensagens de chat
    MAX_CHAT_MESSAGES: 10, // Máximo de mensagens visíveis
    
    // Vocations
    GM_VOCATION: 4, // Vocation que tem permissões de GM
    
    // Servidor
    TICK_RATE: 20,
    SAVE_INTERVAL: 60000, // 1 minuto
    
    // Spawn
    DEFAULT_SPAWN: { x: 50, y: 50, z: 1 },
    TEMPLE_SPAWN: { x: 72, y: 33, z: 3 } // Spawn após morte
};
