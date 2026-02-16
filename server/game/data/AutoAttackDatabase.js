// Server-authoritative AutoAttack definitions (numeric only).
// Client visuals (sprites/frames) are configured in Unity.

export const AutoAttackDatabase = [
    {
        attackName: 'Energy',
        speed: 8, // tiles/sec
        damage: 6,
        range: 10, // tiles
        cooldownSeconds: 0.7
    },
    {
        attackName: 'Fire',
        speed: 7,
        damage: 8,
        range: 9,
        cooldownSeconds: 1.0
    },
    {
        attackName: 'Flecha Fogo',
        speed: 9,
        damage: 5,
        range: 8,
        cooldownSeconds: 0.5
    },
    {
        attackName: 'Flecha Veneno',
        speed: 8,
        damage: 7,
        range: 10,
        cooldownSeconds: 0.9
    },
    {
        attackName: 'Gelo',
        speed: 8,
        damage: 7,
        range: 10,
        cooldownSeconds: 0.9
    }
];
