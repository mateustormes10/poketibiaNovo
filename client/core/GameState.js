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

        // Salva mapUp/mapDown recebidos do servidor para uso no Renderer
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
        players.forEach(playerData => {
            let player = this.players.get(playerData.id);
            if (!player) {
                player = new Player(playerData);
                this.players.set(playerData.id, player);
            } else {
                player.update(playerData);
            }
            // Sempre tenta identificar o localPlayer pelo isLocal ou pelo id igual ao antigo localPlayer
            if (playerData.isLocal || (this.localPlayer && playerData.id === this.localPlayer.id)) {
                this.localPlayer = player;
            }
        });
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
        monsters.forEach(monsterData => {
            let monster = this.monsters.get(monsterData.id);
            
            if (!monster) {
                monster = new Monster(monsterData);
                this.monsters.set(monsterData.id, monster);
            } else {
                monster.update(monsterData);
            }
        });
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

            // LOG: sprites do tile atual do player
            // const map = window.game?.gameState?.map || this.map;
            // if (map) {
            //     const tile = map.getTile(player.x, player.y, player.z);
            //     if (tile && tile.spriteIds) {
            //         console.log(`[CLIENT LOG SPRITES] Player ${player.name} (${player.x},${player.y},${player.z}) sprites:`, tile.spriteIds);
            //     } else {
            //         console.log(`[CLIENT LOG SPRITES] Player ${player.name} (${player.x},${player.y},${player.z}) sem tile ou sprites.`);
            //     }
            // }
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
    
    getEntitiesInView(camera) {
        const entities = [];
        
        this.players.forEach(player => {
            if (this.isInView(player, camera)) {
                entities.push({ ...player, type: 'player' });
            }
        });
        
        this.npcs.forEach(npc => {
            if (this.isInView(npc, camera)) {
                entities.push({ ...npc, type: 'npc' });
            }
        });
        
        this.monsters.forEach(monster => {
            if (this.isInView(monster, camera)) {
                entities.push({ ...monster, type: 'monster' });
            }
        });
        
        return entities;
    }
    
    isInView(entity, camera) {
        return entity.z === camera.z;
    }
}
