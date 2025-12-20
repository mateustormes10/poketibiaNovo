export class BalanceRepository {
    constructor(database) {
        this.db = database;
    }

    /**
     * Busca o balance de um player
     */
    async getBalance(playerId) {
        const result = await this.db.query(
            'SELECT gold_coin FROM balance WHERE player_id = ?',
            [playerId]
        );

        if (result.length === 0) {
            // Cria balance inicial se não existir
            await this.db.query(
                'INSERT INTO balance (player_id, gold_coin) VALUES (?, 0)',
                [playerId]
            );
            return 0;
        }

        return result[0].gold_coin;
    }

    /**
     * Adiciona gold coin ao player
     */
    async addGold(playerId, amount) {
        await this.db.query(
            'UPDATE balance SET gold_coin = gold_coin + ? WHERE player_id = ?',
            [amount, playerId]
        );

        return await this.getBalance(playerId);
    }

    /**
     * Remove gold coin do player
     */
    async removeGold(playerId, amount) {
        const currentBalance = await this.getBalance(playerId);

        if (currentBalance < amount) {
            return null; // Saldo insuficiente
        }

        await this.db.query(
            'UPDATE balance SET gold_coin = gold_coin - ? WHERE player_id = ?',
            [amount, playerId]
        );

        return await this.getBalance(playerId);
    }

    /**
     * Define o balance exato do player
     */
    async setBalance(playerId, amount) {
        await this.db.query(
            'UPDATE balance SET gold_coin = ? WHERE player_id = ?',
            [amount, playerId]
        );

        return amount;
    }
}
