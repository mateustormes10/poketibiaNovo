import { Logger } from '../utils/Logger.js';
import { ItemType } from '../../shared/protocol/InventoryProtocol.js';
import { getHouseItemById as getCatalogHouseItemById } from './HouseItemCatalog.js';

const logger = new Logger('HouseService');

function normalizeCityName(value) {
    return String(value ?? '').trim().toLowerCase();
}

function clampInt(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function isAdjacent4(a, b) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return (dx + dy) === 1;
}

function safeJsonParse(value) {
    if (value === null || typeof value === 'undefined') return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

export class HouseService {
    constructor(gameWorld, houseRepository) {
        this.gameWorld = gameWorld;
        this.repo = houseRepository;

        this.housesById = new Map();
        this._lastAuctionSweepAt = 0;
        this._auctionSweepIntervalMs = 1000;
    }

    async init() {
        await this.repo.ensureTables();
        await this._seedDefaultHousesIfEmpty();
        await this.reload();
        await this._autoMigrateDefaultHousesZIfNeeded();
        // Se migrar algo, reload novamente para refletir em memória.
        await this.reload();
        await this._ensureAuctionsForFreeHouses();

        logger.info(`Houses loaded: ${this.housesById.size}`);
    }

    async reload() {
        const houses = await this.repo.listHouses();
        this.housesById.clear();
        for (const h of houses) {
            this.housesById.set(Number(h.house_id), this._normalizeHouseRow(h));
        }
    }

    _normalizeHouseRow(row) {
        const houseId = Number(row.house_id);
        const fromX = Math.min(clampInt(row.area_from_x), clampInt(row.area_to_x));
        const toX = Math.max(clampInt(row.area_from_x), clampInt(row.area_to_x));
        const fromY = Math.min(clampInt(row.area_from_y), clampInt(row.area_to_y));
        const toY = Math.max(clampInt(row.area_from_y), clampInt(row.area_to_y));

        return {
            house_id: houseId,
            map_id: String(row.map_id ?? row.city_name ?? 'CidadeInicial').trim(),
            city_name: String(row.city_name ?? row.map_id ?? 'CidadeInicial').trim(),
            door_x: clampInt(row.door_x),
            door_y: clampInt(row.door_y),
            door_z: clampInt(row.door_z),
            area_from_x: fromX,
            area_from_y: fromY,
            area_to_x: toX,
            area_to_y: toY,
            area_z: clampInt(row.area_z),
            size_sqm: clampInt(row.size_sqm, 0),
            rent_price: clampInt(row.rent_price, 0),
            owner_id: row.owner_id === null || typeof row.owner_id === 'undefined' ? null : clampInt(row.owner_id),
            is_rented: Boolean(row.is_rented),
            last_paid_at: row.last_paid_at ?? null
        };
    }

    async _seedDefaultHousesIfEmpty() {
        const houses = await this.repo.listHouses();
        if (houses.length > 0) return;

        // Coordenadas inventadas (você vai ajustar depois no banco).
        // Importante: door_* é o tile do lado de fora; entrar é ir para um tile dentro da área adjacente à porta.
        const seed = [
            {
                house_id: 1,
                map_id: 'CidadeInicial',
                city_name: 'CidadeInicial',
                // Nota: este projeto está usando z=3 como "andar base" na prática.
                door_x: 10, door_y: 10, door_z: 3,
                area_from_x: 11, area_from_y: 10,
                area_to_x: 15, area_to_y: 14,
                area_z: 3,
                size_sqm: 25,
                rent_price: 500,
                owner_id: null,
                is_rented: 0,
                last_paid_at: null
            },
            {
                house_id: 2,
                map_id: 'CidadeInicial',
                city_name: 'CidadeInicial',
                door_x: 20, door_y: 8, door_z: 3,
                area_from_x: 21, area_from_y: 8,
                area_to_x: 26, area_to_y: 12,
                area_z: 3,
                size_sqm: 30,
                rent_price: 650,
                owner_id: null,
                is_rented: 0,
                last_paid_at: null
            },
            {
                house_id: 3,
                map_id: 'CidadeInicial',
                city_name: 'CidadeInicial',
                door_x: 5, door_y: 20, door_z: 3,
                area_from_x: 6, area_from_y: 20,
                area_to_x: 10, area_to_y: 24,
                area_z: 3,
                size_sqm: 20,
                rent_price: 400,
                owner_id: null,
                is_rented: 0,
                last_paid_at: null
            }
        ];

        for (const house of seed) {
            await this.repo.upsertHouse(house);
        }

        logger.info('Seeded 3 default houses into house_lists');
    }

    async _autoMigrateDefaultHousesZIfNeeded() {
        // Migração segura: só ajusta z se detectar exatamente o seed antigo (z=2) sem customizações.
        const h1 = this.getHouseById(1);
        const h2 = this.getHouseById(2);
        const h3 = this.getHouseById(3);
        if (!h1 || !h2 || !h3) return;

        const isOldSeed1 = h1.map_id === 'CidadeInicial' && h1.city_name === 'CidadeInicial'
            && h1.door_x === 10 && h1.door_y === 10 && h1.door_z === 2
            && h1.area_from_x === 11 && h1.area_from_y === 10 && h1.area_to_x === 15 && h1.area_to_y === 14 && h1.area_z === 2;
        const isOldSeed2 = h2.map_id === 'CidadeInicial' && h2.city_name === 'CidadeInicial'
            && h2.door_x === 20 && h2.door_y === 8 && h2.door_z === 2
            && h2.area_from_x === 21 && h2.area_from_y === 8 && h2.area_to_x === 26 && h2.area_to_y === 12 && h2.area_z === 2;
        const isOldSeed3 = h3.map_id === 'CidadeInicial' && h3.city_name === 'CidadeInicial'
            && h3.door_x === 5 && h3.door_y === 20 && h3.door_z === 2
            && h3.area_from_x === 6 && h3.area_from_y === 20 && h3.area_to_x === 10 && h3.area_to_y === 24 && h3.area_z === 2;

        if (!(isOldSeed1 && isOldSeed2 && isOldSeed3)) return;

        await this.repo.upsertHouse({ ...h1, door_z: 3, area_z: 3 });
        await this.repo.upsertHouse({ ...h2, door_z: 3, area_z: 3 });
        await this.repo.upsertHouse({ ...h3, door_z: 3, area_z: 3 });
        logger.info('Auto-migrated default houses Z from 2 to 3');
    }

    async _ensureAuctionsForFreeHouses() {
        const now = new Date();
        const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        for (const house of this.housesById.values()) {
            if (house.owner_id !== null) continue;

            const existing = await this.repo.getAuctionByHouseId(house.house_id);
            if (existing && String(existing.status).toUpperCase() === 'OPEN') continue;

            await this.repo.upsertOpenAuction({
                house_id: house.house_id,
                start_price: Math.max(100, house.rent_price * 10),
                current_bid: 0,
                current_winner_id: null,
                auction_start_at: now,
                auction_end_at: end
            });
        }
    }

    // ---- Queries ----
    getHouseById(houseId) {
        return this.housesById.get(Number(houseId)) || null;
    }

    getHouseAtPosition({ city, x, y, z }) {
        const cx = clampInt(x);
        const cy = clampInt(y);
        const cz = clampInt(z);
        const ccity = normalizeCityName(city ?? 'CidadeInicial');

        for (const house of this.housesById.values()) {
            const houseCity = normalizeCityName(house.city_name);
            const houseMap = normalizeCityName(house.map_id);
            if (houseCity !== ccity && houseMap !== ccity) continue;
            if (house.area_z !== cz) continue;

            if (cx >= house.area_from_x && cx <= house.area_to_x && cy >= house.area_from_y && cy <= house.area_to_y) {
                return house;
            }
        }
        return null;
    }

    getHouseByDoor({ city, x, y, z }) {
        const cx = clampInt(x);
        const cy = clampInt(y);
        const cz = clampInt(z);
        const ccity = normalizeCityName(city ?? 'CidadeInicial');

        for (const house of this.housesById.values()) {
            const houseCity = normalizeCityName(house.city_name);
            const houseMap = normalizeCityName(house.map_id);
            if (houseCity !== ccity && houseMap !== ccity) continue;
            if (house.door_z !== cz) continue;
            if (house.door_x === cx && house.door_y === cy) return house;
        }
        return null;
    }

    // ---- Access rules ----
    canPlayerEnterHouse(player, house) {
        if (!player || !house) return false;

        // GM bypass
        if (player.vocation === 4) return true;

        // Dono pode entrar.
        const dbId = player.dbId || player.id;
        if (house.owner_id !== null && Number(house.owner_id) === Number(dbId)) return true;

        // Por enquanto, sem guest/subowners (futuro: tabela de permissões).
        return false;
    }

    canPlayerManageHouse(player, house) {
        // Por enquanto, mesma regra de entrada (dono/GM).
        return this.canPlayerEnterHouse(player, house);
    }

    _getCityForPlayer(player, fallback = 'CidadeInicial') {
        if (!player) return fallback;
        const raw = player.city || player.mapaAtual || this.gameWorld?.currentMapName || fallback;
        return String(raw ?? fallback).trim();
    }

    _normalizeHouseItemRow(row) {
        return {
            id: Number(row.id),
            house_id: Number(row.house_id),
            item_id: clampInt(row.item_id),
            amount: clampInt(row.amount, 1),
            pos_x: clampInt(row.pos_x),
            pos_y: clampInt(row.pos_y),
            pos_z: clampInt(row.pos_z),
            extra_data: safeJsonParse(row.extra_data)
        };
    }

    _assertPlayerInHouse(player, expectedHouseId) {
        const city = this._getCityForPlayer(player);
        const current = this.getHouseAtPosition({ city, x: player.x, y: player.y, z: player.z });
        if (!current) return { ok: false, reason: 'not_in_house' };
        if (Number(current.house_id) !== Number(expectedHouseId)) return { ok: false, reason: 'wrong_house' };
        return { ok: true, house: current };
    }

    _getCurrentHouseForPlayer(player) {
        const city = this._getCityForPlayer(player);
        return this.getHouseAtPosition({ city, x: player.x, y: player.y, z: player.z });
    }

    _isPosInsideHouse(house, pos) {
        const x = clampInt(pos.x);
        const y = clampInt(pos.y);
        const z = clampInt(pos.z);
        if (z !== house.area_z) return false;
        return x >= house.area_from_x && x <= house.area_to_x && y >= house.area_from_y && y <= house.area_to_y;
    }

    async validateMove({ player, city, from, to }) {
        if (!player) return { allowed: false, reason: 'not_authenticated' };

        const fromHouse = this.getHouseAtPosition({ city, x: from.x, y: from.y, z: from.z });
        const toHouse = this.getHouseAtPosition({ city, x: to.x, y: to.y, z: to.z });

        // Se não envolve house, libera.
        if (!fromHouse && !toHouse) return { allowed: true };

        // Se o player está entrando em uma house (outside -> inside)
        if (!fromHouse && toHouse) {
            const door = { x: toHouse.door_x, y: toHouse.door_y, z: toHouse.door_z };
            const fromPos = { x: clampInt(from.x), y: clampInt(from.y), z: clampInt(from.z) };
            const toPos = { x: clampInt(to.x), y: clampInt(to.y), z: clampInt(to.z) };

            // Precisa estar no tile da porta (lado de fora) e mover para um tile interno adjacente.
            const isAtDoorOutside = fromPos.x === door.x && fromPos.y === door.y && fromPos.z === door.z;
            const isEnteringAdj = isAdjacent4(fromPos, toPos);
            if (!isAtDoorOutside || !isEnteringAdj) {
                return { allowed: false, reason: 'must_enter_via_door' };
            }

            // Se estiver em leilão (house livre), bloqueia entrada.
            if (toHouse.owner_id === null) {
                const auction = await this.repo.getAuctionByHouseId(toHouse.house_id);
                if (auction && String(auction.status).toUpperCase() === 'OPEN') {
                    return { allowed: false, reason: 'house_in_auction' };
                }
                return { allowed: false, reason: 'house_unowned' };
            }

            if (!this.canPlayerEnterHouse(player, toHouse)) {
                return { allowed: false, reason: 'not_allowed' };
            }

            return { allowed: true, houseId: toHouse.house_id };
        }

        // Se está dentro de house e continua dentro
        if (fromHouse && toHouse && fromHouse.house_id === toHouse.house_id) {
            if (!this.canPlayerEnterHouse(player, toHouse)) {
                return { allowed: false, reason: 'not_allowed' };
            }
            return { allowed: true, houseId: toHouse.house_id };
        }

        // Se está saindo da house (inside -> outside)
        if (fromHouse && !toHouse) {
            const door = { x: fromHouse.door_x, y: fromHouse.door_y, z: fromHouse.door_z };
            const fromPos = { x: clampInt(from.x), y: clampInt(from.y), z: clampInt(from.z) };
            const toPos = { x: clampInt(to.x), y: clampInt(to.y), z: clampInt(to.z) };

            // Força sair apenas voltando pela porta (para o tile da porta).
            const isToDoorOutside = toPos.x === door.x && toPos.y === door.y && toPos.z === door.z;
            const isAdjacent = isAdjacent4(fromPos, toPos);
            if (!isToDoorOutside || !isAdjacent) {
                return { allowed: false, reason: 'must_exit_via_door' };
            }
            return { allowed: true };
        }

        // Troca entre houses diferentes (improvável): bloqueia por segurança.
        return { allowed: false, reason: 'invalid_house_transition' };
    }

    // ---- Network payloads ----
    async buildHousesInitPayload() {
        const houses = Array.from(this.housesById.values());
        const auctions = await this.repo.listOpenAuctions();
        const auctionByHouse = new Map();
        for (const a of auctions) {
            auctionByHouse.set(Number(a.house_id), {
                auction_id: Number(a.auction_id),
                house_id: Number(a.house_id),
                start_price: clampInt(a.start_price),
                current_bid: clampInt(a.current_bid),
                current_winner_id: a.current_winner_id === null ? null : clampInt(a.current_winner_id),
                auction_start_at: a.auction_start_at,
                auction_end_at: a.auction_end_at,
                status: String(a.status)
            });
        }

        return {
            houses: houses.map(h => ({
                house_id: h.house_id,
                map_id: h.map_id,
                city_name: h.city_name,
                door_x: h.door_x,
                door_y: h.door_y,
                door_z: h.door_z,
                area_from_x: h.area_from_x,
                area_from_y: h.area_from_y,
                area_to_x: h.area_to_x,
                area_to_y: h.area_to_y,
                area_z: h.area_z,
                size_sqm: h.size_sqm,
                rent_price: h.rent_price,
                owner_id: h.owner_id,
                is_rented: h.is_rented
            })),
            auctions: Array.from(auctionByHouse.values())
        };
    }

    // ---- Auction logic ----
    async getHouseInfo(houseId) {
        const house = this.getHouseById(houseId);
        if (!house) return null;
        const auction = await this.repo.getAuctionByHouseId(houseId);

        return {
            house,
            auction: auction
                ? {
                    auction_id: Number(auction.auction_id),
                    house_id: Number(auction.house_id),
                    start_price: clampInt(auction.start_price),
                    current_bid: clampInt(auction.current_bid),
                    current_winner_id: auction.current_winner_id === null ? null : clampInt(auction.current_winner_id),
                    auction_start_at: auction.auction_start_at,
                    auction_end_at: auction.auction_end_at,
                    status: String(auction.status)
                }
                : null
        };
    }

    // ---- House items (inventário-based) ----
    // Regras (conforme spec):
    // - client NÃO valida house/permissão
    // - server valida: player dentro de house + dono/GM
    // - item vem do inventário (item_type = house)
    // - item_id é template id (catálogo) e vira house_data.item_id

    async placeHouseItemFromInventory({ client, item_id }) {
        const player = client?.player;
        const dbPlayerId = player?.dbId;
        if (!player || !dbPlayerId) {
            return { success: false, reason: 'not_authenticated' };
        }

        const house = this._getCurrentHouseForPlayer(player);
        if (!house) return { success: false, reason: 'not_in_house' };
        if (!this.canPlayerManageHouse(player, house)) return { success: false, reason: 'not_allowed' };

        const templateId = clampInt(item_id, 0);
        if (!templateId) return { success: false, reason: 'invalid_item_id' };

        const def = getCatalogHouseItemById(templateId);
        if (!def) return { success: false, reason: 'unknown_item_id' };

        // Valida item no inventário (nome + tipo house)
        const invRow = await this.gameWorld.inventoryRepository.getItem(dbPlayerId, def.name);
        if (!invRow || !invRow.quantity || Number(invRow.quantity) <= 0) {
            return { success: false, reason: 'item_not_in_inventory' };
        }
        if (String(invRow.item_type) !== ItemType.HOUSE) {
            return { success: false, reason: 'item_not_house_type' };
        }

        // Remove 1 do inventário
        const removed = await this.gameWorld.inventoryRepository.removeItem(dbPlayerId, def.name, 1);
        if (!removed) return { success: false, reason: 'failed_remove_inventory' };

        // Pos autoritativa do player
        const px = clampInt(player.x);
        const py = clampInt(player.y);
        const pz = clampInt(player.z);
        if (!this._isPosInsideHouse(house, { x: px, y: py, z: pz })) {
            // segurança extra
            // Devolve o item (best-effort)
            await this.gameWorld.inventoryRepository.addItem(dbPlayerId, ItemType.HOUSE, def.name, 1);
            return { success: false, reason: 'pos_outside_house' };
        }

        const insertedId = await this.repo.upsertHouseItem({
            house_id: Number(house.house_id),
            item_id: templateId,
            amount: 1,
            pos_x: px,
            pos_y: py,
            pos_z: pz,
            extra_data: null
        });

        // Broadcast para players próximos
        this.gameWorld.wsServer?.broadcastToArea?.(px, py, pz, 12, 'house_item_added', {
            item_instance_id: Number(insertedId),
            house_id: Number(house.house_id),
            item_id: templateId,
            x: px,
            y: py,
            z: pz
        });

        return { success: true };
    }

    async getCurrentHouseItems({ client }) {
        const player = client?.player;
        const dbPlayerId = player?.dbId;
        if (!player || !dbPlayerId) {
            return { success: false, reason: 'not_authenticated' };
        }

        const house = this._getCurrentHouseForPlayer(player);
        if (!house) return { success: false, reason: 'not_in_house' };
        if (!this.canPlayerEnterHouse(player, house)) return { success: false, reason: 'not_allowed' };

        const rows = await this.repo.listHouseItems(Number(house.house_id));
        return {
            success: true,
            house_id: Number(house.house_id),
            items: (rows || []).map(r => ({
                item_instance_id: Number(r.id),
                house_id: Number(r.house_id),
                item_id: clampInt(r.item_id),
                x: clampInt(r.pos_x),
                y: clampInt(r.pos_y),
                z: clampInt(r.pos_z)
            }))
        };
    }

    async removeHouseItemToInventory({ client, item_instance_id }) {
        const player = client?.player;
        const dbPlayerId = player?.dbId;
        if (!player || !dbPlayerId) {
            return { success: false, reason: 'not_authenticated' };
        }

        const instanceId = clampInt(item_instance_id, 0);
        if (!instanceId) return { success: false, reason: 'invalid_item_instance_id' };

        const itemRow = await this.repo.getHouseItemById(instanceId);
        if (!itemRow) return { success: false, reason: 'item_not_found' };

        const houseId = Number(itemRow.house_id);
        const house = this.getHouseById(houseId);
        if (!house) return { success: false, reason: 'house_not_found' };

        // Player precisa estar dentro da mesma house para pegar
        const inHouse = this._assertPlayerInHouse(player, houseId);
        if (!inHouse.ok) {
            return { success: false, reason: inHouse.reason };
        }
        if (!this.canPlayerManageHouse(player, house)) {
            return { success: false, reason: 'not_allowed' };
        }

        const templateId = clampInt(itemRow.item_id, 0);
        const def = getCatalogHouseItemById(templateId);
        if (!def) return { success: false, reason: 'unknown_item_id' };

        const deleted = await this.repo.deleteHouseItem(instanceId);
        if (!deleted) return { success: false, reason: 'delete_failed' };

        await this.gameWorld.inventoryRepository.addItem(dbPlayerId, ItemType.HOUSE, def.name, 1);

        // Broadcast para players próximos (na posição onde o item estava)
        const px = clampInt(itemRow.pos_x);
        const py = clampInt(itemRow.pos_y);
        const pz = clampInt(itemRow.pos_z);
        this.gameWorld.wsServer?.broadcastToArea?.(px, py, pz, 12, 'house_item_removed', {
            item_instance_id: instanceId
        });

        return { success: true };
    }

    async placeBid({ client, houseId, amount }) {
        const player = client?.player;
        const dbPlayerId = player?.dbId;
        if (!player || !dbPlayerId) {
            return { success: false, reason: 'not_authenticated' };
        }

        const house = this.getHouseById(houseId);
        if (!house) return { success: false, reason: 'house_not_found' };

        if (house.owner_id !== null) return { success: false, reason: 'already_owned' };

        const auction = await this.repo.getAuctionByHouseId(houseId);
        if (!auction || String(auction.status).toUpperCase() !== 'OPEN') {
            return { success: false, reason: 'auction_not_open' };
        }

        const bid = clampInt(amount, 0);
        const startPrice = clampInt(auction.start_price, 0);
        const currentBid = clampInt(auction.current_bid, 0);
        const minBid = Math.max(startPrice, currentBid + 1);

        if (bid < minBid) {
            return { success: false, reason: 'bid_too_low', minBid };
        }

        // Debita do bidder e devolve para o winner anterior (escrow simplificado).
        const balanceRepo = this.gameWorld.balanceRepository;

        // Primeiro tenta debitar do bidder.
        const newBalance = await balanceRepo.removeGold(dbPlayerId, bid);
        if (newBalance === null) {
            return { success: false, reason: 'insufficient_funds' };
        }

        // Refund winner anterior
        const prevWinnerId = auction.current_winner_id;
        const prevBid = currentBid;
        if (prevWinnerId && prevBid > 0) {
            await balanceRepo.addGold(prevWinnerId, prevBid);
            this._notifyBalanceIfOnline(prevWinnerId);
        }

        // Atualiza auction
        await this.repo.updateAuctionBid({
            house_id: houseId,
            current_bid: bid,
            current_winner_id: dbPlayerId
        });

        // Notifica bidder
        client.send('balance_update', { balance: newBalance });

        // Broadcast update
        this.gameWorld.wsServer?.broadcast?.('house_auction_update', {
            house_id: houseId,
            current_bid: bid,
            current_winner_id: dbPlayerId
        });

        return { success: true, newBalance, bid };
    }

    _notifyBalanceIfOnline(dbPlayerId) {
        const wsServer = this.gameWorld.wsServer;
        if (!wsServer) return;

        for (const client of wsServer.clients.values()) {
            if (client?.player?.dbId && Number(client.player.dbId) === Number(dbPlayerId)) {
                // Recalcula e envia
                this.gameWorld.balanceRepository.getBalance(dbPlayerId)
                    .then(balance => {
                        client.send('balance_update', { balance });
                    })
                    .catch(() => {});
                return;
            }
        }
    }

    async update(nowMs) {
        if (!nowMs) nowMs = Date.now();
        if (nowMs - this._lastAuctionSweepAt < this._auctionSweepIntervalMs) return;
        this._lastAuctionSweepAt = nowMs;

        const auctions = await this.repo.listOpenAuctions();
        if (!auctions || auctions.length === 0) return;

        const now = new Date(nowMs);

        for (const auction of auctions) {
            const end = new Date(auction.auction_end_at);
            if (end.getTime() > nowMs) continue;

            const houseId = Number(auction.house_id);
            const winner = auction.current_winner_id === null ? null : Number(auction.current_winner_id);
            const bid = clampInt(auction.current_bid, 0);

            if (winner) {
                await this.repo.setHouseOwner(houseId, winner);
                // Atualiza cache em memória
                const house = this.housesById.get(houseId);
                if (house) {
                    house.owner_id = winner;
                    house.is_rented = true;
                }
            }

            await this.repo.finishAuction({ house_id: houseId, status: 'FINISHED' });

            this.gameWorld.wsServer?.broadcast?.('house_auction_finished', {
                house_id: houseId,
                winner_id: winner,
                bid
            });
        }
    }
}
