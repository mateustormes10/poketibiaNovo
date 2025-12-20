/**
 * WildPokemonProtocol
 * 
 * Protocolo de comunicação para Pokémon selvagens
 */

// Eventos enviados pelo CLIENTE
export const WildPokemonClientEvents = {
    REQUEST_WILD_POKEMON_LIST: 'request_wild_pokemon_list'
};

// Eventos enviados pelo SERVIDOR
export const WildPokemonServerEvents = {
    WILD_POKEMON_LIST: 'wild_pokemon_list',
    WILD_POKEMON_SPAWN: 'wild_pokemon_spawn',
    WILD_POKEMON_UPDATE: 'wild_pokemon_update',
    WILD_POKEMON_DESPAWN: 'wild_pokemon_despawn'
};

// Estados de comportamento
export const WildPokemonState = {
    IDLE: 'idle',           // Parado, player longe
    ROAMING: 'roaming',     // Andando, player no raio de movimento
    ENGAGE: 'engage'        // Agressivo, player no raio de ataque
};

// Configurações
export const WildPokemonConfig = {
    ATTACK_RANGE_DEFAULT: 2,      // tiles
    MOVE_RANGE_MULTIPLIER: 2,     // moveRange = attackRange * 2
    UPDATE_INTERVAL: 1000,        // ms entre updates de comportamento
    MOVEMENT_SPEED: 500           // ms entre movimentos
};
