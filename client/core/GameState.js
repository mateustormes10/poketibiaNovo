import { Player } from '../entities/Player.js';
import { Npc } from '../entities/Npc.js';
import { Monster } from '../entities/Monster.js';
import { GameMap } from '../map/Map.js';

export class GameState {
    constructor() {
        this.localPlayer = null;
        this.players = new Map(); // Map nativo ES6 para players
        this.npcs = new Map(); // Map nativo ES6 para npcs
        this.monsters = new Map(); // Map nativo ES6 para monsters
        this.items = new Map(); // Map nativo ES6 para items
        this.map = new GameMap(64); // Mapa de tiles com 64
        this.tick = 0;
    }
    
    update(serverState) {
        if (serverState.tick) {
            this.tick = serverState.tick;
        }

        // Atualiza mapa principal
        if (serverState.map) {
            this.map.updateFromServer(serverState.map);
        }

        // Salva mapUp/mapDown/mapDown2 recebidos do servidor para uso no Renderer
        if (serverState.mapUp) {
            this.mapUp = serverState.mapUp;
        } else {
            this.mapUp = null;
        }
        if (serverState.mapDown) {
            this.mapDown = serverState.mapDown;
        } else {
            this.mapDown = null;
        }
        if (serverState.mapDown2) {
            this.mapDown2 = serverState.mapDown2;
        } else {
            this.mapDown2 = null;
        }

        if (serverState.players) {
            this.updatePlayers(serverState.players);
        }

        if (serverState.npcs) {
            this.updateNpcs(serverState.npcs);
        }

        if (serverState.monsters) {
            this.updateMonsters(serverState.monsters);
        }
    }
    
    updatePlayers(players) {
        // Atualiza ou adiciona players recebidos
        const receivedIds = new Set();
        players.forEach(playerData => {
            let player = this.players.get(playerData.id);
            if (!player) {
                player = new Player(playerData);
                this.players.set(playerData.id, player);
            } else {
                player.update(playerData);
            }
            receivedIds.add(playerData.id);
            // Sempre tenta identificar o localPlayer pelo isLocal ou pelo id igual ao antigo localPlayer
            if (playerData.isLocal || (this.localPlayer && playerData.id === this.localPlayer.id)) {
                this.localPlayer = player;
            }
        });
        // Remove players que não vieram do servidor (deslogados)
        for (let id of this.players.keys()) {
            if (!receivedIds.has(id)) {
                this.players.delete(id);
            }
        }
    }
    
    updateNpcs(npcs) {
        npcs.forEach(npcData => {
            let npc = this.npcs.get(npcData.id);
            
            if (!npc) {
                npc = new Npc(npcData);
                this.npcs.set(npcData.id, npc);
            } else {
                npc.update(npcData);
            }
        });
    }
    
    updateMonsters(monsters) {
        const receivedIds = new Set();
        monsters.forEach(monsterData => {
            let monster = this.monsters.get(monsterData.id);
            if (monsterData.hp <= 0) {
                // Remove do mapa se estiver morto
                if (monster) this.monsters.delete(monsterData.id);
                return;
            }
            if (!monster) {
                monster = new Monster(monsterData);
                this.monsters.set(monsterData.id, monster);
            } else {
                monster.update(monsterData);
            }
            receivedIds.add(monsterData.id);
        });
        // Remove monstros que não vieram do servidor (despawns)
        for (let id of this.monsters.keys()) {
            if (!receivedIds.has(id)) {
                this.monsters.delete(id);
            }
        }
        // Limpa todos os monstros mortos (hp <= 0) do mapa
        for (let [id, monster] of this.monsters.entries()) {
            if (monster.hp <= 0) {
                this.monsters.delete(id);
            }
        }
    }
    
    updatePlayerPosition(data) {
        const player = this.players.get(data.playerId);
        if (player) {
            // Usa o método startMove para interpolação suave
            if (player.startMove) {
                player.startMove(data.x, data.y);
            } else {
                player.x = data.x;
                player.y = data.y;
            }
            if (data.z !== undefined) player.z = data.z;
            if (data.direction) player.direction = data.direction;
        }
    }
    
    interpolate(deltaTime) {
        // Interpola todos os players
        this.players.forEach(player => {
            if (player.interpolate) {
                player.interpolate(deltaTime);
            }
        });
        
        // Interpola NPCs
        this.npcs.forEach(npc => {
            if (npc.interpolate) {
                npc.interpolate(deltaTime);
            }
        });
        
        // Interpola monstros
        this.monsters.forEach(monster => {
            if (monster.interpolate) {
                monster.interpolate(deltaTime);
            }
        });
    }
    
    /**
     * Retorna entidades visíveis na câmera, podendo filtrar por múltiplos andares (zsVisiveis).
     * @param {Camera} camera
     * @param {number[]} [zsVisiveis] - Lista de andares visíveis (opcional)
     */
    getEntitiesInView(camera, zsVisiveis) {
        const entities = [];
        this.players.forEach(player => {
            if (this.isInView(player, camera, zsVisiveis)) {
                entities.push({ ...player, type: 'player' });
            }
        });
        this.npcs.forEach(npc => {
            if (this.isInView(npc, camera, zsVisiveis)) {
                entities.push({ ...npc, type: 'npc' });
            }
        });
        // Só adiciona monstros vivos!
        this.monsters.forEach(monster => {
            if (!monster.isDead && this.isInView(monster, camera, zsVisiveis)) {
                entities.push({ ...monster, type: 'monster' });
            }
        });
        return entities;
    }

    /**
     * Verifica se a entidade está visível na câmera e em um dos andares permitidos.
     * @param {object} entity
     * @param {Camera} camera
     * @param {number[]} [zsVisiveis]
     */
    isInView(entity, camera, zsVisiveis) {
        // Checa se está em um dos andares visíveis
        if (Array.isArray(zsVisiveis)) {
            if (!zsVisiveis.includes(entity.z)) return false;
        } else {
            if (entity.z !== camera.z) return false;
        }
        // Checa se está dentro do viewport
        const viewport = camera.getViewport();
        return (
            entity.x >= Math.floor(viewport.x / camera.tileSize) &&
            entity.x <= Math.floor((viewport.x + viewport.width) / camera.tileSize) &&
            entity.y >= Math.floor(viewport.y / camera.tileSize) &&
            entity.y <= Math.floor((viewport.y + viewport.height) / camera.tileSize)
        );
    }
}
