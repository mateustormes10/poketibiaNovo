/**
 * SpritePlayerList
 * 
 * Catálogo centralizado de sprites de personagens
 * 
 * Estrutura:
 * - Cada personagem tem 4 direções (up, down, left, right)
 * - Cada direção tem 3 frames de animação
 * - Cada frame tem 3 sprites PNG [central, esquerda, acima]
 * - IDs referenciam arquivos em assets/sprites/[ID].png
 * 
 * Ordem das sprites: [central, esquerda, acima]
 * - 1º valor: Sprite central (corpo principal)
 * - 2º valor: Sprite à esquerda (complemento)
 * - 3º valor: Sprite acima (cabeça/camada superior)
 * 
 * Valor 0 indica sprite vazia (não renderizada)
 * 
 * Sincronização:
 * - O visual do player vem do banco (players.lookaddons)
 * - Servidor garante que todos vejam o mesmo visual
 * - Animação é determinística (baseada em frame index)
 */

export const SpritePlayerList = {
    /**
     * Default - Sprite padrão básico
     */
    default: {
        up: [
            [36192, 36193, 36194],    // Frame 0
            [36216, 36217, 36218],    // Frame 1
            [36240, 36241, 36242]     // Frame 2
        ],
        down: [
            [36204, 36205, 36206],    // Frame 0
            [36228, 36229, 36230],    // Frame 1
            [36252, 36253, 36254]     // Frame 2
        ],
        left: [
            [36210, 36211, 36212],    // Frame 0
            [36234, 36235, 36236],    // Frame 1
            [36258, 36259, 36260]     // Frame 2
        ],
        right: [
            [36198, 36199, 36200],    // Frame 0
            [36222, 36223, 36224],    // Frame 1
            [36246, 36247, 36248]     // Frame 2
        ]
    },

    /**
     * Summoner Male - Invocador masculino
     */
    summonerMale: {
        up: [
            [3434, 0, 0],             // Frame 0
            [3435, 0, 0],             // Frame 1
            [3436, 0, 0]              // Frame 2
        ],
        down: [
            [3474, 0, 0],             // Frame 0
            [3475, 0, 0],             // Frame 1
            [3476, 0, 0]              // Frame 2
        ],
        left: [
            [3445, 0, 0],             // Frame 0
            [3534, 0, 0],             // Frame 1
            [3535, 0, 0]              // Frame 2
        ],
        right: [
            [3470, 0, 0],             // Frame 0
            [3471, 0, 0],             // Frame 1
            [3472, 0, 0]              // Frame 2
        ]
    },

    /**
     * Mage Male - Mago masculino
     */
    mageMale: {
        up: [
            [14620, 0, 0],            // Frame 0
            [14621, 0, 0],            // Frame 1
            [14622, 0, 0]             // Frame 2
        ],
        down: [
            [3541, 0, 0],             // Frame 0
            [3542, 0, 0],             // Frame 1
            [14626, 0, 0]             // Frame 2
        ],
        left: [
            [14629, 0, 0],            // Frame 0
            [14630, 0, 0],            // Frame 1
            [14631, 0, 0]             // Frame 2
        ],
        right: [
            [3537, 0, 0],             // Frame 0
            [3538, 0, 0],             // Frame 1
            [14623, 0, 0]             // Frame 2
        ]
    },

    /**
     * Warrior Male - Guerreiro masculino
     */
    warriorMale: {
        up: [
            [14498, 14499, 0],        // Frame 0
            [14500, 14499, 0],        // Frame 1
            [14501, 14502, 0]         // Frame 2
        ],
        down: [
            [14508, 14509, 0],        // Frame 0
            [14510, 14509, 0],        // Frame 1
            [14511, 14512, 0]         // Frame 2
        ],
        left: [
            [14513, 0, 14514],        // Frame 0
            [14515, 0, 14514],        // Frame 1
            [14516, 0, 14517]         // Frame 2
        ],
        right: [
            [14503, 0, 14504],        // Frame 0
            [14505, 0, 14504],        // Frame 1
            [14506, 0, 14504]         // Frame 2
        ]
    },

    /**
     * Maleta Male - Aparência especial com maleta
     */
    maletaMale: {
        up: [
            [47943, 0, 0],            // Frame 0
            [47951, 0, 0],            // Frame 1
            [47959, 0, 0]             // Frame 2
        ],
        down: [
            [47947, 0, 0],            // Frame 0
            [47955, 0, 0],            // Frame 1
            [47963, 0, 0]             // Frame 2
        ],
        left: [
            [47949, 0, 0],            // Frame 0
            [47957, 0, 0],            // Frame 1
            [47965, 0, 0]             // Frame 2
        ],
        right: [
            [47945, 0, 0],            // Frame 0
            [47953, 0, 0],            // Frame 1
            [47961, 0, 0]             // Frame 2
        ]
    }
};

/**
 * Helper para obter sprites de um player
 * @param {string} lookaddons - Tipo de sprite (default, summonerMale, etc)
 * @param {string} direction - Direção (up, down, left, right)
 * @param {number} frameIndex - Frame da animação (0, 1, 2)
 * @returns {Array<number>} Array com 3 IDs de sprites [central, esquerda, acima]
 */
export function getPlayerSprites(lookaddons, direction, frameIndex) {
    const spriteType = SpritePlayerList[lookaddons] || SpritePlayerList.default;
    const directionSprites = spriteType[direction] || spriteType.down;
    const frame = directionSprites[frameIndex % 3] || directionSprites[0];
    return frame;
}

/**
 * Valida se um tipo de sprite existe
 * @param {string} lookaddons - Tipo de sprite
 * @returns {boolean}
 */
export function isValidSpriteType(lookaddons) {
    return SpritePlayerList.hasOwnProperty(lookaddons);
}

/**
 * Retorna lista de todos os tipos de sprites disponíveis
 * @returns {Array<string>}
 */
export function getAvailableSpriteTypes() {
    return Object.keys(SpritePlayerList);
}
