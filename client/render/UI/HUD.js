export class HUD {
    constructor(ctx, canvas, uiManager) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.uiManager = uiManager;
        this.pokemonListBounds = []; // Para detectar cliques
        this.playerInfoBounds = null;
        this.battleViewBounds = null;
    }
    
    render(gameState) {
        this.renderPlayerInfo(gameState.localPlayer);
        this.renderPokemonList(gameState.localPlayer);
        this.renderBattleView(gameState);
        this.renderDebugInfo(gameState);
    }
    
    checkPokemonClick(mouseX, mouseY) {
        // Não permite clicar em pokémons se estiver em modo de edição
        if (this.uiManager.isEditMode()) return null;
        
        for (const bound of this.pokemonListBounds) {
            if (mouseX >= bound.x && mouseX <= bound.x + bound.width &&
                mouseY >= bound.y && mouseY <= bound.y + bound.height) {
                return bound.pokemon;
            }
        }
        return null;
    }
    
    handleMouseDown(mouseX, mouseY) {
        if (!this.uiManager.isEditMode()) return false;
        
        // Tenta arrastar playerInfo
        if (this.playerInfoBounds && this.uiManager.startDrag('playerInfo', mouseX, mouseY, this.playerInfoBounds)) {
            return true;
        }
        
        // Tenta arrastar pokemonList
        if (this.pokemonListFullBounds && this.uiManager.startDrag('pokemonList', mouseX, mouseY, this.pokemonListFullBounds)) {
            return true;
        }
        
        // Tenta arrastar battleView
        if (this.battleViewBounds && this.uiManager.startDrag('battleView', mouseX, mouseY, this.battleViewBounds)) {
            return true;
        }
        
        return false;
    }
    
    renderPlayerInfo(player) {
        if (!player) return;
        
        const pos = this.uiManager.getPosition('playerInfo');
        const x = pos.x !== null ? pos.x : 10;
        const y = pos.y !== null ? pos.y : 10;
        const width = 200;
        const height = 100;
        
        // Salva bounds para drag
        this.playerInfoBounds = { x, y, width, height };
        
        // Borda de edição
        if (this.uiManager.isEditMode()) {
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, width, height);
        }
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x, y, width, height);
        
        // Margem interna alinhada
        const marginX = x + 10;
        
        // Player info
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Name: ${player.name || 'Player'}`, marginX, y + 20);
        this.ctx.fillText(`Level: ${player.level || 1}`, marginX, y + 40);
        
        // Barra de vida
        const barY = y + 50;
        const barWidth = 180;
        const barHeight = 20;
        const hpPercent = (player.hp || 0) / (player.maxHp || 1);
        
        // Borda da barra
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(marginX, barY, barWidth, barHeight);
        
        // Fundo da barra (vermelho)
        this.ctx.fillStyle = '#cc0000';
        this.ctx.fillRect(marginX + 1, barY + 1, barWidth - 2, barHeight - 2);
        
        // HP atual (verde)
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(marginX + 1, barY + 1, (barWidth - 2) * hpPercent, barHeight - 2);
        
        // Texto HP no centro da barra
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        const hpText = `${player.hp || 0} / ${player.maxHp || 0}`;
        this.ctx.strokeText(hpText, marginX + barWidth / 2, barY + barHeight / 2 + 4);
        this.ctx.fillText(hpText, marginX + barWidth / 2, barY + barHeight / 2 + 4);
        
        // Posição (alinhada à esquerda novamente)
        this.ctx.textAlign = 'left';
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#cccccc';
        this.ctx.fillText(`Pos: ${player.x}, ${player.y}, ${player.z}`, marginX, y + 90);
    }
    
    renderPokemonList(player) {
        if (!player) return;
        
        this.pokemonListBounds = []; // Reset bounds
        
        const pos = this.uiManager.getPosition('pokemonList');
        const x = pos.x !== null ? pos.x : 10;
        const y = pos.y !== null ? pos.y : 120;
        const itemHeight = 60;
        const listWidth = 200;
        const maxSlots = 6; // Máximo de 6 pokémons
        const totalHeight = maxSlots * itemHeight + 30;
        
        const pokemons = player.pokemons || [];
        
        // Salva bounds completos para drag
        this.pokemonListFullBounds = { x, y, width: listWidth, height: totalHeight };
        
        // Borda de edição
        if (this.uiManager.isEditMode()) {
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, listWidth, totalHeight);
        }
        
        // Background da lista
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x, y, listWidth, totalHeight);
        
        // Título
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillText(`Pokémons (${pokemons.length}/${maxSlots}):`, x + 10, y + 20);
        
        // Renderiza 6 slots (preenchidos ou vazios)
        for (let i = 0; i < maxSlots; i++) {
            const pokemon = pokemons[i];
            const itemY = y + 30 + (i * itemHeight);
            const itemX = x + 5;
            
            // Background do item
            this.ctx.fillStyle = pokemon ? 'rgba(50, 50, 50, 0.5)' : 'rgba(30, 30, 30, 0.3)';
            this.ctx.fillRect(itemX, itemY, listWidth - 10, itemHeight - 5);
            
            if (pokemon) {
                // Pokémon existente
                // Nome do pokémon
                this.ctx.font = 'bold 12px Arial';
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillText(pokemon.name || 'Unknown', itemX + 10, itemY + 15);
                
                // HP do pokémon
                const hpBarX = itemX + 10;
                const hpBarY = itemY + 25;
                const hpBarWidth = listWidth - 30;
                const hpBarHeight = 15;
                const hpPercent = (pokemon.hp || 0) / (pokemon.maxHp || 1);
                
                // Borda
                this.ctx.strokeStyle = '#333333';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
                
                // Fundo vermelho
                this.ctx.fillStyle = '#cc0000';
                this.ctx.fillRect(hpBarX + 1, hpBarY + 1, hpBarWidth - 2, hpBarHeight - 2);
                
                // HP atual verde
                this.ctx.fillStyle = '#00ff00';
                this.ctx.fillRect(hpBarX + 1, hpBarY + 1, (hpBarWidth - 2) * hpPercent, hpBarHeight - 2);
                
                // Texto HP
                this.ctx.font = '10px Arial';
                this.ctx.fillStyle = '#ffffff';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`${pokemon.hp || 0}/${pokemon.maxHp || 0}`, hpBarX + hpBarWidth / 2, hpBarY + hpBarHeight / 2 + 3);
                this.ctx.textAlign = 'left';
                
                // Salva bounds para detecção de clique
                this.pokemonListBounds.push({
                    x: itemX,
                    y: itemY,
                    width: listWidth - 10,
                    height: itemHeight - 5,
                    pokemon: pokemon
                });
            } else {
                // Slot vazio
                this.ctx.font = 'italic 12px Arial';
                this.ctx.fillStyle = '#666666';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Slot vazio', itemX + (listWidth - 10) / 2, itemY + itemHeight / 2);
                this.ctx.textAlign = 'left';
            }
        }
    }
    
    getDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    renderBattleView(gameState) {
        if (!gameState.localPlayer) return;
        
        const pos = this.uiManager.getPosition('battleView');
        const width = 250;
        const x = pos.x !== null ? pos.x : this.canvas.width - width - 10;
        const y = pos.y !== null ? pos.y : 100;
        const itemHeight = 40;
        const maxVisible = 10; // Máximo de entidades visíveis
        
        // Coleta entidades próximas (exceto o próprio player)
        const nearbyEntities = [];
        
        // Players próximos
        gameState.players.forEach(player => {
            if (player.id !== gameState.localPlayer.id) {
                const distance = this.getDistance(
                    gameState.localPlayer.x, gameState.localPlayer.y,
                    player.x, player.y
                );
                nearbyEntities.push({
                    type: 'Player',
                    name: player.name,
                    level: player.level,
                    hp: player.hp,
                    maxHp: player.maxHp,
                    distance: distance.toFixed(1),
                    x: player.x,
                    y: player.y
                });
            }
        });
        
        // Monsters/Pokémons próximos
        gameState.monsters.forEach(monster => {
            const distance = this.getDistance(
                gameState.localPlayer.x, gameState.localPlayer.y,
                monster.x, monster.y
            );
            nearbyEntities.push({
                type: 'Monster',
                name: monster.name || 'Monster',
                level: monster.level || 1,
                hp: monster.hp,
                maxHp: monster.maxHp,
                distance: distance.toFixed(1),
                x: monster.x,
                y: monster.y
            });
        });
        
        // NPCs próximos
        gameState.npcs.forEach(npc => {
            const distance = this.getDistance(
                gameState.localPlayer.x, gameState.localPlayer.y,
                npc.x, npc.y
            );
            nearbyEntities.push({
                type: 'NPC',
                name: npc.name || 'NPC',
                level: npc.level || 1,
                hp: npc.hp,
                maxHp: npc.maxHp,
                distance: distance.toFixed(1),
                x: npc.x,
                y: npc.y
            });
        });
        
        // Ordena por distância e limita a 10
        nearbyEntities.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
        const visibleEntities = nearbyEntities.slice(0, maxVisible);
        
        const totalHeight = Math.max(visibleEntities.length * itemHeight, 100) + 30;
        
        // Salva bounds para drag
        this.battleViewBounds = { x, y, width, height: totalHeight };
        
        // Borda de edição
        if (this.uiManager.isEditMode()) {
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, width, totalHeight);
        }
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x, y, width, totalHeight);
        
        // Título
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillStyle = '#ff6600';
        this.ctx.fillText(`Battle View (${nearbyEntities.length}):`, x + 10, y + 20);
        
        // Lista de entidades
        if (visibleEntities.length === 0) {
            this.ctx.font = 'italic 12px Arial';
            this.ctx.fillStyle = '#666666';
            this.ctx.fillText('Nenhuma entidade próxima', x + 10, y + 50);
        } else {
            visibleEntities.forEach((entity, index) => {
                const itemY = y + 30 + (index * itemHeight);
                const itemX = x + 5;
                
                // Background do item
                const bgColor = entity.type === 'Player' ? 'rgba(0, 100, 0, 0.3)' : 
                               entity.type === 'Monster' ? 'rgba(100, 0, 0, 0.3)' : 
                               'rgba(0, 0, 100, 0.3)';
                this.ctx.fillStyle = bgColor;
                this.ctx.fillRect(itemX, itemY, width - 10, itemHeight - 5);
                
                // Tipo e Nome
                this.ctx.font = 'bold 11px Arial';
                this.ctx.fillStyle = entity.type === 'Player' ? '#00ff00' : 
                                    entity.type === 'Monster' ? '#ff4444' : 
                                    '#4444ff';
                this.ctx.fillText(`[${entity.type}] ${entity.name}`, itemX + 8, itemY + 14);
                
                // Level e Distância
                this.ctx.font = '10px Arial';
                this.ctx.fillStyle = '#cccccc';
                this.ctx.fillText(`Lvl ${entity.level} | Dist: ${entity.distance}`, itemX + 8, itemY + 28);
                
                // HP Bar (se tiver)
                if (entity.hp !== undefined && entity.maxHp) {
                    const hpBarX = itemX + 120;
                    const hpBarY = itemY + 20;
                    const hpBarWidth = 100;
                    const hpBarHeight = 10;
                    const hpPercent = entity.hp / entity.maxHp;
                    
                    // Borda
                    this.ctx.strokeStyle = '#333333';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
                    
                    // Fundo vermelho
                    this.ctx.fillStyle = '#660000';
                    this.ctx.fillRect(hpBarX + 1, hpBarY + 1, hpBarWidth - 2, hpBarHeight - 2);
                    
                    // HP atual
                    this.ctx.fillStyle = '#00ff00';
                    this.ctx.fillRect(hpBarX + 1, hpBarY + 1, (hpBarWidth - 2) * hpPercent, hpBarHeight - 2);
                    
                    // Texto HP
                    this.ctx.font = '9px Arial';
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(`${entity.hp}/${entity.maxHp}`, hpBarX + hpBarWidth / 2, hpBarY + hpBarHeight / 2 + 3);
                    this.ctx.textAlign = 'left';
                }
            });
        }
    }
    
    renderDebugInfo(gameState) {
        const padding = 10;
        const x = this.canvas.width - 200;
        const y = padding;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x, y, 190, 60);
        
        // Debug info
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`Players: ${gameState.players.size}`, x + 10, y + 20);
        this.ctx.fillText(`NPCs: ${gameState.npcs.size}`, x + 10, y + 35);
        this.ctx.fillText(`Monsters: ${gameState.monsters.size}`, x + 10, y + 50);
    }
}
