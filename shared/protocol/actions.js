// Eventos enviados pelo CLIENTE
export const ClientEvents = {
    PORTAL: 'portal',
    LOGIN: 'login',
    MOVE: 'move',
    TURN: 'turn',
    ATTACK: 'attack',
    CHAT: 'chat',
    USE_ITEM: 'useItem',
    INTERACT: 'interact',
    CHANGE_FLOOR: 'changeFloor'
};

// Eventos enviados pelo SERVIDOR
export const ServerEvents = {
    CONNECTED: 'connected',
    LOGIN_SUCCESS: 'loginSuccess',
    LOGIN_FAILED: 'loginFailed',
    GAME_STATE: 'gameState',
    PLAYER_MOVE: 'playerMove',
    ENTITY_SPAWN: 'entitySpawn',
    ENTITY_DESPAWN: 'entityDespawn',
    ENTITY_UPDATE: 'entityUpdate',
    ATTACK_RESULT: 'attackResult',
    CHAT_MESSAGE: 'chatMessage',
    ERROR: 'error'
};
