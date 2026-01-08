import { Logger } from '../utils/Logger.js';
const logger = new Logger('OutfitHandler');

export async function handleChangeOutfit(clientState, data) {
    const { lookaddons } = data;
    
    if (!clientState || !clientState.player) {
        logger.error('[OutfitHandler] Cliente não está autenticado');
        return;
    }
    
    const player = clientState.player;
    
    // Valida se o lookaddons é válido
    const validOutfits = ['default', 'summonerMale', 'mageMale', 'warriorMale', 'maletaMale'];
    if (!validOutfits.includes(lookaddons)) {
        logger.warn(`[OutfitHandler] Outfit inválido: ${lookaddons}`);
        clientState.send('outfit_changed', {
            success: false,
            message: 'Aparência inválida'
        });
        return;
    }
    
    try {
        // Atualiza a sprite do player
        player.sprite = lookaddons;
        
        // Salva no banco de dados (usando gameWorld)
        if (clientState.gameWorld && clientState.gameWorld.playerRepository) {
            await clientState.gameWorld.playerRepository.updatePlayerOutfit(player.id, lookaddons);
        }
        
        logger.info(`[OutfitHandler] ${player.name} trocou para outfit: ${lookaddons}`);
        
        // Confirma para o cliente
        clientState.send('outfit_changed', {
            success: true,
            lookaddons: lookaddons,
            message: `Aparência alterada para: ${lookaddons}`
        });

        // Envia GAME_STATE atualizado para garantir que pokemons e outros campos estejam sincronizados
        if (clientState.gameWorld) {
            const gameState = clientState.gameWorld.getGameState(player);
            clientState.send('GAME_STATE', gameState);
        }
        
        // Notifica outros jogadores (broadcast da mudança visual)
        if (clientState.gameWorld) {
            // Usa o mesmo range de visão do getGameState
            const visionRange = 24;
            const playersInRange = clientState.gameWorld.getPlayersInArea(player.x, player.y, player.z, visionRange);
            playersInRange.forEach(otherPlayer => {
                if (otherPlayer.id !== player.id && otherPlayer.clientState) {
                    otherPlayer.clientState.send('player_outfit_update', {
                        playerId: player.id,
                        lookaddons: lookaddons
                    });
                }
            });
        }
        
    } catch (error) {
        logger.error('[OutfitHandler] Erro ao trocar outfit:', error);
        clientState.send('outfit_changed', {
            success: false,
            message: 'Erro ao alterar aparência'
        });
    }
}
