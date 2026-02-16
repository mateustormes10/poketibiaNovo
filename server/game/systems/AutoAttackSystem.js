import { Logger } from '../../utils/Logger.js';
import { AutoAttackDatabase } from '../data/AutoAttackDatabase.js';
import { registerDefeatedMonster } from '../../handlers/scanHandler.js';
import { computeOutgoingSkillDamage, getLuckyDoubleCoinChance } from '../../utils/PlayerStats.js';

const logger = new Logger('AutoAttack');

function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
}

function dist2(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
}

export class AutoAttackSystem {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
        this.nextAttackId = 1;
        this.projectiles = new Map();
    }

    update(deltaTime) {
        if (this.projectiles.size === 0) return;

        const now = Date.now();
        const toDelete = [];

        for (const proj of this.projectiles.values()) {
            const attacker = this.gameWorld.players.get(proj.attackerId);
            const target = this._getTargetById(proj.targetId);

            // If attacker disconnected or target vanished, end the projectile.
            if (!attacker || !target) {
                toDelete.push(proj.id);
                this._broadcastToObservers(proj, proj.x, proj.y, proj.z, 'auto_attack_hit', {
                    attackId: proj.id,
                    attackerId: proj.attackerId,
                    targetId: proj.targetId,
                    newHp: target?.hp ?? 0,
                    damage: 0,
                    ended: true
                });
                continue;
            }

            // TTL safety.
            if (now - proj.createdAtMs > proj.ttlMs) {
                toDelete.push(proj.id);
                this._broadcastToObservers(proj, proj.x, proj.y, proj.z, 'auto_attack_hit', {
                    attackId: proj.id,
                    attackerId: proj.attackerId,
                    targetId: proj.targetId,
                    newHp: target.hp ?? 0,
                    damage: 0,
                    ended: true
                });
                continue;
            }

            // Homing direction towards current target position.
            const tx = Number(target.x) || 0;
            const ty = Number(target.y) || 0;
            const dx = tx - proj.x;
            const dy = ty - proj.y;
            const len = Math.hypot(dx, dy) || 1;
            proj.dirX = dx / len;
            proj.dirY = dy / len;

            // Integrate movement.
            const step = proj.speed * deltaTime;
            proj.x += proj.dirX * step;
            proj.y += proj.dirY * step;

            // Hit check (distance-based).
            const hitRadius = 0.45;
            if (Math.hypot(tx - proj.x, ty - proj.y) <= hitRadius) {
                const baseDamage = proj.baseDamage;
                const rolled = computeOutgoingSkillDamage(attacker, baseDamage);
                const finalDamage = rolled.damage;

                // Apply damage (WildPokemon doesn't expose takeDamage).
                this._applyDamage(attacker, target, finalDamage);

                // Broadcast hit + despawn.
                this._broadcastToObservers(proj, tx, ty, proj.z, 'auto_attack_hit', {
                    attackId: proj.id,
                    attackerId: proj.attackerId,
                    targetId: proj.targetId,
                    newHp: target.hp ?? 0,
                    damage: finalDamage,
                    isCrit: rolled.isCrit,
                    critMultiplier: rolled.critMultiplier
                });

                // Ensure monster state update is propagated (wild pokemon already broadcasts on damage/death).
                try {
                    if (this.gameWorld?.wildPokemonManager?.broadcastUpdate && target && target.id != null) {
                        this.gameWorld.wildPokemonManager.broadcastUpdate(target);
                    }
                } catch {}

                toDelete.push(proj.id);
            }
        }

        for (const id of toDelete) {
            this.projectiles.delete(id);
        }
    }

    async _rewardKill(attacker, monster) {
        try {
            const monsterXp = Number(monster?.exp) || 0;
            if (attacker && typeof attacker.gainExpAndCheckLevelUp === 'function') {
                attacker.gainExpAndCheckLevelUp(monsterXp);
            }

            // Gold drop + Lucky chance
            const expVal = monsterXp;
            const lvlVal = Number(monster?.level) || 1;
            const baseGold = Math.max(1, Math.floor(((expVal > 0 ? expVal : (lvlVal * 10)) / 5)));
            const luckyChance = getLuckyDoubleCoinChance(attacker);
            const doubled = Math.random() < luckyChance;
            const goldGain = doubled ? baseGold * 2 : baseGold;

            const dbId = attacker?.dbId;
            if (dbId && this.gameWorld?.balanceRepository?.addGold) {
                const newBalance = await this.gameWorld.balanceRepository.addGold(dbId, goldGain);
                attacker.goldCoin = newBalance;
            }

            // Push gamestate to attacker to reflect exp/gold quickly
            const attackerClient = attacker?.clientState;
            if (attackerClient && typeof attackerClient.send === 'function' && typeof this.gameWorld.getGameState === 'function') {
                attackerClient.send('gameState', this.gameWorld.getGameState(attacker));
            }
        } catch (e) {
            logger.warn('[AUTO] reward kill failed:', e?.message || e);
        }
    }

    _applyDamage(attacker, target, damage) {
        if (!target || typeof target.hp !== 'number') return;
        if (target.isDead === true || target.hp <= 0) return;

        const danoReal = Math.min(Math.max(0, damage), target.hp);
        target.hp -= danoReal;
        if (target.hp < 0) target.hp = 0;

        if (target.hp === 0 && !target.isDead) {
            target.isDead = true;
            target.deadSince = Date.now();

            // Quests: kill objective progress (best-effort)
            try {
                this.gameWorld?.questManager?.onEnemyKilled?.(attacker, target.name, 1);
            } catch {}

            // Scanner: register defeated monster
            try {
                const scanPlayerId = attacker?.dbId || attacker?.id;
                if (scanPlayerId) {
                    registerDefeatedMonster(scanPlayerId, {
                        name: target.name,
                        level: target.level || 1
                    });
                }
            } catch {}

            // Rewards
            this._rewardKill(attacker, target);
        }
    }

    requestAutoAttack(client, data = {}) {
        const attacker = client?.player;
        if (!attacker) return;

        // Validate attacker state.
        if (attacker.isDead || attacker.hp <= 0) return;

        const now = Date.now();
        if (attacker._nextAutoAttackAtMs && now < attacker._nextAutoAttackAtMs) {
            return;
        }

        const selectedAttackIndex = clampNumber(data.selectedAttackIndex ?? data.selectedAttackIdx ?? 0, 0, 999);
        const attackDef = AutoAttackDatabase[selectedAttackIndex] || AutoAttackDatabase[0];
        if (!attackDef) return;

        // Find server-authoritative target.
        const target = this._findBestTarget(attacker, attackDef.range);
        if (!target) return;

        // Set cooldown (server-authoritative). Cooldown reduction is already applied on skills; keep autoattack simple.
        const cdSeconds = clampNumber(attackDef.cooldownSeconds, 0.1, 10);
        attacker._nextAutoAttackAtMs = now + Math.floor(cdSeconds * 1000);

        // Spawn projectile.
        const attackId = this.nextAttackId++;
        const sx = Number(attacker.x) || 0;
        const sy = Number(attacker.y) || 0;
        const sz = Number(attacker.z) || 0;

        const tx = Number(target.x) || 0;
        const ty = Number(target.y) || 0;
        const dx = tx - sx;
        const dy = ty - sy;
        const len = Math.hypot(dx, dy) || 1;
        const dirX = dx / len;
        const dirY = dy / len;

        const speed = clampNumber(attackDef.speed, 1, 30);
        const baseDamage = Math.max(1, Math.floor(Number(attackDef.damage) || 1));

        const proj = {
            id: attackId,
            attackerId: attacker.id,
            targetId: target.id,
            attackName: attackDef.attackName,
            x: sx,
            y: sy,
            z: sz,
            dirX,
            dirY,
            speed,
            baseDamage,
            createdAtMs: now,
            ttlMs: 3500,
            interestRange: 24,
            observerIds: []
        };

        // Snapshot observers at spawn time so they always get a closing hit/end.
        try {
            const spawnObservers = this.gameWorld.getPlayersInArea(Math.round(sx), Math.round(sy), sz, proj.interestRange);
            proj.observerIds = spawnObservers.map(p => p.id);
        } catch {
            proj.observerIds = [];
        }

        this.projectiles.set(attackId, proj);

        // Broadcast spawn to nearby players (interest management).
        this._broadcastToObservers(proj, sx, sy, sz, 'spawn_auto_attack', {
            attackId,
            attackerId: attacker.id,
            targetId: target.id,
            startPosition: { x: sx, y: sy, z: sz },
            direction: { x: dirX, y: dirY },
            attackName: attackDef.attackName,
            speed
        });

        logger.debug(`[AUTO] spawn id=${attackId} attacker=${attacker.id} target=${target.id} attack=${attackDef.attackName}`);
    }

    _getTargetById(id) {
        if (id == null) return null;
        // Prefer wild pokemons (this project uses them as monsters).
        const wildMap = this.gameWorld?.wildPokemonManager?.wildPokemons;
        if (wildMap && wildMap.has(id)) return wildMap.get(id);
        if (this.gameWorld.monsters && this.gameWorld.monsters.has(id)) return this.gameWorld.monsters.get(id);
        return null;
    }

    _findBestTarget(attacker, rangeTiles) {
        const range = clampNumber(rangeTiles, 1, 25);
        const ax = Number(attacker.x) || 0;
        const ay = Number(attacker.y) || 0;
        const az = Number(attacker.z) || 0;
        const townId = attacker.town_id ?? attacker.townId ?? null;

        let best = null;
        let bestD2 = Infinity;
        let bestHp = Infinity;

        const wildMap = this.gameWorld?.wildPokemonManager?.wildPokemons;
        if (wildMap) {
            for (const m of wildMap.values()) {
                if (!m) continue;
                if (m.isHidden) continue;
                if ((m.isDead === true) || (typeof m.hp === 'number' && m.hp <= 0)) continue;
                if (Number(m.z) !== az) continue;
                if (townId != null && (m.town_id ?? m.townId) != null && Number(m.town_id ?? m.townId) !== Number(townId)) continue;

                const d2 = dist2(ax, ay, Number(m.x) || 0, Number(m.y) || 0);
                if (d2 > range * range) continue;

                const hp = Number(m.hp) || 0;
                if (d2 < bestD2 || (d2 === bestD2 && hp < bestHp)) {
                    best = m;
                    bestD2 = d2;
                    bestHp = hp;
                }
            }
        }

        // Fallback: server monsters (if used).
        if (!best && this.gameWorld.monsters) {
            for (const m of this.gameWorld.monsters.values()) {
                if (!m) continue;
                if ((m.isDead === true) || (typeof m.hp === 'number' && m.hp <= 0)) continue;
                if (Number(m.z) !== az) continue;
                const d2 = dist2(ax, ay, Number(m.x) || 0, Number(m.y) || 0);
                if (d2 > range * range) continue;
                const hp = Number(m.hp) || 0;
                if (d2 < bestD2 || (d2 === bestD2 && hp < bestHp)) {
                    best = m;
                    bestD2 = d2;
                    bestHp = hp;
                }
            }
        }

        return best;
    }

    _broadcastInArea(x, y, z, range, type, payload) {
        const players = this.gameWorld.getPlayersInArea(Math.round(x), Math.round(y), z, range);
        for (const p of players) {
            const client = p?.clientState;
            if (client && typeof client.send === 'function') {
                client.send(type, payload);
            }
        }
    }

    _broadcastToObservers(proj, x, y, z, type, payload) {
        const clients = new Map();

        // Snapshot observers (spawn-time)
        if (proj && Array.isArray(proj.observerIds)) {
            for (const pid of proj.observerIds) {
                const p = this.gameWorld.players.get(pid);
                const c = p?.clientState;
                if (c && typeof c.send === 'function') clients.set(pid, c);
            }
        }

        // Plus players currently nearby (hit-time)
        try {
            const near = this.gameWorld.getPlayersInArea(Math.round(x), Math.round(y), z, proj?.interestRange ?? 24);
            for (const p of near) {
                const c = p?.clientState;
                if (c && typeof c.send === 'function') clients.set(p.id, c);
            }
        } catch {}

        for (const c of clients.values()) {
            c.send(type, payload);
        }
    }
}
