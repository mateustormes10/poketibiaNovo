import { GameState } from './GameState.js';
import { Camera } from './Camera.js';
import { Time } from './Time.js';
import { WsClient } from '../network/WsClient.js';
import { Keyboard } from '../input/Keyboard.js';
import { Mouse } from '../input/Mouse.js';
import { Renderer } from '../render/Renderer.js';
import { GameConstants } from '../../shared/constants/GameConstants.js';
import { InventoryManager } from '../managers/InventoryManager.js';
import { InventoryUI } from '../render/UI/InventoryUI.js';
import { WildPokemonManager } from '../managers/WildPokemonManager.js';
import { WildPokemonRenderer } from '../render/WildPokemonRenderer.js';
import { ControlConfigUI } from '../ui/ControlConfigUI.js';

export class Game {
        _createMainMenu() {
            let menu = document.getElementById('main-menu-ui');
            if (!menu) {
                menu = document.createElement('div');
                menu.id = 'main-menu-ui';
                menu.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#222d;padding:32px 48px;border-radius:16px;z-index:10001;color:#fff;box-shadow:0 0 32px #000a;display:none;flex-direction:column;align-items:center;min-width:320px;';
                // Título
                const title = document.createElement('h2');
                title.textContent = 'Menu Principal';
                title.style = 'margin-bottom:24px;';
                menu.appendChild(title);
                // Botão de configurações de controle
                const btnConfig = document.createElement('button');
                btnConfig.textContent = 'Configurações de Controle';
                btnConfig.style = 'font-size:1.2em;padding:12px 32px;margin-bottom:12px;border-radius:8px;border:none;background:#444;color:#fff;cursor:pointer;';
                btnConfig.onclick = () => {
                    menu.style.display = 'none';
                    if (window.showControlConfig) window.showControlConfig();
                };
                menu.appendChild(btnConfig);
                // Botão de fechar
                const btnClose = document.createElement('button');
                btnClose.textContent = 'Fechar Menu';
                btnClose.style = 'font-size:1em;padding:8px 24px;border-radius:8px;border:none;background:#333;color:#fff;cursor:pointer;';
                btnClose.onclick = () => { menu.style.display = 'none'; };
                menu.appendChild(btnClose);
                document.body.appendChild(menu);
            }
            this._mainMenu = menu;
        }

        _toggleMainMenu() {
            if (!this._mainMenu) return;
            this._mainMenu.style.display = (this._mainMenu.style.display === 'none' ? 'flex' : 'none');
        }
    constructor(canvas, config) {
        this.canvas = canvas;
        this.config = config;
        this.running = false;
        
        // Inicializa dimensões dinâmicas
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Core systems
        this.gameState = new GameState();
        this.camera = new Camera({
            width: width,
            height: height,
            tileSize: config.camera.tileSize,
            smooth: config.camera.smooth,
            followSpeed: config.camera.followSpeed
        });
        this.time = new Time();
        this.wsClient = new WsClient(config.server.url);
        
        // Input
        this.keyboard = new Keyboard();
        this.mouse = new Mouse(canvas);
        
        // Callback para spawnar pokemon
        this.onPokemonSpawn = null;
        
        // Rendering
        this.renderer = new Renderer(canvas, this.camera, this.wsClient);
        
        // Inventory system
        this.inventoryUI = new InventoryUI(this.renderer.ctx, canvas);
        this.inventoryManager = new InventoryManager(this.wsClient, this.inventoryUI);
        
        // Wild Pokémon system
        this.wildPokemonManager = new WildPokemonManager(this.wsClient);
        this.wildPokemonRenderer = new WildPokemonRenderer();
        console.log('[Game] WildPokemonManager e WildPokemonRenderer criados');
        
        // Passa wildPokemonManager para o Renderer
        this.renderer.wildPokemonManager = this.wildPokemonManager;
        
        // Callback para bloquear movimento quando inventário aberto
        this.inventoryManager.onToggle((isOpen) => {
            this.isInventoryBlocking = isOpen;
        });
        this.isInventoryBlocking = false;
        
        this.lastFrameTime = 0;
        this.resizeTimeout = null;
        this.lastResizeWidth = 0;
        this.lastResizeHeight = 0;
        
        // Sistema de atualização periódica do mapa
        this.mapUpdateInterval = null;
        this.mapUpdateFrequency = GameConstants.MAP_UPDATE_FREQUENCY;
        this.isRequestingMap = false;
    }
    
