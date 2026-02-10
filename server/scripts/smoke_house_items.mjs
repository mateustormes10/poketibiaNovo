import WebSocket from 'ws';
import { Database } from '../config/database.js';
import { config } from '../config/serverConfig.js';

const WS_URL = process.env.WS_URL || `ws://localhost:${Number(process.env.PORT || config.port)}`;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function createMessagePump(ws, { log = false } = {}) {
    const backlog = [];
    const waiters = new Set();

    ws.on('message', (buf) => {
        let msg;
        try {
            msg = JSON.parse(buf.toString());
        } catch {
            return;
        }

        if (log) {
            const t = (msg?.type ?? '').toString();
            console.log('[smoke] <-', t);
        }

        // Resolve any waiter that matches first.
        for (const waiter of waiters) {
            try {
                if (waiter.predicate(msg)) {
                    waiters.delete(waiter);
                    clearTimeout(waiter.timer);
                    waiter.resolve(msg);
                    return;
                }
            } catch {
                // ignore predicate errors
            }
        }

        backlog.push(msg);
    });

    function waitFor(predicate, timeoutMs = 5000) {
        // Check backlog first to avoid races.
        for (let i = 0; i < backlog.length; i++) {
            const msg = backlog[i];
            try {
                if (predicate(msg)) {
                    backlog.splice(i, 1);
                    return Promise.resolve(msg);
                }
            } catch {
                // ignore
            }
        }

        return new Promise((resolve, reject) => {
            const waiter = {
                predicate,
                resolve,
                reject,
                timer: setTimeout(() => {
                    waiters.delete(waiter);
                    reject(new Error(`Timeout waiting for message (${timeoutMs}ms)`));
                }, timeoutMs)
            };
            waiters.add(waiter);
        });
    }

    return { waitFor };
}

async function ensureTestState(database) {
    // 1) Garante house #1 como owned pelo player 1
    await database.update(
        'UPDATE house_lists SET owner_id = 1, is_rented = 1 WHERE house_id = 1',
        []
    );

    // 2) Evita leilão aberto conflitante
    await database.update(
        "UPDATE house_auctions SET status='FINISHED' WHERE house_id = 1 AND status='OPEN'",
        []
    );

    // 3) Coloca o player dentro da house
    await database.update(
        'UPDATE players SET posx = 11, posy = 10, posz = 2 WHERE id = 1',
        []
    );

    // 4) Garante itens no inventário (tipo house)
    // Upsert manual: se existe, atualiza tipo + incrementa.
    const items = [
        { name: 'House Chair', qty: 2 },
        { name: 'House Table', qty: 1 },
        { name: 'House Bed', qty: 1 }
    ];

    for (const it of items) {
        const existing = await database.queryOne(
            'SELECT id, quantity FROM player_inventory WHERE player_id = 1 AND item_name = ? LIMIT 1',
            [it.name]
        );
        if (existing) {
            await database.update(
                'UPDATE player_inventory SET item_type = ?, quantity = GREATEST(quantity, ?) WHERE id = ?',
                ['house', it.qty, existing.id]
            );
        } else {
            await database.insert(
                'INSERT INTO player_inventory (player_id, item_type, item_name, quantity) VALUES (?,?,?,?)',
                [1, 'house', it.name, it.qty]
            );
        }
    }

    // Limpa itens de house anteriores no chão para previsibilidade
    await database.delete('DELETE FROM house_data WHERE house_id = 1', []);
}

async function main() {
    const database = new Database(config.database);
    await database.connect();

    try {
        console.log('[smoke] ensuring DB test state...');
        await ensureTestState(database);

        console.log('[smoke] connecting ws:', WS_URL);
        const ws = new WebSocket(WS_URL);

        await new Promise((resolve, reject) => {
            ws.once('open', resolve);
            ws.once('error', reject);
        });

        const pump = createMessagePump(ws, { log: Boolean(process.env.SMOKE_LOG) });

        const send = (type, data) => ws.send(JSON.stringify({ type, data }));

        console.log('[smoke] login playerId=1');
        send('login', { playerId: 1 });
        await pump.waitFor(m => (m.type || '').toLowerCase() === 'loginsuccess', 8000);

        console.log('[smoke] request current house items (should be empty)');
        send('house_get_items', {});
        const snapshot1 = await pump.waitFor(m => (m.type || '').toLowerCase() === 'house_items', 8000);
        if (!snapshot1?.data?.success) throw new Error(`house_items failed: ${snapshot1?.data?.reason}`);
        if ((snapshot1.data.items || []).length !== 0) {
            throw new Error(`expected 0 items, got ${(snapshot1.data.items || []).length}`);
        }

        console.log('[smoke] place item_id=1001');
        send('house_item_place', { item_id: 1001 });
        const placeRes = await pump.waitFor(m => (m.type || '').toLowerCase() === 'house_item_place_result', 8000);
        if (!placeRes?.data?.success) throw new Error(`place failed: ${placeRes?.data?.reason}`);

        const added = await pump.waitFor(m => (m.type || '').toLowerCase() === 'house_item_added', 8000);
        const instId = added?.data?.item_instance_id;
        if (!instId) throw new Error('did not receive house_item_added with item_instance_id');
        console.log('[smoke] added instance:', instId);

        console.log('[smoke] request current house items (should have 1)');
        send('house_get_items', {});
        const snapshot2 = await pump.waitFor(m => (m.type || '').toLowerCase() === 'house_items', 8000);
        if (!snapshot2?.data?.success) throw new Error(`house_items failed: ${snapshot2?.data?.reason}`);
        if ((snapshot2.data.items || []).length !== 1) {
            throw new Error(`expected 1 item, got ${(snapshot2.data.items || []).length}`);
        }

        console.log('[smoke] remove instance:', instId);
        send('house_item_remove', { item_instance_id: instId });
        const remRes = await pump.waitFor(m => (m.type || '').toLowerCase() === 'house_item_remove_result', 8000);
        if (!remRes?.data?.success) throw new Error(`remove failed: ${remRes?.data?.reason}`);

        const removed = await pump.waitFor(m => (m.type || '').toLowerCase() === 'house_item_removed', 8000);
        if (removed?.data?.item_instance_id !== instId) {
            throw new Error(`removed instance mismatch: got ${removed?.data?.item_instance_id}, expected ${instId}`);
        }

        // DB asserts
        const count = await database.queryOne('SELECT COUNT(*) as cnt FROM house_data WHERE house_id = 1', []);
        if (Number(count?.cnt || 0) !== 0) throw new Error('house_data not empty after remove');

        const inv = await database.queryOne(
            "SELECT quantity, item_type FROM player_inventory WHERE player_id = 1 AND item_name = 'House Chair'",
            []
        );
        if (!inv || String(inv.item_type) !== 'house') throw new Error('inventory item_type not house');

        console.log('[smoke] ✅ PASS: place/remove pipeline OK');

        ws.close();
        await sleep(200);
    } finally {
        await database.disconnect().catch(() => {});
    }
}

main().catch((e) => {
    console.error('[smoke] ❌ FAIL:', e);
    process.exit(1);
});
