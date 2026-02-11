import { GuildRepository } from '../persistence/GuildRepository.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('GuildService');

function clampInt(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function normalizeGuildName(value) {
    return String(value ?? '').trim();
}

export class GuildService {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
        this.guildRepository = new GuildRepository(gameWorld.database);

        // Requisitos (simples e configuráveis aqui)
        this.minCreateLevel = 1;
        this.createCostGold = 0;
    }

    async init() {
        // Best-effort: garante tabelas, mas não mexe em dados.
        try {
            await this.guildRepository.ensureTables();
        } catch (e) {
            logger.warn(`[init] ensureTables falhou: ${e?.message ?? e}`);
        }
    }

    async _getDbPlayer(client) {
        const playerId = client?.player?.dbId;
        if (!playerId) return null;
        return await this.gameWorld.playerRepository.findById(playerId);
    }

    async _getPlayerGuild(playerId) {
        return await this.guildRepository.getPlayerGuild(playerId);
    }

    async _assertNotInGuild(playerId) {
        const pg = await this._getPlayerGuild(playerId);
        if (pg) {
            return { ok: false, reason: 'already_in_guild' };
        }
        return { ok: true };
    }

    async listGuilds(worldId = 0) {
        const rows = await this.guildRepository.listByWorld(worldId);
        return rows.map(r => ({
            id: clampInt(r.id),
            world_id: clampInt(r.world_id),
            name: String(r.name ?? ''),
            ownerid: clampInt(r.ownerid),
            owner_name: String(r.owner_name ?? ''),
            motd: String(r.motd ?? ''),
            member_count: clampInt(r.member_count)
        }));
    }

    async getGuildPanel(guildId) {
        const guild = await this.guildRepository.findById(guildId);
        if (!guild) return null;

        const ranks = await this.guildRepository.findRanksByGuildId(guildId);
        const members = await this.guildRepository.getGuildMembers(guildId);
        return {
            guild: {
                id: clampInt(guild.id),
                world_id: clampInt(guild.world_id),
                name: String(guild.name ?? ''),
                ownerid: clampInt(guild.ownerid),
                creationdata: clampInt(guild.creationdata),
                motd: String(guild.motd ?? '')
            },
            ranks: (ranks || []).map(r => ({
                id: clampInt(r.id),
                guild_id: clampInt(r.guild_id),
                name: String(r.name ?? ''),
                level: clampInt(r.level)
            })),
            members: (members || []).map(m => ({
                player_id: clampInt(m.player_id),
                player_name: String(m.player_name ?? ''),
                level: clampInt(m.level),
                online: Boolean(m.online),
                guildnick: String(m.guildnick ?? ''),
                rank_id: clampInt(m.rank_id),
                rank_name: String(m.rank_name ?? ''),
                rank_level: clampInt(m.rank_level)
            }))
        };
    }

    async openMenu({ client }) {
        const dbPlayer = await this._getDbPlayer(client);
        if (!dbPlayer) return { success: false, reason: 'not_authenticated' };

        const worldId = clampInt(dbPlayer.world_id, 0);
        const guilds = await this.listGuilds(worldId);

        const playerGuild = await this._getPlayerGuild(dbPlayer.id);
        let myGuild = null;
        let invites = [];

        if (playerGuild) {
            const panel = await this.getGuildPanel(playerGuild.guild_id);
            myGuild = {
                guild_id: clampInt(playerGuild.guild_id),
                guild_name: String(playerGuild.guild_name ?? ''),
                ownerid: clampInt(playerGuild.ownerid),
                motd: String(playerGuild.motd ?? ''),
                my_rank: {
                    rank_id: clampInt(playerGuild.rank_id),
                    rank_name: String(playerGuild.rank_name ?? ''),
                    rank_level: clampInt(playerGuild.rank_level)
                },
                panel
            };

            // Apenas líder vê candidaturas.
            if (clampInt(playerGuild.rank_level) >= 3) {
                invites = await this.guildRepository.findInvitesDetailedByGuildId(playerGuild.guild_id);
                invites = (invites || []).map(i => ({
                    player_id: clampInt(i.player_id),
                    player_name: String(i.player_name ?? ''),
                    player_level: clampInt(i.player_level)
                }));
            }
        }

        return {
            success: true,
            world_id: worldId,
            guilds,
            my_guild: myGuild,
            invites
        };
    }

    async createGuild({ client, name, motd }) {
        const dbPlayer = await this._getDbPlayer(client);
        if (!dbPlayer) return { success: false, reason: 'not_authenticated' };

        const worldId = clampInt(dbPlayer.world_id, 0);
        const ownerId = clampInt(dbPlayer.id);

        const guildName = normalizeGuildName(name);
        if (!guildName) return { success: false, reason: 'invalid_name' };

        const notIn = await this._assertNotInGuild(ownerId);
        if (!notIn.ok) return { success: false, reason: notIn.reason };

        if (clampInt(dbPlayer.level) < this.minCreateLevel) {
            return { success: false, reason: 'level_too_low', minLevel: this.minCreateLevel };
        }

        if (this.createCostGold > 0) {
            const bal = await this.gameWorld.balanceRepository.getBalance(ownerId);
            if (clampInt(bal) < this.createCostGold) {
                return { success: false, reason: 'not_enough_gold', cost: this.createCostGold };
            }
            const newBalance = await this.gameWorld.balanceRepository.removeGold(ownerId, this.createCostGold);
            if (newBalance === null) {
                return { success: false, reason: 'not_enough_gold', cost: this.createCostGold };
            }
        }

        const existing = await this.guildRepository.findByName(guildName, worldId);
        if (existing) {
            return { success: false, reason: 'name_already_exists' };
        }

        const guild = await this.guildRepository.create({
            name: guildName,
            ownerid: ownerId,
            world_id: worldId,
            motd: String(motd ?? '')
        });

        // Cria ranks padrão e seta líder.
        const leaderRankId = await this.guildRepository.createRank(guild.id, 'Leader', 3);
        await this.guildRepository.createRank(guild.id, 'Vice-Leader', 2);
        await this.guildRepository.createRank(guild.id, 'Member', 1);
        await this.gameWorld.playerRepository.setRankId(ownerId, leaderRankId);

        logger.info(`Guild created: '${guildName}' (guildId=${guild.id}) by player ${ownerId}`);
        const menu = await this.openMenu({ client });
        return { success: true, guild_id: guild.id, menu };
    }

    async applyToGuild({ client, guildId }) {
        const dbPlayer = await this._getDbPlayer(client);
        if (!dbPlayer) return { success: false, reason: 'not_authenticated' };

        const gId = clampInt(guildId);
        if (!gId) return { success: false, reason: 'invalid_guild_id' };

        const notIn = await this._assertNotInGuild(dbPlayer.id);
        if (!notIn.ok) return { success: false, reason: notIn.reason };

        const guild = await this.guildRepository.findById(gId);
        if (!guild) return { success: false, reason: 'guild_not_found' };

        if (clampInt(guild.world_id) !== clampInt(dbPlayer.world_id, 0)) {
            return { success: false, reason: 'wrong_world' };
        }

        const existingInvite = await this.guildRepository.findInvite(dbPlayer.id, gId);
        if (existingInvite) return { success: false, reason: 'already_applied' };

        try {
            await this.guildRepository.createInvite(dbPlayer.id, gId);
        } catch (e) {
            // Duplicate key (best-effort) -> already applied
            return { success: false, reason: 'already_applied' };
        }

        logger.info(`Player ${dbPlayer.id} applied to guild ${gId}`);
        return { success: true };
    }

    async _assertLeaderOfGuild(playerId, guildId) {
        const pg = await this._getPlayerGuild(playerId);
        if (!pg) return { ok: false, reason: 'not_in_guild' };
        if (clampInt(pg.guild_id) !== clampInt(guildId)) return { ok: false, reason: 'not_same_guild' };
        if (clampInt(pg.rank_level) < 3) return { ok: false, reason: 'no_permission' };
        return { ok: true, playerGuild: pg };
    }

    async listInvites({ client }) {
        const dbPlayer = await this._getDbPlayer(client);
        if (!dbPlayer) return { success: false, reason: 'not_authenticated' };
        const pg = await this._getPlayerGuild(dbPlayer.id);
        if (!pg) return { success: false, reason: 'not_in_guild' };
        if (clampInt(pg.rank_level) < 3) return { success: false, reason: 'no_permission' };

        const invites = await this.guildRepository.findInvitesDetailedByGuildId(pg.guild_id);
        return {
            success: true,
            guild_id: clampInt(pg.guild_id),
            invites: (invites || []).map(i => ({
                player_id: clampInt(i.player_id),
                player_name: String(i.player_name ?? ''),
                player_level: clampInt(i.player_level)
            }))
        };
    }

    async approveInvite({ client, playerId }) {
        const dbPlayer = await this._getDbPlayer(client);
        if (!dbPlayer) return { success: false, reason: 'not_authenticated' };

        const targetPlayerId = clampInt(playerId);
        if (!targetPlayerId) return { success: false, reason: 'invalid_player_id' };

        const leaderGuild = await this._getPlayerGuild(dbPlayer.id);
        if (!leaderGuild) return { success: false, reason: 'not_in_guild' };

        const perm = await this._assertLeaderOfGuild(dbPlayer.id, leaderGuild.guild_id);
        if (!perm.ok) return { success: false, reason: perm.reason };

        const invite = await this.guildRepository.findInvite(targetPlayerId, leaderGuild.guild_id);
        if (!invite) return { success: false, reason: 'invite_not_found' };

        const targetAlready = await this._getPlayerGuild(targetPlayerId);
        if (targetAlready) {
            await this.guildRepository.deleteInvite(targetPlayerId, leaderGuild.guild_id);
            return { success: false, reason: 'player_already_in_guild' };
        }

        const memberRank = await this.guildRepository.findRankByGuildAndLevel(leaderGuild.guild_id, 1);
        if (!memberRank) return { success: false, reason: 'member_rank_missing' };

        await this.gameWorld.playerRepository.setRankId(targetPlayerId, memberRank.id);
        await this.guildRepository.deleteInvite(targetPlayerId, leaderGuild.guild_id);

        logger.info(`Leader ${dbPlayer.id} approved player ${targetPlayerId} into guild ${leaderGuild.guild_id}`);
        return { success: true, guild_id: clampInt(leaderGuild.guild_id), player_id: targetPlayerId };
    }

    async rejectInvite({ client, playerId }) {
        const dbPlayer = await this._getDbPlayer(client);
        if (!dbPlayer) return { success: false, reason: 'not_authenticated' };

        const targetPlayerId = clampInt(playerId);
        if (!targetPlayerId) return { success: false, reason: 'invalid_player_id' };

        const leaderGuild = await this._getPlayerGuild(dbPlayer.id);
        if (!leaderGuild) return { success: false, reason: 'not_in_guild' };

        const perm = await this._assertLeaderOfGuild(dbPlayer.id, leaderGuild.guild_id);
        if (!perm.ok) return { success: false, reason: perm.reason };

        await this.guildRepository.deleteInvite(targetPlayerId, leaderGuild.guild_id);
        logger.info(`Leader ${dbPlayer.id} rejected player ${targetPlayerId} for guild ${leaderGuild.guild_id}`);
        return { success: true };
    }

    async updateMotd({ client, motd }) {
        const dbPlayer = await this._getDbPlayer(client);
        if (!dbPlayer) return { success: false, reason: 'not_authenticated' };
        const pg = await this._getPlayerGuild(dbPlayer.id);
        if (!pg) return { success: false, reason: 'not_in_guild' };
        if (clampInt(pg.rank_level) < 3) return { success: false, reason: 'no_permission' };

        const newMotd = String(motd ?? '').slice(0, 255);
        await this.guildRepository.update(pg.guild_id, newMotd);
        logger.info(`Guild ${pg.guild_id} MOTD updated by leader ${dbPlayer.id}`);
        return { success: true, guild_id: clampInt(pg.guild_id), motd: newMotd };
    }
}