    resizeCanvas() {
        // Evita resize desnecessários
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        if (this.lastResizeWidth === width && this.lastResizeHeight === height) {
            return; // Não precisa redimensionar
        }
        
        this.lastResizeWidth = width;
        this.lastResizeHeight = height;
        
        // CRÍTICO: Sincroniza tamanho REAL do canvas com a viewport
        this.canvas.width = width;
        this.canvas.height = height;
        
        // FORÇA tamanho CSS também (em alguns browsers é necessário)
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        
        // Atualiza a câmera
        this.camera.width = width;
        this.camera.height = height;
        
        // Reaplica configurações do contexto
        const ctx = this.canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
    }
    
    handleResize() {
        // Debounce: evita chamadas excessivas
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            this.resizeCanvas();
        }, GameConstants.RESIZE_DEBOUNCE);
    }
    
    async init() {
                        // Garante que o botão do menu sempre funcione
                        if (!this.controlConfigUI) {
                            this.controlConfigUI = new ControlConfigUI();
                        }
                        window.showControlConfig = () => {
                            this.controlConfigUI.render();
                        };
                // Cria o menu principal
                this._createMainMenu();
                // Atalho ESC para abrir/fechar menu principal
                window.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        // Só abre se não estiver com chat ou modal aberto
                        if (!this.renderer?.chatBox?.isInputActive() && !this.renderer?.deathModal?.isVisible()) {
                            this._toggleMainMenu();
                        }
                    }
                });
        // Setup canvas com tamanho da janela (apenas UMA vez)
        this.resizeCanvas();
        
        // Listener para redimensionamento com debounce
        window.addEventListener('resize', () => this.handleResize());
        
        // Listener para scroll do mouse (Battle View)
        window.addEventListener('wheel', (e) => {
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const deltaY = e.deltaY;
            
            // Tenta passar para o HUD (Battle View)
            if (this.renderer.hud.handleBattleViewScroll(mouseX, mouseY, deltaY)) {
                e.preventDefault(); // Previne scroll da página se consumido pelo Battle View
            }
        }, { passive: false });
        
        // Listener para Ctrl+V (colar no chat)
        window.addEventListener('paste', (e) => {
            if (this.renderer.chatBox.isInputActive()) {
                e.preventDefault();
                const text = e.clipboardData.getData('text');
                // Adiciona o texto colado ao input
                for (const char of text) {
                    this.renderer.chatBox.addCharToInput(char);
                }
            }
        });
        
        // Initialize systems
        await this.wsClient.connect();
        this.keyboard.init();
        this.mouse.init();
        await this.renderer.init();
        
        // Setup network handlers
        this.setupNetworkHandlers();
        
        // Pergunta qual player ID usar antes de fazer login
        this.promptPlayerIdAndLogin();
    }
    
    promptPlayerIdAndLogin() {
        // Cria modal para escolher player ID
        const playerId = prompt('Digite o Player ID (1-10):', '1');
        
        if (!playerId || isNaN(playerId)) {
            console.log('[Game] Player ID inválido, usando ID 1 por padrão');
            this.sendLogin('Player', 1);
        } else {
            const id = parseInt(playerId);
            this.sendLogin(`Player${id}`, id);
        }
    }
    
    setupNetworkHandlers() {
        this.wsClient.on('connected', (data) => {
            console.log('[Game] Connected to server');
        });
        
        this.wsClient.on('loginSuccess', (data) => {
            console.log('[Game] Login successful', data);
            
            // Inicia atualização periódica do mapa após login
            this.startMapUpdateLoop();
        });
        
        this.wsClient.on('gameState', (data) => {
            this.gameState.update(data);
            
            // Libera flag após receber resposta
            if (this.isRequestingMap) {
                this.isRequestingMap = false;
                console.log('[Game] Map update received - flag reset');
            }
        });
        
        this.wsClient.on('playerMove', (data) => {
            this.gameState.updatePlayerPosition(data);
        });
        
        this.wsClient.on('playerDeath', (data) => {
            console.log('[Game] Player died:', data);
            this.renderer.deathModal.show(data.message);
            
            // Atualiza posição do player para o respawn
            if (this.gameState.localPlayer) {
                this.gameState.localPlayer.x = data.respawnX;
                this.gameState.localPlayer.y = data.respawnY;
                this.gameState.localPlayer.z = data.respawnZ;
                this.gameState.localPlayer.renderX = data.respawnX;
                this.gameState.localPlayer.renderY = data.respawnY;
            }
        });
        
        this.wsClient.on('chatMessage', (data) => {
            console.log('[Game] Chat message:', data);
            this.renderer.chatBox.addMessage(data.playerName, data.message, data.type);
        });
        
        this.wsClient.on('npc_list', (data) => {
            console.log('[Game] NPC list received:', data);
            if (data.npcs) {
                this.gameState.update({ npcs: data.npcs });
            }
        });
        
        this.wsClient.on('npc_dialog', (data) => {
            console.log('[Game] NPC dialog received:', data);
            this.renderer.npcDialog.show(data);
        });
        
        this.wsClient.on('balance_update', (data) => {
            console.log('[Game] Balance updated:', data.balance);
            // Atualiza HUD com novo balance
            if (this.gameState.localPlayer) {
                this.gameState.localPlayer.goldCoin = data.balance;
            }
        });
        
        this.wsClient.on('purchase_success', (data) => {
            console.log('[Game] Purchase success:', data);
            // Atualiza balance no player
            if (this.gameState.localPlayer) {
                this.gameState.localPlayer.goldCoin = data.newBalance;
            }
            // Mostra mensagem
            this.renderer.chatBox.addMessage('System', `Você comprou ${data.itemName} por ${data.price} gold`, 'system');
        });
        
        this.wsClient.on('npc_heal', (data) => {
            console.log('[Game] Healed:', data);
            this.renderer.chatBox.addMessage('System', data.message, 'system');
        });
        
        this.wsClient.on('system_message', (data) => {
            console.log('[Game] System message:', data.message);
            this.renderer.chatBox.addMessage('System', data.message, 'system');
        });
        
        // Inventory handlers
        this.wsClient.on('inventory_data', (data) => {
            console.log('[Game] Inventory data received:', data);
            this.inventoryManager.receiveInventoryData(data);
        });
        
        // Wild Pokémon handlers
        this.wsClient.on('wild_pokemon_list', (data) => {
            console.log('[Game] Wild Pokémon list received:', data);
            this.wildPokemonManager.receiveWildPokemonList(data);
        });
        
        this.wsClient.on('wild_pokemon_spawn', (data) => {
            console.log('[Game] Wild Pokémon spawned:', data);
            this.wildPokemonManager.receiveSpawn(data);
        });
        
        this.wsClient.on('wild_pokemon_update', (data) => {
            console.log(`[Game] Wild Pokémon UPDATE: ${data.name} (id=${data.id}) moveu para (${data.x}, ${data.y}, ${data.z})`);
            this.wildPokemonManager.receiveUpdate(data);
        });
        
        this.wsClient.on('wild_pokemon_despawn', (data) => {
            console.log('[Game] Wild Pokémon despawned:', data);
            this.wildPokemonManager.receiveDespawn(data);
        });
        
        this.wsClient.on('inventory_update', (data) => {
            console.log('[Game] Inventory update received:', data);
            this.inventoryManager.receiveInventoryUpdate(data);
        });
        
        this.wsClient.on('inventory_item_used', (data) => {
            console.log('[Game] Item used:', data);
            this.inventoryManager.receiveItemUsed(data);
        });
        
        this.wsClient.on('inventory_item_added', (data) => {
            console.log('[Game] Item added:', data);
            this.inventoryManager.receiveItemAdded(data);
        });
        
        // Outfit change handler
        this.wsClient.on('outfit_changed', (data) => {
            console.log('[Game] Outfit changed:', data);
            if (data.success && this.gameState.localPlayer) {
                console.log('[Game] Atualizando sprite do player para:', data.lookaddons);
                this.gameState.localPlayer.sprite = data.lookaddons;
                this.renderer.chatBox.addMessage('System', `Aparência alterada para: ${data.lookaddons}`, 'system');
            } else {
                console.warn('[Game] Falha ao trocar outfit:', data.message);
            }
        });
        
        // Outfit update from other players
        this.wsClient.on('player_outfit_update', (data) => {
            console.log('[Game] Player outfit update:', data);
            const player = this.gameState.players.get(data.playerId);
            if (player) {
                player.sprite = data.lookaddons;
            }
        });
        
        // Sistema de mensagens GM
        this.wsClient.on('system_message', (data) => {
            console.log('[Game] System message:', data);
            this.renderer.chatBox.addMessage({
                playerName: 'Sistema',
                message: data.message,
                type: 'system',
                color: data.color || 'white'
            });
        });
        
        // Broadcast global
        this.wsClient.on('broadcast', (data) => {
            console.log('[Game] Broadcast received:', data);
            this.showBroadcast(data.message, data.duration || 5000);
        });
        
        this.wsClient.on('inventory_error', (data) => {
            console.log('[Game] Inventory error:', data);
            this.inventoryManager.receiveError(data);
        });
    }
    
    sendLogin(username, playerId = 1) {
        this.wsClient.send('login', {
            username: username || 'Player',
            password: '',
            playerId: playerId
        });
        console.log(`[Game] Sending login request for ${username} (Player ID: ${playerId})...`);
    }
    
    start() {
        this.running = true;
        this.lastFrameTime = performance.now();
        this.gameLoop();
    }
    
    stop() {
        this.running = false;
        this.stopMapUpdateLoop();
    }
    
    /**
     * Inicia loop de atualização periódica do mapa
     */
    startMapUpdateLoop() {
        // Limpa qualquer interval anterior
        this.stopMapUpdateLoop();
        
        // Cria novo interval para requisitar mapa a cada 2 segundos
        this.mapUpdateInterval = setInterval(() => {
            this.requestMapUpdate();
        }, this.mapUpdateFrequency);
        
        console.log(`[Game] Map update loop started (every ${this.mapUpdateFrequency}ms)`);
    }
    
    /**
     * Para o loop de atualização do mapa
     */
    stopMapUpdateLoop() {
        if (this.mapUpdateInterval) {
            clearInterval(this.mapUpdateInterval);
            this.mapUpdateInterval = null;
            console.log('[Game] Map update loop stopped');
        }
    }
    
    /**
     * Requisita atualização do mapa ao servidor
     */
    requestMapUpdate() {
        // Evita requisições simultâneas
        if (this.isRequestingMap) {
            console.log('[Game] Skipping map update - request already in progress');
            return;
        }
        
        const player = this.gameState.localPlayer;
        if (!player) {
            console.log('[Game] Skipping map update - no local player');
            return;
        }
        
        // Marca que está requisitando
        this.isRequestingMap = true;
        
        // Timeout de segurança: se não receber resposta em 5s, libera flag
        setTimeout(() => {
            if (this.isRequestingMap) {
                console.warn('[Game] Map update timeout - resetting flag');
                this.isRequestingMap = false;
            }
        }, 5000);
        
        // Envia requisição ao servidor
        this.wsClient.send('requestMapUpdate', {
            x: player.x,
            y: player.y,
            z: player.z
        });
        
        console.log(`[Game] Requesting map update at (${player.x}, ${player.y}, ${player.z})`);
    }
    
    gameLoop() {
        if (!this.running) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(deltaTime) {
                // Troca de andar automática se estiver sobre tile UP/DOWN, evitando envio repetido
                if (!this._lastFloorTileKey) this._lastFloorTileKey = null;
                // Usa player já declarado abaixo
                if (this.gameState.localPlayer) {
                    const map = window.game?.gameState?.map || this.gameState.map;
                    const player = this.gameState.localPlayer;
                    if (map) {
                        const tile = map.getTile(player.x, player.y, player.z);
                        const tileKey = tile ? `${player.x},${player.y},${player.z}` : null;
                        let sent = false;
                        if (tile && tile.spriteIds && tileKey !== this._lastFloorTileKey) {
                            for (const sprite of tile.spriteIds) {
                                if (typeof sprite === 'string' && sprite.startsWith('UP(')) {
                                    if (this.wsClient && typeof this.wsClient.send === 'function') {
                                        this.wsClient.send('changeFloor', {
                                            direction: 'up',
                                            x: player.x,
                                            y: player.y,
                                            z: player.z
                                        });
                                        console.log('[CLIENT] Enviando changeFloor UP para o servidor (auto)');
                                    } else {
                                        console.warn('[CLIENT] wsClient não está disponível ou método send ausente!');
                                    }
                                    sent = true;
                                    break;
                                }
                                if (typeof sprite === 'string' && sprite.startsWith('DOWN(')) {
                                    if (this.wsClient && typeof this.wsClient.send === 'function') {
                                        this.wsClient.send('changeFloor', {
                                            direction: 'down',
                                            x: player.x,
                                            y: player.y,
                                            z: player.z
                                        });
                                        console.log('[CLIENT] Enviando changeFloor DOWN para o servidor (auto)');
                                    } else {
                                        console.warn('[CLIENT] wsClient não está disponível ou método send ausente!');
                                    }
                                    sent = true;
                                    break;
                                }
                            }
                        }
                        this._lastFloorTileKey = sent ? tileKey : (tileKey !== this._lastFloorTileKey ? null : this._lastFloorTileKey);
                    }
                }
        this.time.update(deltaTime);
        this.processInput();
        this.gameState.interpolate(deltaTime);
        
        // Atualiza drag se estiver arrastando
        if (this.renderer.uiManager.isDragging()) {
            const mousePos = this.mouse.getPosition();
            this.renderer.uiManager.updateDrag(mousePos.x, mousePos.y);
        }
        
        // Atualiza hover do inventário
        const mousePos = this.mouse.getPosition();
        this.inventoryManager.handleMouseMove(mousePos.x, mousePos.y);
        
        // Detecta clique esquerdo do mouse
        if (this.mouse.isButtonPressed(0)) { // Botão esquerdo = 0
            
            // Verifica clique no inventário primeiro (se estiver aberto)
            if (this.inventoryManager.isInventoryOpen()) {
                if (this.inventoryManager.handleClick(mousePos.x, mousePos.y)) {
                    return; // Clique no inventário processado
                }
            }
            
            // Verifica clique no modal de morte primeiro
            if (this.renderer.deathModal.checkClick(mousePos.x, mousePos.y)) {
                return; // Modal foi fechado, não processa outros cliques
            }
            
            // Verifica clique no diálogo de NPC
            if (this.renderer.npcDialog.checkClick(mousePos.x, mousePos.y)) {
                return; // Clique no diálogo processado
            }
            
            // Em modo de edição, verifica drag nos elementos UI
            if (this.renderer.uiManager.isEditMode()) {
                if (this.renderer.hud.handleMouseDown(mousePos.x, mousePos.y)) {
                    return; // Começou drag no HUD
                }
                if (this.renderer.chatBox.handleMouseDown(mousePos.x, mousePos.y)) {
                    return; // Começou drag no ChatBox
                }
            } else {
                // Modo normal: verifica clique nos pokémons
                const clickedPokemon = this.renderer.hud.checkPokemonClick(mousePos.x, mousePos.y);
                
                if (clickedPokemon && this.gameState.localPlayer) {
                    const player = this.gameState.localPlayer;
                    // Calcula posição ao lado do player
                    const spawnX = player.x + 1;
                    const spawnY = player.y;
                    const spawnZ = player.z;
                    
                    console.log(`[Game] ${player.name} spawnou ${clickedPokemon.name} na coordenada (${spawnX}, ${spawnY}, ${spawnZ})`);
                    
                    // Envia comando para servidor spawnar o pokemon
                    this.wsClient.send('spawnPokemon', {
                        pokemonId: clickedPokemon.id,
                        x: spawnX,
                        y: spawnY,
                        z: spawnZ
                    });
                }
            }
        }
        
        // Para o drag quando soltar o botão
        if (this.mouse.isButtonReleased(0)) {
            if (this.renderer.uiManager.isDragging()) {
                this.renderer.uiManager.stopDrag();
            }
        }
        
        // Limpa os eventos de mouse para o próximo frame
        this.mouse.clearFrame();
        this.keyboard.clearFrame();
        
        // Atualiza câmera com player, mas usa z do mapa se disponível
        const player = this.gameState.localPlayer;
        if (player && this.gameState.map.tiles.size > 0) {
            // Garante que o z da câmera corresponde ao z do mapa
            this.camera.update(player);
            this.camera.z = this.gameState.map.viewport.z;
        } else if (player) {
            this.camera.update(player);
        }
    }
    
    processInput() {
        // Debug geral
        if (this.keyboard.isKeyPressed('c') || this.keyboard.isKeyPressed('C')) {
            console.log('[Game] ===== TECLA C DETECTADA NO INÍCIO =====');
            console.log('[Game] Modal morte visível?', this.renderer.deathModal.isVisible());
            console.log('[Game] NPC dialog visível?', this.renderer.npcDialog.isVisible());
            console.log('[Game] Chat input ativo?', this.renderer.chatBox.isInputActive());
        }
        
        // Bloqueia input se modal de morte estiver visível
        if (this.renderer.deathModal.isVisible()) {
            // Apenas permite fechar o modal com Enter
            if (this.keyboard.isKeyPressed('Enter')) {
                this.renderer.deathModal.hide();
            }
            return;
        }
        
        // Bloqueia input se diálogo de NPC estiver visível
        if (this.renderer.npcDialog.isVisible()) {
            // Verifica se o diálogo capturou a tecla
            const keys = ['Escape', 'ArrowUp', 'ArrowDown', 'w', 's', 'Enter'];
            for (const key of keys) {
                if (this.keyboard.isKeyPressed(key)) {
                    this.renderer.npcDialog.handleKeyPress(key);
                    return;
                }
            }
            return;
        }
        

        // Se OutfitSelector estiver aberto, captura navegação e bloqueia outros inputs
        if (this.renderer.outfitSelector.isOpen) {
            if (this.keyboard.isKeyPressed('arrowup')) {
                this.renderer.outfitSelector.moveUp();
            }
            if (this.keyboard.isKeyPressed('arrowdown')) {
                this.renderer.outfitSelector.moveDown();
            }
            if (this.keyboard.isKeyPressed('enter')) {
                this.renderer.outfitSelector.selectCurrent();
            }
            if (this.keyboard.isKeyPressed('Escape')) {
                this.renderer.outfitSelector.close();
            }
            return; // Bloqueia outros comandos quando outfit selector está aberto
        }

        // Controle de chat - Enter para ativar/desativar (só se OutfitSelector NÃO estiver aberto)
        if (this.keyboard.isKeyPressed('Enter') && !this.renderer.outfitSelector.isOpen) {
            if (this.renderer.chatBox.isInputActive()) {
                // Envia mensagem
                const message = this.renderer.chatBox.getInputText();
                if (message.trim().length > 0) {
                    this.wsClient.send('chat', {
                        message: message,
                        type: 'say'
                    });
                }
                this.renderer.chatBox.deactivateInput();
            } else {
                // Ativa input do chat
                this.renderer.chatBox.activateInput();
            }
            return;
        }

        // Se chat está ativo, captura teclas para o input e bloqueia outros comandos
        if (this.renderer.chatBox.isInputActive()) {
            // ESC cancela
            if (this.keyboard.isKeyPressed('Escape')) {
                this.renderer.chatBox.deactivateInput();
                return;
            }
            // Backspace remove caractere
            if (this.keyboard.isKeyPressed('Backspace')) {
                this.renderer.chatBox.removeCharFromInput();
                return;
            }
            // Captura letras, números e símbolos para digitar
            const keys = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !@#$%*()_-+=[]{}|;:,.<>?/';
            for (const char of keys) {
                if (this.keyboard.isKeyPressed(char)) {
                    this.renderer.chatBox.addCharToInput(char);
                    break;
                }
            }
            return; // Bloqueia todos os outros comandos enquanto chat está ativo
        }
        
        // Toggle do inventário com tecla I (só funciona quando chat NÃO está ativo)
        if (this.keyboard.isKeyPressed('i')) {
            this.inventoryManager.toggle();
            console.log('[Game] Inventário toggled');
            return;
        }
        
        // Toggle do seletor de outfit com tecla p (igual ao inventário e NPC)
        if (this.keyboard.isKeyPressed('p')) {
            console.log('[Game] OutfitSelector toggled');
            this.renderer.outfitSelector.toggle();
            return;
        }
        
        // Se OutfitSelector estiver aberto, captura navegação e bloqueia outros inputs
        if (this.renderer.outfitSelector.isOpen) {
            if (this.keyboard.isKeyPressed('arrowup')) {
                this.renderer.outfitSelector.moveUp();
            }
            if (this.keyboard.isKeyPressed('arrowdown')) {
                this.renderer.outfitSelector.moveDown();
            }
            if (this.keyboard.isKeyPressed('enter')) {
                this.renderer.outfitSelector.selectCurrent();
            }
            if (this.keyboard.isKeyPressed('Escape')) {
                this.renderer.outfitSelector.close();
            }
            return; // Bloqueia outros comandos quando outfit selector está aberto
        }
        
        // Se inventário estiver aberto, bloqueia movimento
        if (this.isInventoryBlocking) {
            // Permite fechar com ESC também
            if (this.keyboard.isKeyPressed('Escape')) {
                this.inventoryManager.close();
            }
            return;
        }
        
        // Toggle do modo de edição com F2
        if (this.keyboard.isKeyPressed('F2')) {
            this.renderer.uiManager.toggleEditMode();
            const mode = this.renderer.uiManager.isEditMode() ? 'ATIVADO' : 'DESATIVADO';
            console.log(`[Game] Modo de edição de UI ${mode}`);
            return;
        }
        
        // Interação com NPC via tecla E (só funciona quando chat não está ativo)
        if (this.keyboard.isKeyPressed('e')) {
            this.tryInteractWithNpc();
            return;
        }
        
        const player = this.gameState.localPlayer;
        if (!player) return;
        
        // Previne input durante movimento (cooldown natural)
        if (player.isMoving && player.moveProgress < 0.7) {
            return;
        }
        
        // Movimento via teclado com predição visual
        if (this.keyboard.isKeyPressed('ArrowUp') || this.keyboard.isKeyPressed('w')) {
            this.sendMoveCommand('up');
        }
        else if (this.keyboard.isKeyPressed('ArrowDown') || this.keyboard.isKeyPressed('s')) {
            this.sendMoveCommand('down');
        }
        else if (this.keyboard.isKeyPressed('ArrowLeft') || this.keyboard.isKeyPressed('a')) {
            this.sendMoveCommand('left');
        }
        else if (this.keyboard.isKeyPressed('ArrowRight') || this.keyboard.isKeyPressed('d')) {
            this.sendMoveCommand('right');
        }
    }
    
    sendMoveCommand(direction) {
        const player = this.gameState.localPlayer;
        // Envia comando ao servidor
        this.wsClient.send('move', { direction });

        // Após enviar movimento, verifica tile atual
        const map = window.game?.gameState?.map || this.gameState.map;
        if (map) {
            const tile = map.getTile(player.x, player.y, player.z);
            if (tile && tile.spriteIds) {
                // Verifica UP(x) ou DOWN(x)
                for (const sprite of tile.spriteIds) {
                    if (typeof sprite === 'string' && sprite.startsWith('UP(')) {
                        // Solicita troca de andar para cima
                        window.game?.wsClient?.send('changeFloor', {
                            direction: 'up',
                            x: player.x,
                            y: player.y,
                            z: player.z
                        });
                        console.log('[CLIENT] Enviando changeFloor UP para o servidor');
                        break;
                    }
                    if (typeof sprite === 'string' && sprite.startsWith('DOWN(')) {
                        // Solicita troca de andar para baixo
                        window.game?.wsClient?.send('changeFloor', {
                            direction: 'down',
                            x: player.x,
                            y: player.y,
                            z: player.z
                        });
                        console.log('[CLIENT] Enviando changeFloor DOWN para o servidor');
                        break;
                    }
                }
            }
        }

        // Predição visual de ANIMAÇÃO (não de posição!)
        // Apenas muda direção e inicia animação
        if (player.startPrediction) {
            player.startPrediction(direction);
        }
    }
    
    tryInteractWithNpc() {
        const player = this.gameState.localPlayer;
        if (!player) return;
        
        // Busca NPC próximo
        for (const [id, npc] of this.gameState.npcs) {
            const dx = Math.abs(player.x - npc.x);
            const dy = Math.abs(player.y - npc.y);
            
            if (dx <= 1 && dy <= 1 && player.z === npc.z) {
                console.log(`[Game] Interacting with NPC: ${npc.name}`);
                this.wsClient.send('npc_interact', { npcId: npc.id });
                return;
            }
        }
        
        console.log('[Game] No NPC nearby');
    }
    
    /**
     * Exibe broadcast global centralizado na tela
     * @param {string} message - Mensagem do broadcast
     * @param {number} duration - Duração em ms
     */
    showBroadcast(message, duration = 5000) {
        // Remove broadcast anterior se existir
        const existingBroadcast = document.getElementById('game-broadcast');
        if (existingBroadcast) {
            existingBroadcast.remove();
        }
        
        // Cria elemento do broadcast
        const broadcastDiv = document.createElement('div');
        broadcastDiv.id = 'game-broadcast';
        broadcastDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #FFD700;
            padding: 30px 50px;
            border: 3px solid #FFD700;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            z-index: 10000;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
            animation: broadcastFade 0.3s ease-in;
        `;
        broadcastDiv.textContent = message;
        
        // Adiciona animação CSS
        if (!document.getElementById('broadcast-animation')) {
            const style = document.createElement('style');
            style.id = 'broadcast-animation';
            style.textContent = `
                @keyframes broadcastFade {
                    from { opacity: 0; transform: translate(-50%, -60%); }
                    to { opacity: 1; transform: translate(-50%, -50%); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(broadcastDiv);
        
        // Remove após duração
        setTimeout(() => {
            broadcastDiv.style.animation = 'broadcastFade 0.3s ease-out reverse';
            setTimeout(() => {
                broadcastDiv.remove();
            }, 300);
        }, duration);
    }
    
    render() {
        this.renderer.clear();
        this.renderer.render(this.gameState);
        
        // Renderiza Pokémon selvagens
        const wildPokemons = this.wildPokemonManager.getAll();
        this.wildPokemonRenderer.render(this.renderer.ctx, wildPokemons, this.camera);
        
        // Renderiza inventário por último (acima de tudo)
        this.inventoryManager.render();
    }
}
