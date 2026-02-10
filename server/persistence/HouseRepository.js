import { Logger } from '../utils/Logger.js';

const logger = new Logger('HouseRepository');

// Model A (mundo único): houses físicas no mapa; interior faz parte do mundo.
export class HouseRepository {
    constructor(database) {
        this.db = database;
    }

    async ensureTables() {
        // Como o usuário informou que as tabelas atuais estão vazias, fazemos um upgrade simples.
        // Se algum dia existirem dados, preservamos (best-effort) evitando DROP quando houver registros.
        await this._ensureHouseLists();
        await this._ensureHouseAuctions();
        await this._ensureHouseData();
        logger.info('House tables ensured');
    }

    async _tableRowCount(tableName) {
        try {
            const row = await this.db.queryOne(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
            return Number(row?.cnt ?? 0);
        } catch {
            return null; // tabela não existe
        }
    }

    async _dropIfEmpty(tableName) {
        const cnt = await this._tableRowCount(tableName);
        if (cnt === 0) {
            await this.db.query(`DROP TABLE IF EXISTS \`${tableName}\``);
            return true;
        }
        return false;
    }

    async _ensureHouseLists() {
        // Se existir no formato antigo e estiver vazia, recria.
        await this._dropIfEmpty('house_lists');

        await this.db.query(`
            CREATE TABLE IF NOT EXISTS house_lists (
                house_id INT NOT NULL,
                map_id VARCHAR(64) NOT NULL,
                city_name VARCHAR(64) NOT NULL,
                door_x INT NOT NULL,
                door_y INT NOT NULL,
                door_z INT NOT NULL,
                area_from_x INT NOT NULL,
                area_from_y INT NOT NULL,
                area_to_x INT NOT NULL,
                area_to_y INT NOT NULL,
                area_z INT NOT NULL,
                size_sqm INT NOT NULL DEFAULT 0,
                rent_price INT NOT NULL DEFAULT 0,
                owner_id INT NULL,
                is_rented TINYINT(1) NOT NULL DEFAULT 0,
                last_paid_at DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (house_id),
                INDEX idx_house_lists_map (map_id, area_z),
                INDEX idx_house_lists_owner (owner_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
    }

    async _ensureHouseAuctions() {
        await this._dropIfEmpty('house_auctions');

        await this.db.query(`
            CREATE TABLE IF NOT EXISTS house_auctions (
                auction_id INT NOT NULL AUTO_INCREMENT,
                house_id INT NOT NULL,
                start_price INT NOT NULL DEFAULT 0,
                current_bid INT NOT NULL DEFAULT 0,
                current_winner_id INT NULL,
                auction_start_at DATETIME NOT NULL,
                auction_end_at DATETIME NOT NULL,
                status ENUM('OPEN','FINISHED','CANCELLED') NOT NULL DEFAULT 'OPEN',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (auction_id),
                UNIQUE KEY uq_house_auction_house (house_id),
                INDEX idx_house_auction_status_end (status, auction_end_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
    }

    async _ensureHouseData() {
        await this._dropIfEmpty('house_data');

        await this.db.query(`
            CREATE TABLE IF NOT EXISTS house_data (
                id INT NOT NULL AUTO_INCREMENT,
                house_id INT NOT NULL,
                item_id INT NOT NULL,
                amount INT NOT NULL DEFAULT 1,
                pos_x INT NOT NULL,
                pos_y INT NOT NULL,
                pos_z INT NOT NULL,
                extra_data JSON NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_house_data_house (house_id),
                INDEX idx_house_data_pos (pos_x, pos_y, pos_z)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
    }

    // ---- House lists ----
    async listHouses() {
        return await this.db.query('SELECT * FROM house_lists ORDER BY house_id ASC');
    }

    async getHouseById(houseId) {
        return await this.db.queryOne('SELECT * FROM house_lists WHERE house_id = ?', [houseId]);
    }

    async upsertHouse(house) {
        const sql = `
            INSERT INTO house_lists (
                house_id, map_id, city_name,
                door_x, door_y, door_z,
                area_from_x, area_from_y, area_to_x, area_to_y, area_z,
                size_sqm, rent_price, owner_id, is_rented, last_paid_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                map_id=VALUES(map_id),
                city_name=VALUES(city_name),
                door_x=VALUES(door_x),
                door_y=VALUES(door_y),
                door_z=VALUES(door_z),
                area_from_x=VALUES(area_from_x),
                area_from_y=VALUES(area_from_y),
                area_to_x=VALUES(area_to_x),
                area_to_y=VALUES(area_to_y),
                area_z=VALUES(area_z),
                size_sqm=VALUES(size_sqm),
                rent_price=VALUES(rent_price),
                owner_id=VALUES(owner_id),
                is_rented=VALUES(is_rented),
                last_paid_at=VALUES(last_paid_at)
        `;

        const params = [
            house.house_id,
            house.map_id,
            house.city_name,
            house.door_x,
            house.door_y,
            house.door_z,
            house.area_from_x,
            house.area_from_y,
            house.area_to_x,
            house.area_to_y,
            house.area_z,
            house.size_sqm ?? 0,
            house.rent_price ?? 0,
            house.owner_id ?? null,
            house.is_rented ? 1 : 0,
            house.last_paid_at ?? null
        ];

        await this.db.insert(sql, params);
        return true;
    }

    async setHouseOwner(houseId, ownerId) {
        return await this.db.update(
            'UPDATE house_lists SET owner_id = ?, is_rented = ?, last_paid_at = NOW() WHERE house_id = ?',
            [ownerId ?? null, ownerId ? 1 : 0, houseId]
        );
    }

    // ---- Auctions ----
    async getAuctionByHouseId(houseId) {
        return await this.db.queryOne('SELECT * FROM house_auctions WHERE house_id = ?', [houseId]);
    }

    async listOpenAuctions() {
        return await this.db.query("SELECT * FROM house_auctions WHERE status = 'OPEN'");
    }

    async upsertOpenAuction({ house_id, start_price, current_bid, current_winner_id, auction_start_at, auction_end_at }) {
        const sql = `
            INSERT INTO house_auctions (
                house_id, start_price, current_bid, current_winner_id,
                auction_start_at, auction_end_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
            ON DUPLICATE KEY UPDATE
                start_price=VALUES(start_price),
                current_bid=VALUES(current_bid),
                current_winner_id=VALUES(current_winner_id),
                auction_start_at=VALUES(auction_start_at),
                auction_end_at=VALUES(auction_end_at),
                status='OPEN'
        `;
        await this.db.insert(sql, [
            house_id,
            start_price ?? 0,
            current_bid ?? 0,
            current_winner_id ?? null,
            auction_start_at,
            auction_end_at
        ]);
        return true;
    }

    async updateAuctionBid({ house_id, current_bid, current_winner_id }) {
        return await this.db.update(
            'UPDATE house_auctions SET current_bid = ?, current_winner_id = ? WHERE house_id = ? AND status = \'OPEN\'',
            [current_bid, current_winner_id ?? null, house_id]
        );
    }

    async finishAuction({ house_id, status = 'FINISHED' }) {
        return await this.db.update(
            'UPDATE house_auctions SET status = ? WHERE house_id = ? AND status = \'OPEN\'',
            [status, house_id]
        );
    }

    // ---- House data (itens) ----
    async listHouseItems(houseId) {
        return await this.db.query('SELECT * FROM house_data WHERE house_id = ? ORDER BY id ASC', [houseId]);
    }

    async upsertHouseItem({ house_id, item_id, amount, pos_x, pos_y, pos_z, extra_data }) {
        // Simples: sempre insere (sem merge). Futuro: unique pos + item.
        return await this.db.insert(
            'INSERT INTO house_data (house_id, item_id, amount, pos_x, pos_y, pos_z, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [house_id, item_id, amount ?? 1, pos_x, pos_y, pos_z, extra_data ? JSON.stringify(extra_data) : null]
        );
    }

    async getHouseItemById(id) {
        return await this.db.queryOne('SELECT * FROM house_data WHERE id = ?', [id]);
    }

    async updateHouseItem({ id, house_id, amount, pos_x, pos_y, pos_z, extra_data }) {
        return await this.db.update(
            'UPDATE house_data SET amount = ?, pos_x = ?, pos_y = ?, pos_z = ?, extra_data = ? WHERE id = ? AND house_id = ?',
            [
                amount ?? 1,
                pos_x,
                pos_y,
                pos_z,
                extra_data ? JSON.stringify(extra_data) : null,
                id,
                house_id
            ]
        );
    }

    async deleteHouseItem(id) {
        return await this.db.delete('DELETE FROM house_data WHERE id = ?', [id]);
    }
}
