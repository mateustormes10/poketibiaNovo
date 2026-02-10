/**
 * QuestDefinitions
 *
 * Definições de quests em formato declarativo (fácil de migrar para JSON no futuro).
 *
 * Observação: NPCs existentes no banco atualmente (npc_economy.sql):
 * - id=1 "Vendedor" (shop)
 * - id=2 "Enfermeira" (heal)
 *
 * Para manter compatibilidade, a quest exemplo usa npcGiverId=2.
 */

export const QuestObjectiveType = {
    KILL: 'kill',
    COLLECT: 'collect',
    TALK: 'talk',
    LOCATION: 'location'
};

export const QuestStatus = {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

/**
 * @typedef {Object} QuestDefinition
 * @property {string} questId
 * @property {string} title
 * @property {string} description
 * @property {number} npcGiverId
 * @property {Object=} requirements
 * @property {Object=} rewards
 * @property {Array} stages
 */

export const QuestDefinitions = [
    /**
     * Exemplo solicitado: “The First Mission”
     * Stage 1: falar com NPC (aceitar)
     * Stage 2: matar 5 "Skeleton*" (usando os spawns atuais)
     * Stage 3: voltar ao NPC
     */
    {
        questId: 'the_first_mission',
        title: 'The First Mission',
        description: 'Prove que você é capaz: elimine algumas criaturas e retorne para receber sua recompensa.',
        npcGiverId: 2, // Enfermeira
        requirements: {
            minLevel: 1,
            requiredQuestsCompleted: []
        },
        rewards: {
            xp: 100,
            gold: 50,
            items: [],
            flags: []
        },
        stages: [
            {
                stageId: 'accept_mission',
                description: 'Fale com a Enfermeira e aceite sua missão.',
                autoComplete: true,
                objectives: [
                    {
                        objectiveId: 'talk_to_nurse_accept',
                        type: QuestObjectiveType.TALK,
                        description: 'Fale com a Enfermeira.',
                        npcId: 2,
                        requiredAmount: 1
                    }
                ]
            },
            {
                stageId: 'kill_skeletons',
                description: 'Elimine 5 Skeletons.',
                autoComplete: true,
                objectives: [
                    {
                        objectiveId: 'kill_5_skeletons',
                        type: QuestObjectiveType.KILL,
                        description: 'Mate 5 Skeletons (qualquer variação).',
                        enemyNamePrefix: 'Skeleton',
                        requiredAmount: 5
                    }
                ]
            },
            {
                stageId: 'return_to_nurse',
                description: 'Volte e fale com a Enfermeira.',
                autoComplete: true,
                objectives: [
                    {
                        objectiveId: 'talk_to_nurse_finish',
                        type: QuestObjectiveType.TALK,
                        description: 'Fale com a Enfermeira novamente.',
                        npcId: 2,
                        requiredAmount: 1
                    }
                ]
            }
        ]
    }
];
