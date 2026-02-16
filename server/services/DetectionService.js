import { Logger } from '../utils/Logger.js';

const logger = new Logger('DetectionService');

function nowMs() {
    return Date.now();
}

function clampInt(n, min, max) {
    const v = Number(n);
    if (!Number.isFinite(v)) return min;
    return Math.min(max, Math.max(min, Math.floor(v)));
}

export class DetectionService {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;

        // Per client message rate
        this.clientMsgWindow = new Map(); // clientId -> { windowStartMs, count, lastLoggedAtMs }

        // Per player movement patterns
        this.playerMoves = new Map(); // playerId -> { moves: [{x,y,z,t,dir}], lastLoggedAtByType: Map }
    }

    _getClientMeta(client) {
        return {
            clientId: client?.id ?? null,
            playerId: client?.player?.id ?? null,
            playerDbId: client?.player?.dbId ?? null,
            ip: client?.ip ?? null,
            userAgent: client?.userAgent ?? null
        };
    }

    async log(eventType, severity, client, details) {
        const repo = this.gameWorld?.detectionRepository;
        if (!repo || typeof repo.logEvent !== 'function') {
            logger.debug(`[DETECTION] ${eventType} (no repo): ${JSON.stringify(details)}`);
            return;
        }

        const meta = this._getClientMeta(client);
        await repo.logEvent({
            eventType,
            severity,
            playerDbId: meta.playerDbId,
            playerId: meta.playerId,
            clientId: meta.clientId,
            ip: meta.ip,
            userAgent: meta.userAgent,
            details
        });
    }

    /**
     * Detect request floods and unknown/unauth patterns.
     * Returns true if message should be dropped.
     */
    shouldDropMessage(client, messageType) {
        const clientId = client?.id;
        if (!clientId) return false;

        const t = nowMs();
        const windowMs = 2000;
        const maxMessagesPerWindow = 120; // 60 msg/s average threshold

        let st = this.clientMsgWindow.get(clientId);
        if (!st) {
            st = { windowStartMs: t, count: 0, lastLoggedAtMs: 0 };
            this.clientMsgWindow.set(clientId, st);
        }

        if (t - st.windowStartMs > windowMs) {
            st.windowStartMs = t;
            st.count = 0;
        }

        st.count++;

        if (st.count > maxMessagesPerWindow) {
            // Soft drop with throttled logging
            if (t - st.lastLoggedAtMs > 5000) {
                st.lastLoggedAtMs = t;
                void this.log('rate_limit', 2, client, {
                    messageType,
                    countInWindow: st.count,
                    windowMs
                });
            }
            return true;
        }

        return false;
    }

    onUnknownMessage(client, messageType) {
        const t = nowMs();
        const clientId = client?.id;
        if (!clientId) return;

        // Throttle unknown logs per client
        let st = this.clientMsgWindow.get(clientId);
        if (!st) {
            st = { windowStartMs: t, count: 0, lastLoggedAtMs: 0 };
            this.clientMsgWindow.set(clientId, st);
        }

        if (t - st.lastLoggedAtMs > 2000) {
            st.lastLoggedAtMs = t;
            void this.log('unknown_action', 2, client, { messageType });
        }
    }

    /**
     * Movement repetition / bot-like pattern detection.
     * Returns true when the move should be dropped (spam mitigation).
     */
    onPlayerMove(client, data, player) {
        if (!player) return;

        const playerId = player.id;
        const t = nowMs();

        let st = this.playerMoves.get(playerId);
        if (!st) {
            st = { moves: [], lastLoggedAtByType: new Map() };
            this.playerMoves.set(playerId, st);
        }

        const x = clampInt(data?.x ?? player.x, -999999, 999999);
        const y = clampInt(data?.y ?? player.y, -999999, 999999);
        const z = clampInt(data?.z ?? player.z, -999999, 999999);
        const dir = String(data?.direction ?? player.direction ?? '');

        st.moves.push({ x, y, z, t, dir });

        // Keep last 40 moves
        if (st.moves.length > 40) {
            st.moves.splice(0, st.moves.length - 40);
        }

        // Only analyze if we have enough data
        if (st.moves.length < 16) return;

        // 1) Very high frequency movement (spam)
        // Count moves in last 1s
        const oneSecAgo = t - 1000;
        const movesLast1s = st.moves.filter(m => m.t >= oneSecAgo);
        if (movesLast1s.length >= 18) {
            this._throttledLog(st, 'movement_spam', 2, client, {
                movesLast1s: movesLast1s.length
            }, 5000);
        }

        // Harder threshold: drop movement packets briefly (bot flood mitigation)
        if (movesLast1s.length >= 28) {
            // Mark a short cooldown; MovementHandler will drop during this time.
            client._moveRateLimitedUntilMs = t + 250;
            return true;
        }

        // 2) Two-tile ping-pong: ABABAB... between exactly two positions
        const lastN = st.moves.slice(-20);
        const uniquePos = new Map();
        for (const m of lastN) {
            const key = `${m.x},${m.y},${m.z}`;
            uniquePos.set(key, (uniquePos.get(key) || 0) + 1);
        }
        if (uniquePos.size === 2) {
            // Check alternation
            let alternates = true;
            for (let i = 2; i < lastN.length; i++) {
                const a = `${lastN[i].x},${lastN[i].y},${lastN[i].z}`;
                const b = `${lastN[i - 2].x},${lastN[i - 2].y},${lastN[i - 2].z}`;
                if (a !== b) { alternates = false; break; }
            }
            if (alternates) {
                this._throttledLog(st, 'movement_pingpong', 2, client, {
                    sample: lastN.slice(-10)
                }, 8000);
            }
        }

        // 3) Same-direction repetition
        const lastDir = lastN[lastN.length - 1].dir;
        const sameDirCount = lastN.reverse().findIndex(m => m.dir !== lastDir);
        const consecutiveSameDir = sameDirCount === -1 ? lastN.length : sameDirCount;
        if (consecutiveSameDir >= 14 && lastDir) {
            this._throttledLog(st, 'movement_repetition', 2, client, {
                direction: lastDir,
                consecutive: consecutiveSameDir
            }, 8000);
        }

        return false;
    }

    _throttledLog(state, eventType, severity, client, details, minIntervalMs) {
        const t = nowMs();
        const last = state.lastLoggedAtByType.get(eventType) || 0;
        if (t - last < minIntervalMs) return;
        state.lastLoggedAtByType.set(eventType, t);
        void this.log(eventType, severity, client, details);
    }

    cleanupPlayer(playerId) {
        if (!playerId) return;
        this.playerMoves.delete(playerId);
    }

    cleanupClient(clientId) {
        if (!clientId) return;
        this.clientMsgWindow.delete(clientId);
    }
}
