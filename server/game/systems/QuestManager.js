/**
 * QuestManager (server-side)
 *
 * Núcleo do sistema de quests estilo Tibia.
 * - Event-driven (kill/collect/talk/location)
 * - Persistência em tabelas dedicadas:
 *    - quests (lista de quests existentes)
 *    - player_quests (status/progresso por player)
 * - Desacoplado de UI: emite eventos (quest_sync/quest_update + chatMessage NPC)
 */

import { Logger } from '../../utils/Logger.js';
import { QuestDefinitions, QuestObjectiveType, QuestStatus } from '../quests/QuestDefinitions.js';

const logger = new Logger('QuestManager');

const YES_WORDS = new Set(['yes', 'y', 'sim', 's']);
const NO_WORDS = new Set(['no', 'n', 'nao', 'não']);

function ensureObject(v, fallback = {}) {
    return (v && typeof v === 'object') ? v : fallback;
}

function nowTs() {
    return Date.now();
}

export class QuestManager {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
        this.questById = new Map();

        // Cache em memória por playerId (dbId)
        // { byQuestId: Map<questId, { status, currentStageIndex, state, startedAt, updatedAt, completedAt }> }
        this._playerCache = new Map();

        // Debounce de persistência (player_quests)
        this._pendingPersistTimers = new Map();

