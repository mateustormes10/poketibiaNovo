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
    SPATIAL_GRID_SIZE: 64, // tiles por célula
    
    // Spawn
    DEFAULT_SPAWN: { x: 50, y: 50, z: 1 },
    TEMPLE_SPAWN: { x: 72, y: 33, z: 3 }, // Spawn após morte
    
    // NPCs
    NPC_INTERACTION_RANGE: 1, // Distância máxima para interagir com NPC (tiles adjacentes)
    
    // Player padrão
    DEFAULT_PLAYER_HP: 100,
    DEFAULT_PLAYER_MAX_HP: 100,
    DEFAULT_PLAYER_MP: 50,
    DEFAULT_PLAYER_MAX_MP: 50,
    DEFAULT_PLAYER_ATTACK: 10,
    DEFAULT_PLAYER_DEFENSE: 5,
    DEFAULT_PLAYER_LEVEL: 1,
    
    // Monster padrão
    DEFAULT_MONSTER_HP: 50,
    DEFAULT_MONSTER_MAX_HP: 50,
    DEFAULT_MONSTER_ATTACK: 5,
    DEFAULT_MONSTER_DEFENSE: 2,
    DEFAULT_MONSTER_EXP: 10,
    DEFAULT_MONSTER_ATTACK_SPEED: 2000, // ms
    DEFAULT_MONSTER_LEVEL: 1,
    
    // Client
    // O mapa NÃO deve ser atualizado por frequência fixa, e sim por evento (andar, teleporte, mudança de visão)
    MAP_UPDATE_FREQUENCY: 3000, // (LEGADO, não usar para polling)
    RESIZE_DEBOUNCE: 100, // ms - Debounce para redimensionamento de janela
    
    // UI
    CHAT_LINE_HEIGHT: 16, // pixels
    HP_BAR_WIDTH: 100, // pixels
    HUD_GOLD_OFFSET_Y: 100, // pixels - Offset vertical para exibição do gold
    CAMERA_FOLLOW_SPEED: 5
};
