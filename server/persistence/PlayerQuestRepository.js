import { Logger } from '../utils/Logger.js';

const logger = new Logger('PlayerQuestRepository');

function safeParse(v) {
    try {
        if (v == null) return null;
        if (Buffer.isBuffer(v)) return JSON.parse(v.toString());
        if (typeof v === 'string') return JSON.parse(v);
        return JSON.parse(String(v));
    } catch {
        return null;
    }
}

export class PlayerQuestRepository {
    constructor(database) {
        this.db = database;
    }

    async ensureTables() {
        const sql = `
            CREATE TABLE IF NOT EXISTS player_quests (
                player_id INT NOT NULL,
                quest_id VARCHAR(100) NOT NULL,
                status VARCHAR(20) NOT NULL,
                current_stage_index INT NOT NULL DEFAULT 0,
                state_json LONGTEXT NULL,
                started_at BIGINT NULL,
                updated_at BIGINT NULL,
                completed_at BIGINT NULL,
                PRIMARY KEY (player_id, quest_id),
                INDEX idx_player_quests_player (player_id),
                INDEX idx_player_quests_status (status),
                CONSTRAINT fk_player_quests_player FOREIGN KEY (player_id)
                    REFERENCES players(id)
                    ON DELETE CASCADE,
                CONSTRAINT fk_player_quests_quest FOREIGN KEY (quest_id)
                    REFERENCES quests(quest_id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        await this.db.update(sql);
        logger.info('[QUEST] ensureTables ok');
    }

    async listByPlayerId(playerId) {
        const rows = await this.db.query('SELECT * FROM player_quests WHERE player_id = ?', [playerId]);
        return (rows || []).map(r => this._mapRow(r));
    }

    async listActiveByPlayerId(playerId) {
        const rows = await this.db.query(
            'SELECT * FROM player_quests WHERE player_id = ? AND status = ?',
            [playerId, 'IN_PROGRESS']
        );
        return (rows || []).map(r => this._mapRow(r));
    }

    async upsertState(playerId, questId, state) {
        const status = state?.status || 'IN_PROGRESS';
        const currentStageIndex = Number.isInteger(state?.currentStageIndex) ? state.currentStageIndex : 0;
        const stateJson = state?.state ? JSON.stringify(state.state) : null;
        const startedAt = state?.startedAt ?? null;
        const updatedAt = state?.updatedAt ?? Date.now();
        const completedAt = state?.completedAt ?? null;

        const sql = `
            INSERT INTO player_quests (
                player_id, quest_id, status, current_stage_index,
                state_json, started_at, updated_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                current_stage_index = VALUES(current_stage_index),
                state_json = VALUES(state_json),
                started_at = VALUES(started_at),
                updated_at = VALUES(updated_at),
                completed_at = VALUES(completed_at)
        `;

        await this.db.update(sql, [
            playerId,
            questId,
            status,
            currentStageIndex,
            stateJson,
            startedAt,
            updatedAt,
            completedAt
        ]);
    }

    async markCompleted(playerId, questId, completedAt = Date.now()) {
        const sql = `
            UPDATE player_quests
            SET status = 'COMPLETED', completed_at = ?, updated_at = ?
            WHERE player_id = ? AND quest_id = ?
        `;
        await this.db.update(sql, [completedAt, Date.now(), playerId, questId]);
    }

    _mapRow(r) {
        return {
            playerId: r.player_id,
            questId: r.quest_id,
            status: r.status,
            currentStageIndex: r.current_stage_index,
            state: r.state_json ? safeParse(r.state_json) : null,
            startedAt: r.started_at,
            updatedAt: r.updated_at,
            completedAt: r.completed_at
        };
    }
}
