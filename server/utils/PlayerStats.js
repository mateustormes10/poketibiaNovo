function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
}

function readNumber(conditions, key, fallback = 0) {
    if (!conditions || typeof conditions !== 'object') return fallback;
    const raw = conditions[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string' && raw.trim() !== '') {
        const n = Number(raw);
        return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
}

export function getStat(player, keys, fallback = 0) {
    const conditions = player?.conditions;
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) {
        const v = readNumber(conditions, k, NaN);
        if (Number.isFinite(v)) return v;
    }
    return fallback;
}

export function getVelocity(player) {
    return getStat(player, ['velocity', 'velocidade'], 0);
}

export function getMaxStamina(player) {
    const velocity = getVelocity(player);
    const maxStamina = 100 + Math.floor(velocity * 2);
    return clampNumber(maxStamina, 100, 300);
}

export function getStaminaRegenPerRestTick(player) {
    const velocity = getVelocity(player);
    const regen = Math.round(4 * (1 + (velocity * 0.01)));
    return clampNumber(regen, 4, 20);
}

export function getDamageMultiplier(player) {
    const dmg = getStat(player, ['damage', 'dano'], 0);
    // +2% per point (50 => 2x). Clamped to avoid absurd values.
    return clampNumber(1 + (dmg * 0.02), 1, 5);
}

export function getCritChance(player) {
    const critChancePct = getStat(player, ['crit_chance', 'critical_chance', 'critChance'], 0);
    return clampNumber(critChancePct / 100, 0, 1);
}

export function getCritDamagePct(player) {
    // Percent bonus in addition to the base double-damage.
    return clampNumber(getStat(player, ['crit_damage', 'critical_damage', 'critDamage'], 0), 0, 300);
}

export function computeOutgoingSkillDamage(player, basePower) {
    const base = Math.max(0, Number(basePower) || 0);
    const mult = getDamageMultiplier(player);
    let damage = Math.floor(base * mult);

    const critChance = getCritChance(player);
    const critDamagePct = getCritDamagePct(player);
    const critMultiplier = 2 + (critDamagePct / 100);

    const isCrit = Math.random() < critChance;
    if (isCrit) {
        damage = Math.floor(damage * critMultiplier);
    }

    return {
        damage,
        isCrit,
        critMultiplier,
        critChancePct: Math.round(critChance * 1000) / 10,
        critDamagePct
    };
}

export function getDefenseReduction(player) {
    const defense = getStat(player, ['defense', 'defesa'], 0);
    // 0.5% reduction per point, up to 80%.
    return clampNumber(defense * 0.005, 0, 0.8);
}

export function getDodgeChance(player) {
    const dodgePct = getStat(player, ['dodge', 'esquiva'], 0);
    // Cap at 60% to keep it playable.
    return clampNumber(dodgePct / 100, 0, 0.6);
}

export function computeIncomingMonsterDamage(targetPlayer, baseDamage) {
    const base = Math.max(0, Math.floor(Number(baseDamage) || 0));

    const dodgeChance = getDodgeChance(targetPlayer);
    const dodged = Math.random() < dodgeChance;
    if (dodged) {
        return { damage: 0, dodged: true, reduction: 0, dodgeChancePct: Math.round(dodgeChance * 1000) / 10 };
    }

    const reduction = getDefenseReduction(targetPlayer);
    const reduced = Math.floor(base * (1 - reduction));
    return {
        damage: Math.max(0, reduced),
        dodged: false,
        reduction,
        dodgeChancePct: Math.round(dodgeChance * 1000) / 10
    };
}

export function getCooldownReduction(player) {
    const cooldownPct = getStat(player, ['coundown', 'cooldown'], 0);
    // Cap at 80% reduction.
    return clampNumber(cooldownPct / 100, 0, 0.8);
}

export function adjustCooldownSeconds(player, baseSeconds) {
    const base = Math.max(0, Number(baseSeconds) || 0);
    if (base <= 0) return 0;
    const reduction = getCooldownReduction(player);
    const adjusted = base * (1 - reduction);
    return clampNumber(adjusted, 0.2, base);
}

export function getScanSuccessChance(player) {
    const baseChance = 0.10;
    const efficiency = getStat(player, ['scan_efficiency', 'scanEfficiency', 'scan'], 0);
    const chance = baseChance + (efficiency * 0.001); // +0.1% per point
    return clampNumber(chance, baseChance, 0.50);
}

export function getLuckyDoubleCoinChance(player) {
    const luckyPct = getStat(player, ['lucky', 'sorte'], 0);
    // Cap at 50%.
    return clampNumber(luckyPct / 100, 0, 0.5);
}
