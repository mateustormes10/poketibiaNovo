import { TileActions } from '../utils/TileActions.js';
import { InfoPanelUI } from '../ui/InfoPanelUI.js';

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
import { SoundConfigUI } from '../ui/SoundConfigUI.js';
import { GraphicsConfigUI } from '../ui/GraphicsConfigUI.js';
import { GmCommandsUI } from '../ui/GmCommandsUI.js';
import { MapUI } from '../render/UI/MapUI.js';
import { SkillDatabase } from '../../shared/SkillDatabase.js';
import { SkillEffectManager } from './SkillEffectManager.js';
import { getTypeEffectiveness } from '../../shared/TypeEffectiveness.js';
import { MusicPlayer } from './MusicPlayer.js';
export class Game {

        // Instancie MusicPlayer como this.music
        playBackgroundMusic() {
            if (!this.music) {
                this.music = new MusicPlayer('assets/');
            }
            this.music.play('rpg_city_medieval.mp3');
            // Aplica volume e mute das configs salvas
            const vol = parseInt(localStorage.getItem('sound_volume') || '80', 10) / 100;
            const muted = localStorage.getItem('sound_muted') === 'true';
            this.music.config(vol);
            if (this.music.audio) this.music.audio.muted = muted;
        }
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

                // Botão Sair do Jogo
                const btnExit = document.createElement('button');
                btnExit.textContent = 'Sair do Jogo';
                btnExit.style = 'font-size:1.2em;padding:12px 32px;margin-bottom:12px;border-radius:8px;border:none;background:#a22;color:#fff;cursor:pointer;';
                btnExit.onclick = () => {
                    this._showExitGameModal();
                };
                menu.appendChild(btnExit);
                // Botão de configurações de controle
                const btnConfig = document.createElement('button');
                btnConfig.textContent = 'Configurações de Controle';
                btnConfig.style = 'font-size:1.2em;padding:12px 32px;margin-bottom:12px;border-radius:8px;border:none;background:#444;color:#fff;cursor:pointer;';
                btnConfig.onclick = () => {
                    menu.style.display = 'none';
                    if (window.showControlConfig) window.showControlConfig();
                };
                menu.appendChild(btnConfig);

                // (Removido: botão GM agora é criado dinamicamente em _toggleMainMenu e ao receber gameState)

                // Botão de configurações de som
                const btnSound = document.createElement('button');
                btnSound.textContent = 'Configurações de Som';
                btnSound.style = 'font-size:1.2em;padding:12px 32px;margin-bottom:12px;border-radius:8px;border:none;background:#444;color:#fff;cursor:pointer;';
                btnSound.onclick = () => {
                    menu.style.display = 'none';
                    if (window.showSoundConfig) window.showSoundConfig();
                };
                menu.appendChild(btnSound);

                // Botão de configurações gráficas
                const btnGraphics = document.createElement('button');
                btnGraphics.textContent = 'Configurações Gráficas';
                btnGraphics.style = 'font-size:1.2em;padding:12px 32px;margin-bottom:12px;border-radius:8px;border:none;background:#444;color:#fff;cursor:pointer;';
                btnGraphics.onclick = () => {
                    menu.style.display = 'none';
                    if (window.showGraphicsConfig) window.showGraphicsConfig();
                };
                menu.appendChild(btnGraphics);
                

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

