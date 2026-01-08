import { GameConstants } from '../../../shared/constants/GameConstants.js';

export class Npc {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.type = data.type; // 'shop', 'heal', 'quest', etc
        this.x = data.x;
        this.y = data.y;
        this.z = data.z;
        this.sprite = data.sprite || 0;
        this.worldId = data.worldId || 0;
    }

    /**
     * Verifica se um player está próximo do NPC
     */
    isPlayerNear(player) {
        return Math.abs(player.x - this.x) <= GameConstants.NPC_INTERACTION_RANGE &&
               Math.abs(player.y - this.y) <= GameConstants.NPC_INTERACTION_RANGE &&
               player.z === this.z;
    }

    /**
     * Update do NPC (NPCs são estáticos, mas precisa existir para o GameWorld)
     */
    update(deltaTime) {
        // NPCs são estáticos, não fazem nada no update
    }

    /**
     * Converte para formato de envio ao client
     */
    toClientData() {
        // Define sprite/outfit fixa para NPCs conhecidos
        let sprite = this.sprite;
        if (this.type === 'nurse' || this.name?.toLowerCase().includes('enfermeira')) sprite = 'mageFemale';
        if (this.type === 'vendor' || this.name?.toLowerCase().includes('vendedor')) sprite = 'mageFemale';
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            x: this.x,
            y: this.y,
            z: this.z,
            sprite
        };
    }
}
