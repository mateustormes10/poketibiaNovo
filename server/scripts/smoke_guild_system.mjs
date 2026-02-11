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

        for (const waiter of waiters) {
            try {
                if (waiter.predicate(msg)) {
                    waiters.delete(waiter);
                    clearTimeout(waiter.timer);
                    waiter.resolve(msg);
                    return;
                }
            } catch {
                // ignore
            }
        }

        backlog.push(msg);
    });

    function waitFor(predicate, timeoutMs = 8000) {
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

async function connectAndLogin(playerId, { log = false } = {}) {
    const ws = new WebSocket(WS_URL);

    await new Promise((resolve, reject) => {
        ws.once('open', resolve);
        ws.once('error', reject);
    });

    const pump = createMessagePump(ws, { log });
    const send = (type, data) => ws.send(JSON.stringify({ type, data }));

    send('login', { playerId });
    await pump.waitFor(m => (m.type || '').toLowerCase() === 'loginsuccess', 12000);

    return { ws, pump, send };
}

async function ensureTestState(database) {
    // Força players fora de guild.
    await database.update('UPDATE players SET rank_id = 0 WHERE id IN (1,2)', []);

    // Limpa invites pendentes do player 2 para evitar conflito.
    await database.delete('DELETE FROM guild_invites WHERE player_id IN (1,2)', []);
}

async function main() {
    const database = new Database(config.database);
    await database.connect();

    try {
        console.log('[smoke][guild] ensuring DB test state...');
        await ensureTestState(database);

        console.log('[smoke][guild] connecting ws:', WS_URL);
        const leader = await connectAndLogin(1, { log: Boolean(process.env.SMOKE_LOG) });
        const candidate = await connectAndLogin(2, { log: Boolean(process.env.SMOKE_LOG) });

        const guildName = `SmokeGuild_${Date.now()}`;

        console.log('[smoke][guild] leader opens menu');
        leader.send('OPEN_GUILD_MENU', {});
        const menu1 = await leader.pump.waitFor(m => (m.type || '').toLowerCase() === 'guild_menu');
        if (!menu1?.data?.success) throw new Error(`guild_menu failed: ${menu1?.data?.reason}`);

        console.log('[smoke][guild] leader creates guild:', guildName);
        leader.send('CREATE_GUILD', { name: guildName, motd: 'Guild oficial' });
        const createRes = await leader.pump.waitFor(m => (m.type || '').toLowerCase() === 'guild_create_result');
        if (!createRes?.data?.success) throw new Error(`create failed: ${createRes?.data?.reason}`);
        const guildId = Number(createRes?.data?.guild_id);
        if (!guildId) throw new Error('create did not return guild_id');

        console.log('[smoke][guild] candidate applies to guild:', guildId);
        candidate.send('APPLY_GUILD', { guild_id: guildId });
        const applyRes = await candidate.pump.waitFor(m => (m.type || '').toLowerCase() === 'guild_apply_result');
        if (!applyRes?.data?.success) throw new Error(`apply failed: ${applyRes?.data?.reason}`);

        console.log('[smoke][guild] leader gets invites');
        leader.send('GET_GUILD_INVITES', {});
        const inv = await leader.pump.waitFor(m => (m.type || '').toLowerCase() === 'guild_invites');
        if (!inv?.data?.success) throw new Error(`invites failed: ${inv?.data?.reason}`);
        const hasCandidate = Array.isArray(inv?.data?.invites) && inv.data.invites.some(i => Number(i.player_id) === 2);
        if (!hasCandidate) throw new Error('candidate not present in invites');

        console.log('[smoke][guild] leader approves candidate');
        leader.send('APPROVE_GUILD_INVITE', { player_id: 2 });
        const appr = await leader.pump.waitFor(m => (m.type || '').toLowerCase() === 'guild_approve_result');
        if (!appr?.data?.success) throw new Error(`approve failed: ${appr?.data?.reason}`);

        // Candidate should receive guild_update with my_guild
        const upd = await candidate.pump.waitFor(m => (m.type || '').toLowerCase() === 'guild_update');
        if (!upd?.data?.success) throw new Error(`guild_update failed: ${upd?.data?.reason}`);
        if (!upd?.data?.my_guild || Number(upd.data.my_guild.guild_id) !== guildId) {
            throw new Error('candidate did not join guild (guild_update missing/incorrect)');
        }

        console.log('[smoke][guild] leader updates MOTD');
        leader.send('UPDATE_GUILD_MOTD', { motd: 'Nova MOTD' });
        const motdRes = await leader.pump.waitFor(m => (m.type || '').toLowerCase() === 'guild_motd_result');
        if (!motdRes?.data?.success) throw new Error(`motd update failed: ${motdRes?.data?.reason}`);

        // Candidate should receive another update (best-effort). If not, don't fail hard.
        try {
            const upd2 = await candidate.pump.waitFor(m => (m.type || '').toLowerCase() === 'guild_update', 4000);
            if (upd2?.data?.my_guild?.motd !== 'Nova MOTD') {
                console.warn('[smoke][guild] warning: candidate guild_update motd mismatch');
            }
        } catch {
            console.warn('[smoke][guild] warning: candidate did not receive motd guild_update (timeout)');
        }

        console.log('[smoke][guild] ✅ PASS');

        leader.ws.close();
        candidate.ws.close();
        await sleep(200);
    } finally {
        await database.disconnect().catch(() => {});
    }
}

main().catch((e) => {
    console.error('[smoke][guild] ❌ FAIL:', e);
    process.exit(1);
});
