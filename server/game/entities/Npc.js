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
        return Math.abs(player.x - this.x) <= 1 &&
               Math.abs(player.y - this.y) <= 1 &&
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
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            x: this.x,
            y: this.y,
            z: this.z,
            sprite: this.sprite
        };
    }
}