        this.registerAll(QuestDefinitions);
        logger.info(`[QUEST] QuestManager inicializado com ${this.questById.size} quests`);
    }

    registerAll(defs) {
        for (const def of defs || []) {
            if (!def?.questId) continue;
            this.questById.set(def.questId, def);
        }
    }

    _getPlayerId(player) {
        return player?.dbId ?? null;
    }

    _getOrCreateCache(playerId) {
        if (!this._playerCache.has(playerId)) {
            this._playerCache.set(playerId, { byQuestId: new Map() });
        }
        return this._playerCache.get(playerId);
    }

    _getRow(playerId, questId) {
        return this._playerCache.get(playerId)?.byQuestId?.get(questId) || null;
    }

    _schedulePersist(playerId, questId, delayMs = 900) {
        const key = `${playerId}:${questId}`;
        if (this._pendingPersistTimers.has(key)) return;

        const t = setTimeout(async () => {
            this._pendingPersistTimers.delete(key);

            const repo = this.gameWorld?.playerQuestRepository;
            if (!repo) return;

            const row = this._getRow(playerId, questId);
            if (!row) return;

            try {
                await repo.upsertState(playerId, questId, {
                    status: row.status,
                    currentStageIndex: row.currentStageIndex,
                    state: row.state,
                    startedAt: row.startedAt,
                    updatedAt: nowTs(),
                    completedAt: row.completedAt
                });
            } catch (e) {
                logger.warn('[QUEST] Falha ao persistir player_quest:', e?.message || e);
            }
        }, delayMs);

        this._pendingPersistTimers.set(key, t);
    }

    _getSummary(playerId) {
        const active = [];
        const completed = [];
        const failed = [];

        for (const [questId, row] of this._playerCache.get(playerId)?.byQuestId || []) {
            if (row.status === QuestStatus.IN_PROGRESS) active.push(questId);
            else if (row.status === QuestStatus.COMPLETED) completed.push(questId);
            else if (row.status === QuestStatus.FAILED) failed.push(questId);
        }

        return { active, completed, failed };
    }

    /**
     * Carrega quests do player do banco para cache.
     * Também faz migração 1x caso exista legado em player.conditions.quests.
     */
    async primePlayer(player) {
        const playerId = this._getPlayerId(player);
        if (!playerId) return;

        const repo = this.gameWorld?.playerQuestRepository;
        if (!repo) return;

        const cache = this._getOrCreateCache(playerId);
        cache.byQuestId.clear();

        const rows = await repo.listByPlayerId(playerId);
        for (const r of rows) {
            cache.byQuestId.set(r.questId, {
                status: r.status,
                currentStageIndex: r.currentStageIndex,
                state: r.state,
                startedAt: r.startedAt,
                updatedAt: r.updatedAt,
                completedAt: r.completedAt
            });
        }

        // Migração automática do modelo antigo (conditions.quests)
        const legacy = player?.conditions?.quests;
        const hasLegacy = legacy && typeof legacy === 'object' && (
            (legacy.active && Object.keys(legacy.active).length > 0) ||
            (legacy.completed && Object.keys(legacy.completed).length > 0) ||
            (legacy.failed && Object.keys(legacy.failed).length > 0)
        );

        if (rows.length === 0 && hasLegacy) {
            logger.info(`[QUEST] Migrando conditions.quests -> player_quests para playerId=${playerId}`);

            const active = legacy.active || {};
            const completed = legacy.completed || {};
            const failed = legacy.failed || {};

            for (const [questId, state] of Object.entries(active)) {
                await repo.upsertState(playerId, questId, {
                    status: QuestStatus.IN_PROGRESS,
                    currentStageIndex: state?.currentStageIndex ?? 0,
                    state: state || null,
                    startedAt: state?.startedAt ?? nowTs(),
                    updatedAt: nowTs(),
                    completedAt: null
                }).catch(() => {});
            }

            for (const [questId, state] of Object.entries(completed)) {
                await repo.upsertState(playerId, questId, {
                    status: QuestStatus.COMPLETED,
                    currentStageIndex: state?.currentStageIndex ?? 0,
                    state: state || null,
                    startedAt: state?.startedAt ?? null,
                    updatedAt: nowTs(),
                    completedAt: state?.completedAt ?? nowTs()
                }).catch(() => {});
            }

            for (const [questId, state] of Object.entries(failed)) {
                await repo.upsertState(playerId, questId, {
                    status: QuestStatus.FAILED,
                    currentStageIndex: state?.currentStageIndex ?? 0,
                    state: state || null,
                    startedAt: state?.startedAt ?? null,
                    updatedAt: nowTs(),
                    completedAt: state?.completedAt ?? null
                }).catch(() => {});
            }

            try {
                delete player.conditions.quests;
                await this.gameWorld?.savePlayer?.(player);
            } catch {}

            // Recarrega cache
            const rows2 = await repo.listByPlayerId(playerId);
            cache.byQuestId.clear();
            for (const r of rows2) {
                cache.byQuestId.set(r.questId, {
                    status: r.status,
                    currentStageIndex: r.currentStageIndex,
                    state: r.state,
                    startedAt: r.startedAt,
                    updatedAt: r.updatedAt,
                    completedAt: r.completedAt
                });
            }
        }
    }

    getQuestStatus(player, questId) {
        const playerId = this._getPlayerId(player);
        if (!playerId) return QuestStatus.NOT_STARTED;
        const row = this._getRow(playerId, questId);
        return row?.status || QuestStatus.NOT_STARTED;
    }

    getActiveQuestState(player, questId) {
        const playerId = this._getPlayerId(player);
        if (!playerId) return null;
        const row = this._getRow(playerId, questId);
        if (!row || row.status !== QuestStatus.IN_PROGRESS) return null;
        return row.state || null;
    }

    meetsRequirements(player, questDef) {
        const req = questDef?.requirements;
        if (!req) return true;

        if (typeof req.minLevel === 'number') {
            if ((player.level || 1) < req.minLevel) return false;
        }

        const requiredCompleted = Array.isArray(req.requiredQuestsCompleted) ? req.requiredQuestsCompleted : [];
        for (const qid of requiredCompleted) {
            if (this.getQuestStatus(player, qid) !== QuestStatus.COMPLETED) return false;
        }

        return true;
    }

    startQuest(player, questId) {
        const questDef = this.questById.get(questId);
        if (!questDef) return { ok: false, reason: 'quest_not_found' };

        const playerId = this._getPlayerId(player);
        if (!playerId) return { ok: false, reason: 'invalid_player' };

        const currentStatus = this.getQuestStatus(player, questId);
        if (currentStatus === QuestStatus.COMPLETED) return { ok: false, reason: 'already_completed' };
        if (currentStatus === QuestStatus.IN_PROGRESS) return { ok: false, reason: 'already_in_progress' };

        if (!this.meetsRequirements(player, questDef)) {
            return { ok: false, reason: 'requirements_not_met' };
        }

        const questState = {
            questId,
            status: QuestStatus.IN_PROGRESS,
            startedAt: nowTs(),
            currentStageIndex: 0,
            stages: {}
        };

        this._startStage(questDef, questState, 0);

        const cache = this._getOrCreateCache(playerId);
        cache.byQuestId.set(questId, {
            status: QuestStatus.IN_PROGRESS,
            currentStageIndex: questState.currentStageIndex,
            state: questState,
            startedAt: questState.startedAt,
            updatedAt: nowTs(),
            completedAt: null
        });

        this._schedulePersist(playerId, questId, 1);
        this._notifyQuestUpdate(player, questId);

        return { ok: true };
    }

    _startStage(questDef, questState, stageIndex) {
        const stage = questDef.stages?.[stageIndex];
        if (!stage) return;

        questState.currentStageIndex = stageIndex;
        questState.currentStageId = stage.stageId;

        questState.stages = ensureObject(questState.stages, {});
        const stageState = questState.stages[stage.stageId] || {
            stageId: stage.stageId,
            startedAt: nowTs(),
            completedAt: null,
            objectives: {}
        };

        stageState.objectives = ensureObject(stageState.objectives, {});

        for (const obj of stage.objectives || []) {
            if (!obj?.objectiveId) continue;
            stageState.objectives[obj.objectiveId] = stageState.objectives[obj.objectiveId] || {
                objectiveId: obj.objectiveId,
                type: obj.type,
                currentAmount: 0,
                requiredAmount: obj.requiredAmount || 1,
                completed: false
            };
        }

        questState.stages[stage.stageId] = stageState;
    }

    _isStageComplete(questDef, questState) {
        const stage = questDef.stages?.[questState.currentStageIndex];
        if (!stage) return true;
        const stageState = questState.stages?.[stage.stageId];
        if (!stageState) return false;

        for (const obj of stage.objectives || []) {
            const o = stageState.objectives?.[obj.objectiveId];
            if (!o || !o.completed) return false;
        }
        return true;
    }

    _completeStageIfPossible(player, questDef, questState) {
        const stage = questDef.stages?.[questState.currentStageIndex];
        if (!stage) return;

        if (!this._isStageComplete(questDef, questState)) return;

        const stageState = questState.stages?.[stage.stageId];
        if (stageState && !stageState.completedAt) stageState.completedAt = nowTs();

        if (stage.autoComplete) {
            const nextIndex = questState.currentStageIndex + 1;
            if (questDef.stages?.[nextIndex]) {
                this._startStage(questDef, questState, nextIndex);
                this._notifyQuestUpdate(player, questDef.questId);
            } else {
                this.completeQuest(player, questDef.questId);
            }
        }
    }

    completeQuest(player, questId) {
        const questDef = this.questById.get(questId);
        if (!questDef) return { ok: false, reason: 'quest_not_found' };

        const playerId = this._getPlayerId(player);
        if (!playerId) return { ok: false, reason: 'invalid_player' };

        const row = this._getRow(playerId, questId);
        if (!row || row.status !== QuestStatus.IN_PROGRESS) return { ok: false, reason: 'not_in_progress' };

        row.status = QuestStatus.COMPLETED;
        row.completedAt = nowTs();
        row.updatedAt = row.completedAt;

        // Rewards podem precisar persistir o player (XP/flags)
        this._applyRewards(player, questDef.rewards);

        this._schedulePersist(playerId, questId, 1);
        this._notifyQuestUpdate(player, questId);

        return { ok: true };
    }

    _applyRewards(player, rewards) {
        if (!player || !rewards) return;

        if (typeof rewards.xp === 'number' && rewards.xp > 0) {
            if (typeof player.gainExpAndCheckLevelUp === 'function') {
                const leveledUp = player.gainExpAndCheckLevelUp(rewards.xp);
                if (leveledUp && this.gameWorld) {
                    this.gameWorld?.savePlayer?.(player).catch?.(() => {});
                }
            } else {
                player.exp = (player.exp || 0) + rewards.xp;
            }
        }

        if (typeof rewards.gold === 'number' && rewards.gold > 0) {
            const dbId = player.dbId;
            if (dbId && this.gameWorld?.balanceRepository) {
                this.gameWorld.balanceRepository.addGold(dbId, rewards.gold)
                    .then((newBalance) => {
                        player.goldCoin = newBalance;
                    })
                    .catch(() => {});
            }
        }

        if (Array.isArray(rewards.items) && rewards.items.length > 0) {
            const gameWorld = this.gameWorld;
            for (const it of rewards.items) {
                const itemName = it?.itemName;
                const qty = it?.quantity ?? 1;
                if (!itemName) continue;
                if (gameWorld?.inventoryRepository && player.dbId) {
                    gameWorld.inventoryRepository.addItem(player.dbId, 'misc', itemName, qty).catch(() => {});
                }
            }
        }

        if (Array.isArray(rewards.flags) && rewards.flags.length > 0) {
            player.conditions = ensureObject(player.conditions);
            const flags = ensureObject(player.conditions.flags, {});
            for (const f of rewards.flags) {
                if (typeof f === 'string' && f.length > 0) flags[f] = true;
            }
            player.conditions.flags = flags;
            this.gameWorld?.savePlayer?.(player).catch?.(() => {});
        }
    }

    getQuestPublicState(player, questId) {
        const questDef = this.questById.get(questId);
        const status = this.getQuestStatus(player, questId);

        const base = {
            questId,
            status,
            title: questDef?.title,
            description: questDef?.description
        };

        const playerId = this._getPlayerId(player);
        if (!playerId) return base;

        const row = this._getRow(playerId, questId);
        if (!row) return base;

        if (status !== QuestStatus.IN_PROGRESS) {
            if (row.completedAt) base.completedAt = row.completedAt;
            return base;
        }

        const state = row.state;
        if (!state || !questDef) return base;

        const stage = questDef.stages?.[state.currentStageIndex];
        const stageState = stage ? state.stages?.[stage.stageId] : null;
        const objectives = [];

        for (const objDef of stage?.objectives || []) {
            const p = stageState?.objectives?.[objDef.objectiveId];
            objectives.push({
                objectiveId: objDef.objectiveId,
                type: objDef.type,
                description: objDef.description,
                currentAmount: p?.currentAmount ?? 0,
                requiredAmount: p?.requiredAmount ?? (objDef.requiredAmount || 1),
                completed: !!p?.completed
            });
        }

        return {
            ...base,
            startedAt: row.startedAt,
            currentStageIndex: state.currentStageIndex,
            currentStageId: state.currentStageId,
            stage: stage ? { stageId: stage.stageId, description: stage.description } : null,
            objectives
        };
    }

    _notifyQuestUpdate(player, questId) {
        try {
            const client = player?.clientState;
            const playerId = this._getPlayerId(player);
            if (!client?.send || !playerId) return;

            client.send('quest_update', {
                questId,
                quest: this.getQuestPublicState(player, questId),
                summary: this._getSummary(playerId)
            });
        } catch {
            // ignore
        }
    }

    _sendNpcChat(client, npcName, text) {
        if (!client?.send) return;
        client.send('chatMessage', {
            playerId: 0,
            playerName: npcName || 'NPC',
            message: text,
            type: 'npc',
            timestamp: nowTs()
        });
    }

    /**
     * NPC interaction entrypoint (estilo Tibia)
     * Retorna true se a quest "consumiu" a interação.
     */
    handleNpcInteract(client, npc) {
        const player = client?.player;
        if (!player || !npc) return false;

        // Falar com NPC conta como TALK objective
        this.onNpcTalked(player, npc.id);

        if (client.pendingQuestPrompt) {
            // Só "consome" a interação se for com o mesmo NPC que abriu o prompt.
            if (client.pendingQuestPrompt.npcId === npc.id) {
                this._sendNpcChat(client, npc.name, 'Diga "yes" ou "no" para responder.');
                return true;
            }
            return false;
        }

        // Offer quests não iniciadas
        const offered = [];
        for (const questDef of this.questById.values()) {
            if (questDef.npcGiverId !== npc.id) continue;
            const status = this.getQuestStatus(player, questDef.questId);
            if (status === QuestStatus.NOT_STARTED && this.meetsRequirements(player, questDef)) {
                offered.push(questDef);
            }
        }

        if (offered.length > 0) {
            const q = offered[0];
            client.pendingQuestPrompt = {
                npcId: npc.id,
                npcName: npc.name,
                action: 'start',
                questId: q.questId
            };
            this._sendNpcChat(client, npc.name, `Hello adventurer. Do you want to start the quest "${q.title}"? (yes/no)`);
            return true;
        }

        // Quest em andamento com esse NPC
        for (const questDef of this.questById.values()) {
            if (questDef.npcGiverId !== npc.id) continue;
            const state = this.getActiveQuestState(player, questDef.questId);
            if (!state) continue;

            const stage = questDef.stages?.[state.currentStageIndex];
            if (stage) {
                this._completeStageIfPossible(player, questDef, state);

                // Atualiza cache/DB
                const playerId = this._getPlayerId(player);
                const row = playerId ? this._getRow(playerId, questDef.questId) : null;
                if (row) {
                    row.state = state;
                    row.currentStageIndex = state.currentStageIndex;
                    row.updatedAt = nowTs();
                    this._schedulePersist(playerId, questDef.questId);
                }

                const newState = this.getActiveQuestState(player, questDef.questId);
                const newStage = newState ? questDef.stages?.[newState.currentStageIndex] : null;
                if (newStage) {
                    this._sendNpcChat(client, npc.name, `Quest: ${questDef.title} | Stage: ${newStage.description}`);
                    return true;
                }

                // Se a quest acabou de ser concluída aqui, avisa o jogador.
                if (this.getQuestStatus(player, questDef.questId) === QuestStatus.COMPLETED) {
                    this._sendNpcChat(client, npc.name, `Quest concluída: ${questDef.title}. Obrigado pela ajuda!`);
                }

                // Não consome a interação: permite heal/shop do NPC normalmente.
                return false;
            }
        }

        // Já completou
        for (const questDef of this.questById.values()) {
            if (questDef.npcGiverId !== npc.id) continue;
            if (this.getQuestStatus(player, questDef.questId) === QuestStatus.COMPLETED) {
                this._sendNpcChat(client, npc.name, 'Obrigado novamente pela ajuda!');
                // Não consome: deixa o NPC funcionar (heal/shop).
                return false;
            }
        }

        return false;
    }

    handleChatResponse(client, rawMessage) {
        if (!client?.pendingQuestPrompt) return { handled: false };

        const message = String(rawMessage || '').trim().toLowerCase();
        const prompt = client.pendingQuestPrompt;

        if (!YES_WORDS.has(message) && !NO_WORDS.has(message)) {
            return { handled: false };
        }

        const npcName = prompt.npcName || 'NPC';

        if (NO_WORDS.has(message)) {
            this._sendNpcChat(client, npcName, 'Tudo bem. Talvez outra hora.');
            client.pendingQuestPrompt = null;
            return { handled: true };
        }

        if (prompt.action === 'start') {
            const res = this.startQuest(client.player, prompt.questId);
            if (res.ok) {
                this._sendNpcChat(client, npcName, 'Excelente! Sua missão começou.');
                try {
                    this.onNpcTalked(client.player, prompt.npcId);
                } catch {}
            } else if (res.reason === 'requirements_not_met') {
                this._sendNpcChat(client, npcName, 'Você ainda não atende os requisitos para essa missão.');
            } else {
                this._sendNpcChat(client, npcName, 'Não foi possível iniciar essa missão agora.');
            }
            client.pendingQuestPrompt = null;
            return { handled: true };
        }

        client.pendingQuestPrompt = null;
        return { handled: true };
    }

    onEnemyKilled(player, enemyName, amount = 1) {
        const playerId = this._getPlayerId(player);
        if (!playerId) return;

        const cache = this._getOrCreateCache(playerId);
        for (const [questId, row] of cache.byQuestId.entries()) {
            if (row.status !== QuestStatus.IN_PROGRESS) continue;

            const questDef = this.questById.get(questId);
            const questState = row.state;
            if (!questDef || !questState) continue;

            const stage = questDef.stages?.[questState.currentStageIndex];
            if (!stage) continue;
            const stageState = questState.stages?.[stage.stageId];
            if (!stageState) continue;

            let changed = false;

            for (const objDef of stage.objectives || []) {
                if (objDef.type !== QuestObjectiveType.KILL) continue;
                const progress = stageState.objectives?.[objDef.objectiveId];
                if (!progress || progress.completed) continue;

                const prefix = objDef.enemyNamePrefix;
                const exact = objDef.enemyName;
                const matches = (exact && enemyName === exact) || (prefix && String(enemyName || '').startsWith(prefix));
                if (!matches) continue;

                progress.currentAmount = Math.min(progress.requiredAmount, (progress.currentAmount || 0) + amount);
                if (progress.currentAmount >= progress.requiredAmount) {
                    progress.completed = true;
                }
                changed = true;
            }

            if (changed) {
                this._completeStageIfPossible(player, questDef, questState);
                row.currentStageIndex = questState.currentStageIndex;
                row.updatedAt = nowTs();
                this._schedulePersist(playerId, questId);
                this._notifyQuestUpdate(player, questId);
            }
        }
    }

    onItemCollected(player, itemName, amount = 1) {
        const playerId = this._getPlayerId(player);
        if (!playerId) return;

        const cache = this._getOrCreateCache(playerId);
        for (const [questId, row] of cache.byQuestId.entries()) {
            if (row.status !== QuestStatus.IN_PROGRESS) continue;

            const questDef = this.questById.get(questId);
            const questState = row.state;
            if (!questDef || !questState) continue;

            const stage = questDef.stages?.[questState.currentStageIndex];
            if (!stage) continue;
            const stageState = questState.stages?.[stage.stageId];
            if (!stageState) continue;

            let changed = false;
            for (const objDef of stage.objectives || []) {
                if (objDef.type !== QuestObjectiveType.COLLECT) continue;
                const progress = stageState.objectives?.[objDef.objectiveId];
                if (!progress || progress.completed) continue;

                if (objDef.itemName !== itemName) continue;

                progress.currentAmount = Math.min(progress.requiredAmount, (progress.currentAmount || 0) + amount);
                if (progress.currentAmount >= progress.requiredAmount) {
                    progress.completed = true;
                }
                changed = true;
            }

            if (changed) {
                this._completeStageIfPossible(player, questDef, questState);
                row.currentStageIndex = questState.currentStageIndex;
                row.updatedAt = nowTs();
                this._schedulePersist(playerId, questId);
                this._notifyQuestUpdate(player, questId);
            }
        }
    }

    onNpcTalked(player, npcId) {
        const playerId = this._getPlayerId(player);
        if (!playerId) return;

        const cache = this._getOrCreateCache(playerId);
        for (const [questId, row] of cache.byQuestId.entries()) {
            if (row.status !== QuestStatus.IN_PROGRESS) continue;

            const questDef = this.questById.get(questId);
            const questState = row.state;
            if (!questDef || !questState) continue;

            const stage = questDef.stages?.[questState.currentStageIndex];
            if (!stage) continue;
            const stageState = questState.stages?.[stage.stageId];
            if (!stageState) continue;

            let changed = false;
            for (const objDef of stage.objectives || []) {
                if (objDef.type !== QuestObjectiveType.TALK) continue;
                if (objDef.npcId !== npcId) continue;

                const progress = stageState.objectives?.[objDef.objectiveId];
                if (!progress || progress.completed) continue;

                progress.currentAmount = Math.min(progress.requiredAmount, (progress.currentAmount || 0) + 1);
                if (progress.currentAmount >= progress.requiredAmount) {
                    progress.completed = true;
                }
                changed = true;
            }

            if (changed) {
                this._completeStageIfPossible(player, questDef, questState);
                row.currentStageIndex = questState.currentStageIndex;
                row.updatedAt = nowTs();
                this._schedulePersist(playerId, questId);
                this._notifyQuestUpdate(player, questId);
            }
        }
    }

    onPlayerMoved(player) {
        const playerId = this._getPlayerId(player);
        if (!playerId) return;

        const cache = this._getOrCreateCache(playerId);
        for (const [questId, row] of cache.byQuestId.entries()) {
            if (row.status !== QuestStatus.IN_PROGRESS) continue;

            const questDef = this.questById.get(questId);
            const questState = row.state;
            if (!questDef || !questState) continue;

            const stage = questDef.stages?.[questState.currentStageIndex];
            if (!stage) continue;
            const stageState = questState.stages?.[stage.stageId];
            if (!stageState) continue;

            let changed = false;
            for (const objDef of stage.objectives || []) {
                if (objDef.type !== QuestObjectiveType.LOCATION) continue;
                const progress = stageState.objectives?.[objDef.objectiveId];
                if (!progress || progress.completed) continue;

                const okZ = (typeof objDef.z === 'number') ? (player.z === objDef.z) : true;
                const okTown = (typeof objDef.town_id === 'number') ? ((player.town_id || 1) === objDef.town_id) : true;
                const radius = objDef.radius ?? 0;

                const dx = Math.abs((player.x || 0) - (objDef.x || 0));
                const dy = Math.abs((player.y || 0) - (objDef.y || 0));
                const inRange = dx <= radius && dy <= radius;

                if (okZ && okTown && inRange) {
                    progress.currentAmount = progress.requiredAmount;
                    progress.completed = true;
                    changed = true;
                }
            }

            if (changed) {
                this._completeStageIfPossible(player, questDef, questState);
                row.currentStageIndex = questState.currentStageIndex;
                row.updatedAt = nowTs();
                this._schedulePersist(playerId, questId);
                this._notifyQuestUpdate(player, questId);
            }
        }
    }
}
