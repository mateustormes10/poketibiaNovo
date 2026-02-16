import { Logger } from '../utils/Logger.js';

const logger = new Logger('DetectionRepository');

export class DetectionRepository {
    constructor(database) {
        this.database = database;
    }

    async ensureTables() {
        // Use TEXT for details for broad MySQL compatibility.
        await this.database.query(`
            CREATE TABLE IF NOT EXISTS detection_events (
                id BIGINT NOT NULL AUTO_INCREMENT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                player_db_id BIGINT NULL,
                player_id VARCHAR(64) NULL,
                client_id VARCHAR(64) NULL,
                ip VARCHAR(64) NULL,
                user_agent VARCHAR(255) NULL,
                event_type VARCHAR(64) NOT NULL,
                severity TINYINT NOT NULL DEFAULT 1,
                details TEXT NULL,
                PRIMARY KEY (id),
                INDEX idx_detection_created_at (created_at),
                INDEX idx_detection_player_db_id (player_db_id),
                INDEX idx_detection_player_id (player_id),
                INDEX idx_detection_client_id (client_id),
                INDEX idx_detection_ip (ip),
                INDEX idx_detection_event_type (event_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        logger.info('detection_events table ensured');
    }

    async logEvent({
        eventType,
        severity = 1,
        playerDbId = null,
        playerId = null,
        clientId = null,
        ip = null,
        userAgent = null,
        details = null
    }) {
        try {
            const detailsText = details == null
                ? null
                : (typeof details === 'string' ? details : JSON.stringify(details));

            await this.database.insert(
                `INSERT INTO detection_events (
                    player_db_id, player_id, client_id, ip, user_agent,
                    event_type, severity, details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                , [
                    playerDbId,
                    playerId,
                    clientId,
                    ip,
                    userAgent,
                    eventType,
                    severity,
                    detailsText
                ]
            );
        } catch (e) {
            logger.warn('Failed to log detection event:', e?.message || e);
        }
    }
}
