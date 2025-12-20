import { GameConstants } from '../../shared/constants/GameConstants.js';

export const gameConfig = {
    camera: {
        tileSize: GameConstants.TILE_SIZE,
        smooth: true,
        followSpeed: GameConstants.CAMERA_FOLLOW_SPEED
    },
    
    server: {
        url: 'ws://localhost:3000'
    },
    
    debug: {
        enabled: true,
        showFps: true,
        showGrid: false
    }
};
