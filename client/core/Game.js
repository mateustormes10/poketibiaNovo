import { GameState } from './GameState.js';
import { Camera } from './Camera.js';
import { Time } from './Time.js';
import { WsClient } from '../network/WsClient.js';
import { Keyboard } from '../input/Keyboard.js';
import { Mouse } from '../input/Mouse.js';
import { Renderer } from '../render/Renderer.js';

export class Game {
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
        this.renderer = new Renderer(canvas, this.camera);
        
        this.lastFrameTime = 0;
        this.resizeTimeout = null;
        this.lastResizeWidth = 0;
        this.lastResizeHeight = 0;
        
        // Sistema de atualização periódica do mapa
        this.mapUpdateInterval = null;
        this.mapUpdateFrequency = 2000; // 2 segundos
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
        
        console.log(`[Game] Canvas resized to ${width}x${height}`);
        console.log(`[Game] Canvas CSS: ${this.canvas.style.width} x ${this.canvas.style.height}`);
        console.log(`[Game] Canvas internal: ${this.canvas.width} x ${this.canvas.height}`);
    }
    
    handleResize() {
        // Debounce: evita chamadas excessivas
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            this.resizeCanvas();
        }, 100);
    }
    
    async init() {
        // Setup canvas com tamanho da janela (apenas UMA vez)
        this.resizeCanvas();
        
        // Listener para redimensionamento com debounce
        window.addEventListener('resize', () => this.handleResize());
        
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
        this.time.update(deltaTime);
        this.processInput();
        this.gameState.interpolate(deltaTime);
        
        // Atualiza drag se estiver arrastando
        if (this.renderer.uiManager.isDragging()) {
            const mousePos = this.mouse.getPosition();
            this.renderer.uiManager.updateDrag(mousePos.x, mousePos.y);
        }
        
        // Detecta clique esquerdo do mouse
        if (this.mouse.isButtonPressed(0)) { // Botão esquerdo = 0
            const mousePos = this.mouse.getPosition();
            
            // Verifica clique no modal de morte primeiro
            if (this.renderer.deathModal.checkClick(mousePos.x, mousePos.y)) {
                return; // Modal foi fechado, não processa outros cliques
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
        // Bloqueia input se modal de morte estiver visível
        if (this.renderer.deathModal.isVisible()) {
            // Apenas permite fechar o modal com Enter
            if (this.keyboard.isKeyPressed('Enter')) {
                this.renderer.deathModal.hide();
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
        
        // Controle de chat
        if (this.keyboard.isKeyPressed('Enter')) {
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
        
        // Se chat está ativo, captura teclas para o input
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
            
            // Captura letras, números e espaços
            const keys = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !@#$%*()_-+=[]{}|;:,.<>?/';
            for (const char of keys) {
                if (this.keyboard.isKeyPressed(char)) {
                    this.renderer.chatBox.addCharToInput(char);
                    break;
                }
            }
            return; // Bloqueia outros inputs enquanto digita
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
        
        // Predição visual de ANIMAÇÃO (não de posição!)
        // Apenas muda direção e inicia animação
        if (player.startPrediction) {
            player.startPrediction(direction);
        }
    }
    
    render() {
        this.renderer.clear();
        this.renderer.render(this.gameState);
    }
}
