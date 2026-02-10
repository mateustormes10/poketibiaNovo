import { Logger } from '../utils/Logger.js';

const logger = new Logger('QuestRepository');

export class QuestRepository {
    constructor(database) {
        this.db = database;
    }

    async ensureTables() {
        // Usando LONGTEXT para compatibilidade com MySQL/MariaDB (XAMPP)
        const sql = `
            CREATE TABLE IF NOT EXISTS quests (
                quest_id VARCHAR(100) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                npc_giver_id INT NULL,
                requirements_json LONGTEXT NULL,
                rewards_json LONGTEXT NULL,
                stages_json LONGTEXT NULL,
                enabled TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        await this.db.update(sql);
        logger.info('[QUEST] ensureTables ok');
    }

    async upsertFromDefinition(def) {
        const questId = def?.questId;
        if (!questId) return;

        const requirementsJson = def.requirements ? JSON.stringify(def.requirements) : null;
        const rewardsJson = def.rewards ? JSON.stringify(def.rewards) : null;
        const stagesJson = def.stages ? JSON.stringify(def.stages) : null;

        const sql = `
            INSERT INTO quests (
                quest_id, title, description, npc_giver_id,
                requirements_json, rewards_json, stages_json, enabled
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                description = VALUES(description),
                npc_giver_id = VALUES(npc_giver_id),
                requirements_json = VALUES(requirements_json),
                rewards_json = VALUES(rewards_json),
                stages_json = VALUES(stages_json),
                enabled = VALUES(enabled)
        `;

        await this.db.update(sql, [
            questId,
            def.title || questId,
            def.description || null,
            def.npcGiverId ?? null,
            requirementsJson,
            rewardsJson,
            stagesJson,
            def.enabled === false ? 0 : 1
        ]);
    }

    async seedFromDefinitions(defs = []) {
        for (const def of defs) {
            try {
                await this.upsertFromDefinition(def);
            } catch (e) {
                logger.warn(`[QUEST] Falha ao seed quest ${def?.questId}:`, e?.message || e);
            }
        }
        logger.info(`[QUEST] Seeded ${defs.length} quest definitions`);
    }

    async findById(questId) {
        const row = await this.db.queryOne('SELECT * FROM quests WHERE quest_id = ?', [questId]);
        if (!row) return null;
        return {
            questId: row.quest_id,
            title: row.title,
            description: row.description,
            npcGiverId: row.npc_giver_id,
            requirements: row.requirements_json ? safeParse(row.requirements_json) : null,
            rewards: row.rewards_json ? safeParse(row.rewards_json) : null,
            stages: row.stages_json ? safeParse(row.stages_json) : null,
            enabled: row.enabled === 1
        };
    }
}

function safeParse(v) {
    try {
        if (Buffer.isBuffer(v)) return JSON.parse(v.toString());
        if (typeof v === 'string') return JSON.parse(v);
        return JSON.parse(String(v));
    } catch {
        return null;
    }
}