    _showExitGameModal() {
        let modal = document.getElementById('exit-game-modal');
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = 'exit-game-modal';
        modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.55);z-index:10010;display:flex;align-items:center;justify-content:center;';
        const box = document.createElement('div');
        box.style = 'background:#222;padding:32px 48px;border-radius:16px;box-shadow:0 0 32px #000a;display:flex;flex-direction:column;align-items:center;min-width:320px;';
        const msg = document.createElement('div');
        msg.textContent = 'Você deseja sair do jogo?';
        msg.style = 'font-size:1.3em;color:#fff;margin-bottom:24px;';
        box.appendChild(msg);
        const btns = document.createElement('div');
        btns.style = 'display:flex;gap:24px;';
        // Botão Sim
        const btnYes = document.createElement('button');
        btnYes.textContent = 'Sim';
        btnYes.style = 'font-size:1.1em;padding:10px 32px;border-radius:8px;border:none;background:#a22;color:#fff;cursor:pointer;';
        btnYes.onclick = () => {
            window.location.href = 'menu.html';
        };
        btns.appendChild(btnYes);
        // Botão Cancelar
        const btnCancel = document.createElement('button');
        btnCancel.textContent = 'Cancelar';
        btnCancel.style = 'font-size:1.1em;padding:10px 32px;border-radius:8px;border:none;background:#444;color:#fff;cursor:pointer;';
        btnCancel.onclick = () => {
            modal.remove();
        };
        btns.appendChild(btnCancel);
        box.appendChild(btns);
        modal.appendChild(box);
        document.body.appendChild(modal);
    }

        _toggleMainMenu() {
        if (!this._mainMenu) return;

        // Só atualiza o menu se for abrir (display none -> flex)
        const willOpen = this._mainMenu.style.display === 'none';

        // Remove botão GM antigo se existir
        const oldGmBtn = document.getElementById('gm-menu-btn');
        if (oldGmBtn) oldGmBtn.remove();

        if (willOpen) {
            // Ao abrir o menu, requisita ao servidor o vocation do player (se ainda não sabemos)
            if (typeof this._isGmVocation === 'undefined') {
                this.wsClient.send('get_player_vocation', {});
                // O botão GM será inserido no handler da resposta
            } else if (this._isGmVocation) {
                // Se já sabemos que é GM, mostra o botão
                this._insertGmButton();
            }
        }

        this._mainMenu.style.display = (this._mainMenu.style.display === 'none' ? 'flex' : 'none');
    }

        showConnectionLostUI(options = {}) {
            // Remove se já existir
            const existing = document.getElementById('connection-lost-ui');
            if (existing) existing.remove();
            const div = document.createElement('div');
            div.id = 'connection-lost-ui';
            div.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #222d;
                color: #fff;
                padding: 40px 60px;
                border-radius: 16px;
                z-index: 10050;
                font-size: 2em;
                font-weight: bold;
                text-align: center;
                box-shadow: 0 0 32px #000a;
            `;
            div.innerHTML = '<div>Conexão perdida com o servidor.</div>';
            if (options.allowReconnect) {
                const btn = document.createElement('button');
                btn.textContent = 'Reconectar';
                btn.style = 'display:block;margin:32px auto 0 auto;padding:16px 48px;font-size:1em;border-radius:8px;border:none;background:#444;color:#fff;cursor:pointer;';
                btn.onclick = () => {
                    this.hideConnectionLostUI();
                    this.tryReconnectWithUI();
                };
                div.appendChild(btn);
            }
            // Sempre mostra o botão cancelar se showCancel for true OU se allowReconnect estiver ativo (após falha de reconexão)
            if (options.showCancel || options.allowReconnect) {
                const btnCancel = document.createElement('button');
                btnCancel.id = 'connection-lost-cancel';
                btnCancel.textContent = 'Cancelar';
                btnCancel.style = 'display:block;margin:16px auto 0 auto;padding:12px 36px;font-size:1em;border-radius:8px;border:none;background:#a22;color:#fff;cursor:pointer;';
                btnCancel.onclick = () => {
                    this.hideConnectionLostUI();
                    this.goToMainMenu();
                };
                div.appendChild(btnCancel);
            }
            document.body.appendChild(div);
        }

        tryReconnectWithUI() {
            let attempts = 0;
            const maxAttempts = 3;
            const tryConnect = () => {
                attempts++;
                this.wsClient.connect().then(() => {
                    this.hideConnectionLostUI();
                }).catch(() => {
                    if (attempts < maxAttempts) {
                        setTimeout(tryConnect, 1000);
                    } else {
                        this.showConnectionLostUI({ allowReconnect: true, showCancel: true });
                    }
                });
            };
            tryConnect();
        }

        addCancelToConnectionLostUI() {
            const div = document.getElementById('connection-lost-ui');
            if (!div) return;
            let btn = document.getElementById('connection-lost-cancel');
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'connection-lost-cancel';
                btn.textContent = 'Cancelar';
                btn.style = 'display:block;margin:16px auto 0 auto;padding:12px 36px;font-size:1em;border-radius:8px;border:none;background:#a22;color:#fff;cursor:pointer;';
                btn.onclick = () => {
                    this.hideConnectionLostUI();
                    this.goToMainMenu();
                };
                div.appendChild(btn);
            }
        }

        goToMainMenu() {
            // Redireciona para o menu principal (menu.html)
            window.location.href = 'menu.html';
        }

    hideConnectionLostUI() {
        const existing = document.getElementById('connection-lost-ui');
        if (existing) existing.remove();
    }

    _insertGmButton() {
        // Cria e insere o botão GM no menu principal
        if (!this._mainMenu) return;
        const btnGm = document.createElement('button');
        btnGm.id = 'gm-menu-btn';
        btnGm.textContent = 'Comandos GM';
        btnGm.style = 'font-size:1.2em;padding:12px 32px;margin-bottom:12px;border-radius:8px;border:none;background:#a22;color:#fff;cursor:pointer;';
        btnGm.onclick = () => {
            this._mainMenu.style.display = 'none';
            if (window.showGmCommandsUI) window.showGmCommandsUI();
        };
        this._mainMenu.insertBefore(btnGm, this._mainMenu.lastChild);
    }
    constructor(canvas, config) {
        // Não define window.game globalmente
        this.canvas = canvas;
        this.config = config;
        this.running = false;
        this.infoPanelUI = new InfoPanelUI();
        
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

        // Gerenciador de animações de skills multiplayer (deve ser criado após this.renderer)
        this.skillEffectManager = new SkillEffectManager(this.renderer.spriteRenderer, this.camera);
        // Integrar callback de clique de skill IMEDIATAMENTE
        if (this.renderer && this.renderer.hud && this.renderer.hud.pokemonSkillsUI) {
            this.renderer.hud.pokemonSkillsUI.onSkillClick = (skillName, skill, index) => {
                try {
                    const player = this.gameState.localPlayer;
                    if (player) {
                        this.useSkillWithCooldown(skillName, skill, player);
                    }
                } catch (err) {
                    console.error('[ERRO] ao processar clique de skill:', err);
                }
                this._lastMouseDown = false;
            };
        }
         
        
        // Inventory system
        this.inventoryUI = new InventoryUI(this.renderer.ctx, canvas);
        this.inventoryManager = new InventoryManager(this.wsClient, this.inventoryUI);
        
        // Wild Pokémon system
        this.wildPokemonManager = new WildPokemonManager(this.wsClient);
        this.wildPokemonRenderer = new WildPokemonRenderer();
        
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

        // Mapa UI
        this.mapUI = null;
    }

        // Método central para uso de skill com cooldown
    useSkillWithCooldown(skillName, skill, player) {
        if (!this._skillCooldowns) this._skillCooldowns = {};
        // Log detalhado para debug de skills
        console.log('[DEBUG] useSkillWithCooldown', { skillName, skill, fullSkill: (window.SkillDatabase ? window.SkillDatabase[skillName] : (typeof SkillDatabase !== 'undefined' ? SkillDatabase[skillName] : skill)) });
        const now = Date.now();
        // Usa SkillDatabase já importado
        const fullSkill = window.SkillDatabase ? window.SkillDatabase[skillName] : (typeof SkillDatabase !== 'undefined' ? SkillDatabase[skillName] : skill);
        const key = fullSkill && fullSkill.name ? fullSkill.name : skillName;
        const cd = fullSkill && fullSkill.cowndown ? fullSkill.cowndown * 1000 : 0;
        if (this._skillCooldowns[key] && now < this._skillCooldowns[key]) {
            // Ainda em cooldown, ignora
            console.log(`[COOLDOWN] Skill '${key}' ainda em cooldown.`);
            return false;
        }
        this.wsClient.send('use_skill', {
            playerId: player.id,
            skillName,
            tile: { x: player.x, y: player.y, z: player.z }
        });
        this._skillCooldowns[key] = now + cd;

        // --- DANO EM POKÉMONS SELVAGENS PRÓXIMOS ---
        // Só executa se for skill de ataque
        if (fullSkill && fullSkill.type === 'damage') {
            // Determina área de efeito (single, 3x3, 5x5, etc)
            let areaRadius = 0;
            const areaRaw = fullSkill.targetArea;
            if (areaRaw === 'single') areaRadius = 0;
            else if (areaRaw === '3x3') areaRadius = 1;
            else if (areaRaw === '5x5') areaRadius = 2;
            else {
                // fallback: single
                areaRadius = 0;
            }
            console.log(`[DEBUG] Skill '${skillName}' targetArea='${areaRaw}' => areaRadius=${areaRadius}`);
            const wilds = this.wildPokemonManager.getAll();
            for (const wild of wilds.values()) {
                const dx = wild.x - player.x;
                const dy = wild.y - player.y;
                const dz = wild.z - player.z;
                const inArea = (wild.z === player.z && Math.abs(dx) <= areaRadius && Math.abs(dy) <= areaRadius);
                console.log(`[DEBUG] Wild ${wild.name} pos=(${wild.x},${wild.y},${wild.z}) dx=${dx} dy=${dy} dz=${dz} inArea=${inArea}`);
                if (inArea) {
                    const wildType = wild.element || wild.type || wild.pokemonType || 'normal';
                    const atkType = fullSkill.element || 'normal';
                    let multiplier = getTypeEffectiveness(atkType, wildType);
                    let finalDmg = Math.round(fullSkill.power * multiplier);
                    // Envia dano ao servidor
                    this.wsClient.send('wild_pokemon_damage', {
                        wildPokemonId: wild.id,
                        damage: finalDmg,
                        skillName,
                        attackerId: player.id
                    });
                    // (Opcional: pode remover a linha abaixo se quiser que só o servidor controle o HP)
                    // wild.hp = Math.max(0, (wild.hp || 100) - finalDmg);
                    console.log(`[DANO] ${wild.name} (${wildType}) recebeu ${finalDmg} de dano de ${atkType} (x${multiplier}) [ENVIADO AO SERVIDOR]`);
                }
            }
        }
        return true;
    }

    animateSkillAroundPlayer(skillName, skill, index) {
        try {
            console.log('[DEBUG] Entrou em animateSkillAroundPlayer', skillName, skill, index);
            if (!this.activeSkillEffects) this.activeSkillEffects = [];
            const now = performance.now();
            this.activeSkillEffects.push({
                start: now,
                duration: 700, // ms
                color: '#ffd700',
                radius: 48,
            });
            console.log('[DEBUG] Efeito de skill adicionado com sucesso');
        } catch (err) {
            console.error('[ERRO] em animateSkillAroundPlayer:', err);
        }
    }
    showInfoInFrontOfPlayer() {
        const player = this.gameState.localPlayer;
        if (!player) return;
        // Calcula posição à frente
        let dx = 0, dy = 0;
        switch (player.direction) {
            case 'up': dy = -1; break;
            case 'down': dy = 1; break;
            case 'left': dx = -1; break;
            case 'right': dx = 1; break;
        }
        const x = player.x + dx;
        const y = player.y + dy;
        const z = player.z;
        // Busca entidade à frente: NPC
        let found = null;
        for (const [id, npc] of this.gameState.npcs) {
            if (npc.x === x && npc.y === y && npc.z === z) {
                found = { type: 'npc', data: npc };
                break;
            }
        }
        // Player
        if (!found) {
            for (const [id, p] of this.gameState.players) {
                if (p.x === x && p.y === y && p.z === z && p.id !== player.id) {
                    found = { type: 'player', data: p };
                    break;
                }
            }
        }
        // Pokémon selvagem
        if (!found && this.wildPokemonManager) {
            for (const [id, poke] of this.wildPokemonManager.getAll()) {
                if (poke.x === x && poke.y === y && poke.z === z) {
                    found = { type: 'pokemon', data: poke };
                    break;
                }
            }
        }
        // Tile/cenário
        let tile = null;
        if (!found && this.gameState.map) {
            tile = this.gameState.map.getTile(x, y, z);
            if (tile) {
                found = { type: 'tile', data: tile };
            }
        }
        // Monta info
        let html = '';
        if (found) {
            if (found.type === 'npc') {
                html = `<b>NPC:</b> ${found.data.name || 'Desconhecido'}<br>ID: ${found.data.id}`;
            } else if (found.type === 'player') {
                html = `<b>Player:</b> ${found.data.name || 'Desconhecido'}<br>Level: ${found.data.level || '?'}<br>ID: ${found.data.id}`;
            } else if (found.type === 'pokemon') {
                html = `<b>Pokémon:</b> ${found.data.name || 'Desconhecido'}<br>Level: ${found.data.level || '?'}<br>ID: ${found.data.id}`;
            } else if (found.type === 'tile') {
                html = `<b>Tile:</b> [${x},${y},${z}]<br>Sprites: ${(found.data.spriteIds || []).join(', ')}`;
            }
        } else {
            html = 'Nada encontrado à frente.';
        }
        this.infoPanelUI.show(html);
        // Esconde painel após 2.5s
        clearTimeout(this._infoPanelTimeout);
        this._infoPanelTimeout = setTimeout(() => this.infoPanelUI.hide(), 2500);
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
        // Bloqueia ESC globalmente quando a UI de conexão perdida estiver aberta
        window.addEventListener('keydown', (e) => {
            const lostUi = document.getElementById('connection-lost-ui');
            if (lostUi && lostUi.style.display !== 'none' && e.key === 'Escape') {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        }, true);
        // Garante que os botões do menu sempre funcionem
        if (!this.controlConfigUI) {
            this.controlConfigUI = new ControlConfigUI();
        }
        window.showControlConfig = () => {
            this.controlConfigUI.render();
        };

        if (!this.soundConfigUI) {
            this.soundConfigUI = new SoundConfigUI();
        }
        window.showSoundConfig = () => {
            this.soundConfigUI.render();
        };

        if (!this.graphicsConfigUI) {
            this.graphicsConfigUI = new GraphicsConfigUI();
        }
        window.showGraphicsConfig = () => {
            this.graphicsConfigUI.render();
        };

        // GM Commands UI (só mostra se vocation 4)
        if (!this.gmCommandsUI) {
            this.gmCommandsUI = new GmCommandsUI(this);
        }
        window.showGmCommandsUI = () => {
            this.gmCommandsUI.render();
        };
        // Cria o menu principal
        this._createMainMenu();
        // Atalho ESC para abrir/fechar menu principal
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Se o mapa está aberto, só fecha o mapa
                if (this.mapUI && this.mapUI.visible) {
                    this.mapUI.hide();
                    return;
                }
                // Só abre/fecha menu se NENHUM outro menu/modal/seleção estiver ativo
                const chatActive = this.renderer?.chatBox?.isInputActive();
                const deathModal = this.renderer?.deathModal?.isVisible();
                const inventoryOpen = this.inventoryManager?.isInventoryOpen?.();
                const outfitSelectorOpen = this.renderer?.outfitSelector?.isOpen;
                const npcDialogOpen = this.renderer?.npcDialog?.isVisible();
                const gmUi = document.getElementById('gm-commands-ui');
                const gmUiOpen = gmUi && gmUi.style.display !== 'none';
                const hud = this.renderer?.hud;
                const pokemonSelection = hud?.pokemonSelectionActive;
                if (!chatActive && !deathModal && !inventoryOpen && !outfitSelectorOpen && !npcDialogOpen && !gmUiOpen && !pokemonSelection) {
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

        // Instancia MapUI após renderer e gameState estarem prontos
        this.mapUI = new MapUI(this.canvas, this.gameState, this.gameState.map);

        // Atalho para abrir/fechar o mapa com M
        window.addEventListener('keydown', (e) => {
            if (e.key === 'm' || e.key === 'M') {
                // Só abre se nenhum outro menu/modal estiver aberto
                const chatActive = this.renderer?.chatBox?.isInputActive();
                const deathModal = this.renderer?.deathModal?.isVisible();
                const inventoryOpen = this.inventoryManager?.isInventoryOpen?.();
                const outfitSelectorOpen = this.renderer?.outfitSelector?.isOpen;
                const npcDialogOpen = this.renderer?.npcDialog?.isVisible();
                const gmUi = document.getElementById('gm-commands-ui');
                const gmUiOpen = gmUi && gmUi.style.display !== 'none';
                const hud = this.renderer?.hud;
                const pokemonSelection = hud?.pokemonSelectionActive;
                const mainMenuOpen = this._mainMenu && this._mainMenu.style.display !== 'none';
                if (!chatActive && !deathModal && !inventoryOpen && !outfitSelectorOpen && !npcDialogOpen && !gmUiOpen && !pokemonSelection && !mainMenuOpen) {
                    this.mapUI.toggle();
                }
            }
            // ESC fecha o mapa se estiver aberto (removido, agora tratado no listener global acima)
        });
    }
    
    promptPlayerIdAndLogin() {
        // Lê playerId da query string, se existir
        const urlParams = new URLSearchParams(window.location.search);
        let playerId = urlParams.get('playerId');
        if (!playerId) {
            // Se não houver na URL, pede via prompt
            playerId = prompt('Digite o Player ID (1-10):', '1');
        }
        if (!playerId || isNaN(playerId)) {
            this.sendLogin('Player', 1);
        } else {
            const id = parseInt(playerId);
            this.sendLogin(`Player${id}`, id);
        }
    }
    
    setupNetworkHandlers() {
        this.wsClient.on('connected', (data) => {
            console.log('[Game] Connected to server');
            this.hideConnectionLostUI();
        });
        // Evento de animação de skill multiplayer
        this.wsClient.on('skill_animation', (data) => {
            // data: { playerId, skillName, tile }
            console.log('[Game] Evento skill_animation recebido:', data);
            if (!data || !data.skillName || !data.tile) return;
            this.skillEffectManager.addSkillEffect({
                skillName: data.skillName,
                tile: data.tile,
                duration: 700 // ms
            });
        });
                this.wsClient.on('disconnected', () => {
                    console.warn('[Game] Disconnected from server');
                    this.showConnectionLostUI();
                });
        
        this.wsClient.on('loginSuccess', (data) => {
            // Inicia atualização periódica do mapa após login
            this.startMapUpdateLoop();
        });
        
        this.wsClient.on('gameState', (data) => {
            // Log para verificar chegada dos novos mapas
            console.log('[Game] gameState recebido:', data);
            if (data.mapUp) {
                console.log('[Game] mapUp recebido:', data.mapUp);
            }
            if (data.mapDown) {
                console.log('[Game] mapDown recebido:', data.mapDown);
            }
            this.gameState.update(data);
            // Libera flag após receber resposta
            if (this.isRequestingMap) {
                this.isRequestingMap = false;
            }
            // Não faz mais nada relacionado ao menu ou GM aqui
        });

        // Handler para resposta de vocation do player (registra só uma vez)
        this.wsClient.on('player_vocation', (data) => {
            // Remove botão GM antigo se existir
            const oldGmBtn = document.getElementById('gm-menu-btn');
            if (oldGmBtn) oldGmBtn.remove();
            this._isGmVocation = (data && Number(data.vocation) === 4);
            if (this._isGmVocation) {
                this._insertGmButton();
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
            this.wildPokemonManager.receiveWildPokemonList(data);
        });
        
        this.wsClient.on('wild_pokemon_spawn', (data) => {
            this.wildPokemonManager.receiveSpawn(data);
        });
        
        this.wsClient.on('wild_pokemon_update', (data) => {
            this.wildPokemonManager.receiveUpdate(data);
        });
        
        this.wsClient.on('wild_pokemon_despawn', (data) => {
            this.wildPokemonManager.receiveDespawn(data);
        });
        
        this.wsClient.on('inventory_update', (data) => {
            this.inventoryManager.receiveInventoryUpdate(data);
        });
        
        this.wsClient.on('inventory_item_used', (data) => {
            this.inventoryManager.receiveItemUsed(data);
        });
        
        this.wsClient.on('inventory_item_added', (data) => {
            this.inventoryManager.receiveItemAdded(data);
        });
        
        // Outfit change handler
        this.wsClient.on('outfit_changed', (data) => {
            if (data.success && this.gameState.localPlayer) {
                this.gameState.localPlayer.sprite = data.lookaddons;
                // Sempre que trocar outfit, atualiza o _lastHumanSprite se não estiver transformado em pokémon
                if (!this.gameState.localPlayer.pokemonName) {
                    this.gameState.localPlayer._lastHumanSprite = data.lookaddons;
                }
                this.renderer.chatBox.addMessage('System', `Aparência alterada para: ${data.lookaddons}`, 'system');
            } else {
                console.warn('[Game] Falha ao trocar outfit:', data.message);
            }
        });
        
        // Outfit update from other players
        this.wsClient.on('player_outfit_update', (data) => {
            const player = this.gameState.players.get(data.playerId);
            if (player) {
                player.sprite = data.lookaddons;
            }
        });
        
        // Sistema de mensagens GM
        this.wsClient.on('system_message', (data) => {
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
        this.playBackgroundMusic();
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
                                    // PORTAL: verifica se há portal definido no tile atual
                                    if (typeof sprite === 'number' && sprite === 197) {
                                        // Busca instância do portal para a coordenada atual usando referência local
                                        const portalInstances = TileActions?.[197]?.instances;
                                        const portalDef = portalInstances?.find(inst => inst.x === player.x && inst.y === player.y && inst.z === player.z);
                                        if (portalDef && Array.isArray(portalDef.teleportTo)) {
                                            if (this.wsClient && typeof this.wsClient.send === 'function') {
                                                this.wsClient.send('portal', {
                                                    from: { x: player.x, y: player.y, z: player.z },
                                                    to: { x: portalDef.teleportTo[0], y: portalDef.teleportTo[1], z: portalDef.teleportTo[2] }
                                                });
                                                console.log('[PORTAL] Enviando evento PORTAL para o servidor:', portalDef.teleportTo);
                                            }
                                            sent = true;
                                            break;
                                        }
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
        
        // Detecta clique esquerdo do mouse (debounce manual para UI)
        if (!this._lastMouseDown) this._lastMouseDown = false;
        const mouseDown = this.mouse.isButtonDown(0);
        if (mouseDown && !this._lastMouseDown) {
            // Verifica clique nos botões do Battle View SEMPRE
            if (this.renderer.hud.handleBattleViewClick(mousePos.x, mousePos.y)) {
                this._lastMouseDown = true;
                return;
            }

            // Verifica clique no inventário primeiro (se estiver aberto)
            if (this.inventoryManager.isInventoryOpen()) {
                if (this.inventoryManager.handleClick(mousePos.x, mousePos.y)) {
                    this._lastMouseDown = true;
                    return;
                }
            }

            // Verifica clique no modal de morte primeiro
            if (this.renderer.deathModal.checkClick(mousePos.x, mousePos.y)) {
                this._lastMouseDown = true;
                return;
            }

            // Verifica clique no diálogo de NPC
            if (this.renderer.npcDialog.checkClick(mousePos.x, mousePos.y)) {
                this._lastMouseDown = true;
                return;
            }

            // Sempre permite clique no HUD (skills, etc)
            if (this.renderer.hud.handleMouseDown(mousePos.x, mousePos.y)) {
                this._lastMouseDown = true;
                return;
            }

            // Em modo normal: verifica clique nos pokémons e transforma o player
            if (!this.renderer.uiManager.isEditMode()) {
                this.renderer.hud.checkPokemonClick(mousePos.x, mousePos.y, this.gameState.localPlayer, this.wsClient);
            }
            this._lastMouseDown = true;
        } else if (!mouseDown) {
            this._lastMouseDown = false;
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
                // BLOQUEIA TUDO SE O MAPA ESTÁ ABERTO
                if (this.mapUI && this.mapUI.visible) {
                    // Se tentar mover, mostrar alerta e fechar o mapa
                    const moveKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'];
                    for (const key of moveKeys) {
                        if (this.keyboard.isKeyPressed(key)) {
                            this.showMapBlockAlert();
                            this.mapUI.hide();
                            return;
                        }
                    }
                    // Bloqueia qualquer ação
                    return;
                }
        // Bloqueia toda interação e qualquer envio de requisição se a UI de conexão perdida estiver aberta
        const lostUi = document.getElementById('connection-lost-ui');
        if (lostUi && lostUi.style.display !== 'none') {
            // Desabilita completamente o envio de requisições
            if (this.wsClient) {
                this.wsClient.send = () => {};
            }
            return;
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


        // Declara hud e pokemons antes do uso
        const player = this.gameState.localPlayer;
        const hud = this.renderer.hud;

        // Navegação na lista de pokémons do player (só se player existir)
        const pokemons = player && player.pokemons ? player.pokemons : [];

        // Seleção de pokémon com Enter (tem prioridade sobre chat)
        if (hud && hud.pokemonSelectionActive && pokemons.length > 0) {
            if (this.keyboard.isKeyPressed('Escape')) {
                hud.deactivatePokemonSelection();
                return;
            }
            if (this.keyboard.isKeyPressed('ArrowUp')) {
                hud.movePokemonSelection(-1, pokemons.length);
                return;
            }
            if (this.keyboard.isKeyPressed('ArrowDown')) {
                hud.movePokemonSelection(1, pokemons.length);
                return;
            }
            // Selecionar pokémon com Enter (envia evento de transformação)
            if (this.keyboard.isKeyPressed('Enter')) {
                const idx = hud.selectedPokemonIndex;
                const selected = pokemons[idx];
                if (selected && selected.name) {
                    this.wsClient.send('request_transform_pokemon', { pokemonName: selected.name });
                }
                hud.deactivatePokemonSelection();
                return;
            }
            return;
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
        
        // Bloqueia I e P se a UI de comandos GM estiver aberta
        const gmUi = document.getElementById('gm-commands-ui');
        const gmUiOpen = gmUi && gmUi.style.display !== 'none';

        // GM/ADM (vocation 4) z-level change with + and -
        const playerLoc = this.gameState.localPlayer;
        if (playerLoc && playerLoc.vocation === 4 && !gmUiOpen) {
            // Accept both numpad and main +/-, and ignore if inventory/chat/other UI is open
            if (this.keyboard.isKeyPressed('+') || this.keyboard.isKeyPressed('numpadadd')) {
                // Increase z (go up)
                this.wsClient.send('gm_change_z', { direction: 'up', x: playerLoc.x, y: playerLoc.y, z: playerLoc.z });
                this.renderer.chatBox.addMessage('System', 'Solicitado: subir andar (z+1)', 'system');
                return;
            }
            if (this.keyboard.isKeyPressed('-') || this.keyboard.isKeyPressed('numpadsubtract')) {
                // Decrease z (go down)
                this.wsClient.send('gm_change_z', { direction: 'down', x: playerLoc.x, y: playerLoc.y, z: playerLoc.z });
                this.renderer.chatBox.addMessage('System', 'Solicitado: descer andar (z-1)', 'system');
                return;
            }
        }
        // Toggle do inventário com tecla I (só funciona quando chat NÃO está ativo e GM UI não está aberta)
        if (this.keyboard.isKeyPressed('i') && !gmUiOpen) {
            this.inventoryManager.toggle();
            console.log('[Game] Inventário toggled');
            return;
        }
        // Toggle do seletor de outfit com tecla p (igual ao inventário e NPC, e GM UI não está aberta)
        if (this.keyboard.isKeyPressed('p') && !gmUiOpen) {
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
            // Só permite interagir se estiver como humano
            if (player && !player.pokemonName) {
                this.tryInteractWithNpc();
            } else {
                this.renderer.chatBox.addMessage('System', 'Só é possível interagir com NPCs na forma humana.', 'system');
            }
            return;
        }
        
        if (!player) return;
        
        // Sempre atualiza isWalking ANTES do cooldown de movimento
        // Considere "andando" se qualquer tecla de movimento está pressionada OU foi pressionada neste frame
        // ...nenhuma lógica de isWalking aqui...

        // Previne input durante movimento (cooldown natural)
        if (player.isMoving && player.moveProgress < 0.7) {
            return;
        }
        
        // Use isKeyPressed para consumir o evento corretamente
        if (this.keyboard.isKeyPressed('o')) {
            if (!hud.pokemonSelectionActive) {
                hud.activatePokemonSelection();
                return;
            } else {
                hud.deactivatePokemonSelection();
                // Ao sair do modo seleção, libera movimento imediatamente
                // (não faz return aqui, permite cair no bloco de movimento abaixo)
            }
        }
        if (hud.pokemonSelectionActive && pokemons.length > 0) {
            if (this.keyboard.isKeyPressed('Escape')) {
                hud.deactivatePokemonSelection();
                return;
            }
            if (this.keyboard.isKeyPressed('ArrowUp')) {
                hud.movePokemonSelection(-1, pokemons.length);
                return;
            }
            if (this.keyboard.isKeyPressed('ArrowDown')) {
                hud.movePokemonSelection(1, pokemons.length);
                return;
            }
            // Selecionar pokémon com Enter (respeita cooldown)
            if (this.keyboard.isKeyPressed('Enter')) {
                const idx = hud.selectedPokemonIndex;
                const selected = pokemons[idx];
                if (selected && selected.name) {
                    // Se for skill, respeita cooldown
                    if (selected.skills && selected.skills.length) {
                        for (const skill of selected.skills) {
                            if (skill && skill.name) this.useSkillWithCooldown(skill.name, skill, player);
                        }
                    } else {
                        // Se for só troca de sprite, transforma normalmente
                        this.wsClient.send('request_transform_pokemon', { pokemonName: selected.name });
                    }
                }
                hud.deactivatePokemonSelection();
                return;
            }
            return;
        }

        // Movimento via teclado com predição visual (só se não estiver selecionando pokémon)
        if (!hud.pokemonSelectionActive) {
            // Suporte a Ctrl+Seta para virar sem mover
            let direction = null;
            let ctrlPressed = this.keyboard.isKeyDown('Control') || this.keyboard.isKeyDown('control');
            if ((this.keyboard.isKeyPressed('ArrowUp') || this.keyboard.isKeyPressed('w'))) direction = 'up';
            else if ((this.keyboard.isKeyPressed('ArrowDown') || this.keyboard.isKeyPressed('s'))) direction = 'down';
            else if ((this.keyboard.isKeyPressed('ArrowLeft') || this.keyboard.isKeyPressed('a'))) direction = 'left';
            else if ((this.keyboard.isKeyPressed('ArrowRight') || this.keyboard.isKeyPressed('d'))) direction = 'right';

            if (direction) {
                if (ctrlPressed) {
                    // Apenas vira o player, envia evento TURN para o servidor
                    this.wsClient.send('turn', { direction });
                    if (player.startPrediction) player.startPrediction(direction);
                } else {
                    // Checa colisão para tentar andar
                    const map = this.gameState.map;
                    let dx = 0, dy = 0;
                    if (direction === 'up') dy = -1;
                    else if (direction === 'down') dy = 1;
                    else if (direction === 'left') dx = -1;
                    else if (direction === 'right') dx = 1;
                    const x = player.x + dx;
                    const y = player.y + dy;
                    const z = player.z;
                    let blocked = false;
                    if (map && map.isBlocked) {
                        blocked = map.isBlocked(x, y, z);
                    }
                    // Só anda se não estiver bloqueado e não estiver em cooldown
                    if (!blocked && !player.isMoving && !this._moveBuffer) {
                        if (player.startPrediction) player.startPrediction(direction);
                        this._moveBuffer = {
                            direction,
                            frameCount: 0
                        };
                    } else if (blocked) {
                        // Se bloqueado, envia evento TURN para o servidor
                        this.wsClient.send('turn', { direction });
                        if (player.startPrediction) player.startPrediction(direction);
                    }
                }
            }
            // MoveBuffer: espera ciclo de animação
            if (this._moveBuffer) {
                this._moveBuffer.frameCount++;
                if (this._moveBuffer.frameCount >= 3) {
                    this.sendMoveCommand(this._moveBuffer.direction);
                    if (player.cancelPrediction) player.cancelPrediction();
                    this._moveBuffer = null;
                }
            }
            // Detecta tecla V para exibir informações contextuais
            if (this.keyboard.isKeyPressed('v')) {
                this.showInfoInFrontOfPlayer();
            }
            // Atualiza isWalking para animar enquanto espera
            const moveKeyDown = this.keyboard.isKeyDown('ArrowUp') || this.keyboard.isKeyDown('w') ||
                                this.keyboard.isKeyDown('ArrowDown') || this.keyboard.isKeyDown('s') ||
                                this.keyboard.isKeyDown('ArrowLeft') || this.keyboard.isKeyDown('a') ||
                                this.keyboard.isKeyDown('ArrowRight') || this.keyboard.isKeyDown('d');
            player.isWalking = moveKeyDown || !!this._moveBuffer;
        } else {
            player.isWalking = false;
        }

    }

    showInfoInFrontOfPlayer() {
        const player = this.gameState.localPlayer;
        if (!player) return;
        // Calcula posição à frente
        let dx = 0, dy = 0;
        switch (player.direction) {
            case 'up': dy = -1; break;
            case 'down': dy = 1; break;
            case 'left': dx = -1; break;
            case 'right': dx = 1; break;
        }
        const x = player.x + dx;
        const y = player.y + dy;
        const z = player.z;
        // Busca entidade à frente: NPC
        let found = null;
        for (const [id, npc] of this.gameState.npcs) {
            if (npc.x === x && npc.y === y && npc.z === z) {
                found = { type: 'npc', data: npc };
                break;
            }
        }
        // Player
        if (!found) {
            for (const [id, p] of this.gameState.players) {
                if (p.x === x && p.y === y && p.z === z && p.id !== player.id) {
                    found = { type: 'player', data: p };
                    break;
                }
            }
        }
        // Pokémon selvagem
        if (!found && this.wildPokemonManager) {
            for (const [id, poke] of this.wildPokemonManager.getAll()) {
                if (poke.x === x && poke.y === y && poke.z === z) {
                    found = { type: 'pokemon', data: poke };
                    break;
                }
            }
        }
        // Tile/cenário
        let tile = null;
        if (!found && this.gameState.map) {
            tile = this.gameState.map.getTile(x, y, z);
            if (tile) {
                found = { type: 'tile', data: tile };
            }
        }
        // Monta info
        let html = '';
        if (found) {
            if (found.type === 'npc') {
                html = `<b>NPC:</b> ${found.data.name || 'Desconhecido'}<br>ID: ${found.data.id}`;
            } else if (found.type === 'player') {
                html = `<b>Player:</b> ${found.data.name || 'Desconhecido'}<br>Level: ${found.data.level || '?'}<br>ID: ${found.data.id}`;
            } else if (found.type === 'pokemon') {
                html = `<b>Pokémon:</b> ${found.data.name || 'Desconhecido'}<br>Level: ${found.data.level || '?'}<br>ID: ${found.data.id}`;
            } else if (found.type === 'tile') {
                html = `<b>Tile:</b> [${x},${y},${z}]<br>Sprites: ${(found.data.spriteIds || []).join(', ')}`;
            }
        } else {
            html = 'Nada encontrado à frente.';
        }
        this.infoPanelUI.show(html);
        // Esconde painel após 2.5s
        clearTimeout(this._infoPanelTimeout);
		this._infoPanelTimeout = setTimeout(() => this.infoPanelUI.hide(), 2500);
        }

    showMapBlockAlert() {
        // Cria alerta pequeno no centro/topo
        let alert = document.getElementById('map-block-alert');
        if (!alert) {
            alert = document.createElement('div');
            alert.id = 'map-block-alert';
            alert.style.position = 'fixed';
            alert.style.top = '12%';
            alert.style.left = '50%';
            alert.style.transform = 'translate(-50%, 0)';
            alert.style.background = 'rgba(30,30,30,0.95)';
            alert.style.color = '#FFD700';
            alert.style.padding = '12px 32px';
            alert.style.borderRadius = '10px';
            alert.style.fontSize = '1.2em';
            alert.style.zIndex = '10020';
            alert.style.boxShadow = '0 2px 16px #000a';
            alert.textContent = 'Feche o mapa para se locomover!';
            document.body.appendChild(alert);
        }
        alert.style.display = 'block';
        setTimeout(() => {
            alert.style.display = 'none';
        }, 1600);
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
        // Toda a lógica de renderização foi movida para Renderer.js
        this.renderer.render(this.gameState, this.skillEffectManager, this.inventoryManager);
    }
}
