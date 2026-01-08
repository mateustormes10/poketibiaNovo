import { CombatSystem } from '../game/systems/CombatSystem.js';
import { ServerEvents } from '../../shared/protocol/actions.js';

export class CombatHandler {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
        this.combatSystem = new CombatSystem(gameWorld);
    }
    
    handleAttack(client, data) {
        if (!client.player) return;
        
        const { targetId } = data;
        const target = this.gameWorld.getPlayer(targetId) || 
                      this.gameWorld.monsters.get(targetId);
        
        if (!target) return;
        
        const result = this.combatSystem.attack(client.player, target);
        
        if (result.success) {
            // Notifica atacante
            client.send(ServerEvents.ATTACK_RESULT, result);
            
            // Notifica alvo se for player
            if (target.type === 'player') {
                // TODO: Enviar para o cliente do target
            }
            
            // TODO: Broadcast para jogadores próximos
        }
    }
}
