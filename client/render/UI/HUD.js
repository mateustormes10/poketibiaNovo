import { GameConstants } from '../../../shared/constants/GameConstants.js';
import { PokemonSkillsUI } from './PokemonSkillsUI.js';

export class HUD {
    constructor(ctx, canvas, uiManager) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.uiManager = uiManager;
        this.pokemonListBounds = []; // Para detectar cliques
        this.playerInfoBounds = null;
        this.battleViewBounds = null;
        this.battleViewScrollOffset = 0; // Offset do scroll
        this.battleViewMaxScroll = 0; // Máximo que pode scrollar

        // Estado de seleção de pokémon
        this.pokemonSelectionActive = false;
        this.selectedPokemonIndex = 0;

        this.pokemonSkillsUI = new PokemonSkillsUI(ctx, uiManager);
        this.pokemonSkillsPanelBounds = null;
    }
                handleBattleViewClick(mouseX, mouseY) {
                if (!this.battleViewFilterButtons) return false;
                for (const btn of this.battleViewFilterButtons) {
                    if (
                        mouseX >= btn.x && mouseX <= btn.x + btn.width &&
                        mouseY >= btn.y && mouseY <= btn.y + btn.height
                    ) {
                        this.battleViewFilter = btn.value;
                        this.battleViewScrollOffset = 0; // Reseta scroll ao trocar filtro
                        return true;
                    }
                }
                return false;
            }

    activatePokemonSelection() {
        this.pokemonSelectionActive = true;
        this.selectedPokemonIndex = 0;
    }
    deactivatePokemonSelection() {
        this.pokemonSelectionActive = false;
    }
    movePokemonSelection(delta, max) {
        if (!this.pokemonSelectionActive) return;
        this.selectedPokemonIndex += delta;
        if (this.selectedPokemonIndex < 0) this.selectedPokemonIndex = 0;
        if (this.selectedPokemonIndex >= max) this.selectedPokemonIndex = max - 1;
    }
    getSelectedPokemon(player) {
        if (!this.pokemonSelectionActive) return null;
        const pokemons = player.pokemons || [];
        return pokemons[this.selectedPokemonIndex] || null;
    }
    
    render(gameState, wildPokemonManager = null) {
        this.renderPlayerInfo(gameState.localPlayer);
        this.renderPokemonList(gameState.localPlayer);
        this.renderBattleView(gameState, wildPokemonManager);
        this.renderDebugInfo(gameState, wildPokemonManager);
        // Renderiza painel de skills se estiver transformado em pokémon
        const player = gameState.localPlayer;
        if (player && player.pokemonName && Array.isArray(player.skills) && player.skills.length > 0) {
            this.pokemonSkillsUI.show(player.skills.slice(0, 12));
        } else {
            this.pokemonSkillsUI.hide();
        }
        // Garante que o callback nunca seja perdido
        if (typeof window.game !== 'undefined' && window.game.animateSkillAroundPlayer) {
            // Não sobrescreve mais o onSkillClick aqui!
        }
        this.pokemonSkillsUI.render();
        // Atualiza bounds para drag
        const pos = this.uiManager.getPosition('pokemonSkillsPanel');
        this.pokemonSkillsPanelBounds = { x: pos.x, y: pos.y, width: 320, height: 180 };
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
    checkPokemonClick(mouseX, mouseY, player, wsClient) {
        for (const bound of this.pokemonListBounds) {
            if (mouseX >= bound.x && mouseX <= bound.x + bound.width &&
                mouseY >= bound.y && mouseY <= bound.y + bound.height) {
                if (bound.isReturnPlayer) {
                    // Voltar a ser player
                    if (wsClient) wsClient.send('request_transform_pokemon', { pokemonName: null });
                    return null;
                }
                // Ao clicar, solicita ao servidor a transformação do player nesse pokémon
                if (player && wsClient && bound.pokemon && bound.pokemon.name) {
                    wsClient.send('request_transform_pokemon', { pokemonName: bound.pokemon.name });
                }
                return bound.pokemon;
            }
        }
        return null;
    }
    
    handleMouseDown(mouseX, mouseY) {
        // Permite clique nos filtros do Battle View mesmo fora do modo de edição
        if (this.handleBattleViewClick(mouseX, mouseY)) return true;

        // Clique em skill do painel de skills do Pokémon
        if (this.pokemonSkillsUI && this.pokemonSkillsUI.handleMouseDown(mouseX, mouseY)) {
            return true;
        }

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

        // Tenta arrastar painel de skills do Pokémon
        if (this.pokemonSkillsPanelBounds && this.uiManager.startDrag('pokemonSkillsPanel', mouseX, mouseY, this.pokemonSkillsPanelBounds)) {
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
        const height = 115; // Aumentado para caber o gold
        
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
        this.ctx.fillText(`Pos: ${player.x}, ${player.y}, ${player.z}`, marginX, y + 85);
        
        // Gold Coin (balance)
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillStyle = '#FFD700'; // Cor dourada
        const goldText = `Gold: ${player.goldCoin || 0}`;
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(goldText, marginX, y + GameConstants.HUD_GOLD_OFFSET_Y);
        this.ctx.fillText(goldText, marginX, y + GameConstants.HUD_GOLD_OFFSET_Y);
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

            // Quadrado vermelho se selecionado
            if (this.pokemonSelectionActive && this.selectedPokemonIndex === i) {
                this.ctx.save();
                this.ctx.strokeStyle = '#ff2222';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(itemX + 1.5, itemY + 1.5, listWidth - 13, itemHeight - 8);
                this.ctx.restore();
            }

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
        // Adiciona botão 'Voltar a ser player' se estiver transformado
        if (player && player.pokemonName) {
            const bx = x + 10, by = y + totalHeight + 10, bwidth = listWidth - 20, bheight = 32;
            this.ctx.save();
            this.ctx.fillStyle = '#d33';
            this.ctx.fillRect(bx, by, bwidth, bheight);
            this.ctx.font = '16px Arial';
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Voltar a ser player', bx + bwidth / 2, by + 22);
            this.ctx.restore();
            // Salva bounds para clique
            this.pokemonListBounds.push({ x: bx, y: by, width: bwidth, height: bheight, isReturnPlayer: true });
        }
    }
    
    getDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    /**
     * Método para lidar com scroll do Battle View
     */
    handleBattleViewScroll(mouseX, mouseY, deltaY) {
        if (!this.battleViewBounds) return false;
        
        // Verifica se o mouse está sobre o Battle View
        const { x, y, width, height } = this.battleViewBounds;
        if (mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height) {
            // Atualiza offset do scroll
            this.battleViewScrollOffset += deltaY * 0.5; // Velocidade do scroll
            
            // Limita o scroll
            this.battleViewScrollOffset = Math.max(0, Math.min(this.battleViewScrollOffset, this.battleViewMaxScroll));
            
            return true; // Evento consumido
        }
        
        return false;
    }
    
    renderBattleView(gameState, wildPokemonManager = null) {
        if (!gameState.localPlayer) return;
        const pos = this.uiManager.getPosition('battleView');
        const width = 220; // reduced width
        const x = pos.x !== null ? pos.x : this.canvas.width - width - 10;
        const y = pos.y !== null ? pos.y : 100;
        const itemHeight = 28; // reduced height for each entity row
        const maxVisible = 10;
        const maxDistance = 15;

        // Filtro de entidades
        const filterTypes = [
            { label: 'Todos', value: 'all' },
            { label: 'Monstros', value: 'Monster' },
            { label: 'NPCs', value: 'NPC' },
            { label: 'Players', value: 'Player' }
        ];
        this.battleViewFilterButtons = [];
        const buttonWidth = 44; // smaller filter buttons
        const buttonHeight = 16;
        const buttonSpacing = 5;
        let bx = x + 10;
        let by = y + 2;
        filterTypes.forEach((ft, idx) => {
            this.battleViewFilterButtons.push({
                x: bx,
                y: by,
                width: buttonWidth,
                height: buttonHeight,
                value: ft.value
            });
            bx += buttonWidth + buttonSpacing;
        });

        // Coleta entidades próximas (exceto o próprio player)
        let nearbyEntities = [];
        // Players próximos
        gameState.players.forEach(player => {
            if (player.id !== gameState.localPlayer.id) {
                const dx = Math.abs(gameState.localPlayer.x - player.x);
                const dy = Math.abs(gameState.localPlayer.y - player.y);
                const distance = Math.max(dx, dy);
                if (distance <= maxDistance && gameState.localPlayer.z === player.z) {
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
            }
        });
        // Monsters/Pokémons próximos
        gameState.monsters.forEach(monster => {
            const dx = Math.abs(gameState.localPlayer.x - monster.x);
            const dy = Math.abs(gameState.localPlayer.y - monster.y);
            const distance = Math.max(dx, dy);
            if (distance <= maxDistance && gameState.localPlayer.z === monster.z) {
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
            }
        });
        // NPCs próximos
        gameState.npcs.forEach(npc => {
            const dx = Math.abs(gameState.localPlayer.x - npc.x);
            const dy = Math.abs(gameState.localPlayer.y - npc.y);
            const distance = Math.max(dx, dy);
            if (distance <= maxDistance && gameState.localPlayer.z === npc.z) {
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
            }
        });
        // Wild Pokémon próximos
        if (wildPokemonManager) {
            const wildPokemons = wildPokemonManager.getAll();
            wildPokemons.forEach(wildPokemon => {
                const dx = Math.abs(gameState.localPlayer.x - wildPokemon.x);
                const dy = Math.abs(gameState.localPlayer.y - wildPokemon.y);
                const distance = Math.max(dx, dy);
                if (distance <= maxDistance && gameState.localPlayer.z === wildPokemon.z) {
                    nearbyEntities.push({
                        type: 'Monster',
                        name: wildPokemon.name,
                        level: wildPokemon.level,
                        hp: wildPokemon.hp,
                        maxHp: wildPokemon.maxHp,
                        distance: distance.toFixed(1),
                        x: wildPokemon.x,
                        y: wildPokemon.y
                    });
                }
            });
        }
        // Aplica filtro
        if (this.battleViewFilter !== 'all') {
            nearbyEntities = nearbyEntities.filter(e => e.type === this.battleViewFilter);
        }
        // Ordena por distância
        nearbyEntities.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
        
        // Configurações de scroll
        const maxVisibleItems = 6; // show more entities at once
        const headerHeight = 30; // reduced header
        const maxViewportHeight = maxVisibleItems * itemHeight;
        const contentHeight = nearbyEntities.length * itemHeight;
        const viewportHeight = Math.min(maxViewportHeight, contentHeight);
        const totalHeight = headerHeight + viewportHeight;
        const scrollbarWidth = 8;

        // Salva bounds para drag e scroll
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

        // Botões de filtro visuais
        filterTypes.forEach((ft, idx) => {
            const btn = this.battleViewFilterButtons[idx];
            // Fundo do botão
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 7);
            this.ctx.fillStyle = (this.battleViewFilter === ft.value) ? '#ff6600' : '#222';
            this.ctx.shadowColor = (this.battleViewFilter === ft.value) ? '#ff6600' : '#000';
            this.ctx.shadowBlur = (this.battleViewFilter === ft.value) ? 8 : 2;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            // Borda
            this.ctx.lineWidth = (this.battleViewFilter === ft.value) ? 2 : 1;
            this.ctx.strokeStyle = (this.battleViewFilter === ft.value) ? '#fff' : '#444';
            this.ctx.stroke();
            this.ctx.restore();
            // Texto
            this.ctx.font = 'bold 12px Arial';
            this.ctx.fillStyle = (this.battleViewFilter === ft.value) ? '#fff' : '#aaa';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(ft.label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 5);
        });
        this.ctx.textAlign = 'left';

        // Título
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillStyle = '#ff6600';
        this.ctx.fillText(`Battle View (${nearbyEntities.length}):`, x + 10, y + 24);

        // Scroll
        this.battleViewMaxScroll = Math.max(0, contentHeight - viewportHeight);
        this.battleViewScrollOffset = Math.max(0, Math.min(this.battleViewScrollOffset, this.battleViewMaxScroll));
        const startIndex = Math.floor(this.battleViewScrollOffset / itemHeight);
        const endIndex = Math.min(nearbyEntities.length, Math.ceil((this.battleViewScrollOffset + viewportHeight) / itemHeight));
        const visibleEntities = nearbyEntities.slice(startIndex, endIndex);
        
        // Área de conteúdo com clipping
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(x, y + headerHeight, width, viewportHeight);
        this.ctx.clip();
        
        // Lista de entidades
        if (nearbyEntities.length === 0) {
            this.ctx.font = 'italic 12px Arial';
            this.ctx.fillStyle = '#666666';
            this.ctx.fillText('Nenhuma entidade próxima', x + 10, y + headerHeight + 20);
        } else {
            visibleEntities.forEach((entity, index) => {
                const actualIndex = startIndex + index;
                const itemY = y + headerHeight + (actualIndex * itemHeight) - this.battleViewScrollOffset;
                const itemX = x + 4;
                // Background do item
                const bgColor = entity.type === 'Player' ? 'rgba(0, 100, 0, 0.3)' : 
                               entity.type === 'Monster' ? 'rgba(100, 0, 0, 0.3)' : 
                               'rgba(0, 0, 100, 0.3)';
                this.ctx.fillStyle = bgColor;
                this.ctx.fillRect(itemX, itemY, width - 8, itemHeight - 3);
                // Tipo e Nome
                this.ctx.font = 'bold 10px Arial';
                this.ctx.fillStyle = entity.type === 'Player' ? '#00ff00' : 
                                    entity.type === 'Monster' ? '#ff4444' : 
                                    '#4444ff';
                this.ctx.fillText(`[${entity.type}] ${entity.name}`, itemX + 6, itemY + 12);
                // Level e Distância
                this.ctx.font = '9px Arial';
                this.ctx.fillStyle = '#cccccc';
                this.ctx.fillText(`Lvl ${entity.level} | Dist: ${entity.distance}`, itemX + 6, itemY + 22);
                // HP Bar (se tiver)
                if (entity.hp !== undefined && entity.maxHp) {
                    const hpBarX = itemX + 110;
                    const hpBarY = itemY + 15;
                    const hpBarWidth = 60;
                    const hpBarHeight = 7;
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
                    this.ctx.font = '8px Arial';
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(`${entity.hp}/${entity.maxHp}`, hpBarX + hpBarWidth / 2, hpBarY + hpBarHeight / 2 + 2);
                    this.ctx.textAlign = 'left';
                }
            });
        }
        
        this.ctx.restore(); // Restaura o clipping
        
        // Desenha scrollbar se necessário
        if (this.battleViewMaxScroll > 0) {
            const scrollbarX = x + width - scrollbarWidth - 2;
            const scrollbarY = y + headerHeight;
            const scrollbarHeight = viewportHeight;
            
            // Background da scrollbar
            this.ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
            this.ctx.fillRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight);
            
            // Thumb da scrollbar
            const thumbHeight = Math.max(20, (viewportHeight / contentHeight) * scrollbarHeight);
            const thumbY = scrollbarY + (this.battleViewScrollOffset / this.battleViewMaxScroll) * (scrollbarHeight - thumbHeight);
            
            this.ctx.fillStyle = 'rgba(150, 150, 150, 0.8)';
            this.ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
            
            // Borda do thumb
            this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
        }
    }
    
    renderDebugInfo(gameState, wildPokemonManager = null) {
        const padding = 10;
        const x = this.canvas.width - 200;
        const y = padding;
        
        // Conta wild Pokémon
        const wildPokemonCount = wildPokemonManager ? wildPokemonManager.getAll().size : 0;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x, y, 190, 60);
        
        // Debug info
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`Players: ${gameState.players.size}`, x + 10, y + 20);
        this.ctx.fillText(`NPCs: ${gameState.npcs.size}`, x + 10, y + 35);
        this.ctx.fillText(`Monsters: ${wildPokemonCount}`, x + 10, y + 50);
    }
}
