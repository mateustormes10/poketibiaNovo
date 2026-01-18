import { Logger } from '../utils/Logger.js';

const logger = new Logger('NpcHandler');

export class NpcHandler {
    constructor(gameWorld, balanceRepository, npcRepository, inventoryRepository) {
        this.gameWorld = gameWorld;
        this.balanceRepository = balanceRepository;
        this.npcRepository = npcRepository;
        this.inventoryRepository = inventoryRepository;
    }

    /**
     * Handler de interação com NPC
     */
    async handleInteract(client, data) {
        if (!client.player) return;
        
        const player = client.player;
        const { npcId } = data;

        logger.info(`[NpcHandler] Player ${player.name} trying to interact with NPC ${npcId}`);

        // Verifica se o NPC existe
        const npc = this.gameWorld.npcs.get(npcId);
        if (!npc) {
            logger.error(`[NpcHandler] NPC ${npcId} não encontrado`);
            return;
        }

        // Valida proximidade
        if (!npc.isPlayerNear(player)) {
            client.send('system_message', {
                message: 'Você está muito longe.'
            });
            logger.warn(`[NpcHandler] Player ${player.name} too far from NPC ${npc.name}`);
            return;
        }

        logger.info(`[NpcHandler] Player ${player.name} interagiu com ${npc.name}`);

        // Processa baseado no tipo do NPC
        switch (npc.type) {
            case 'shop':
                await this.handleShop(client, npc);
                break;
            case 'heal':
                await this.handleHeal(client, npc);
                break;
            default:
                logger.warn(`[NpcHandler] Tipo de NPC desconhecido: ${npc.type}`);
        }
    }

    /**
     * Abre diálogo de loja
     */
    async handleShop(client, npc) {
        const player = client.player;
        const items = await this.npcRepository.loadShopItems(npc.id);
        const balance = await this.balanceRepository.getBalance(player.dbId);

        logger.info(`[NpcHandler] Opening shop for ${player.name} - Balance: ${balance} gold, Items: ${items.length}`);

        client.send('npc_dialog', {
            npcId: npc.id,
            npcName: npc.name,
            dialogType: 'shop',
            items: items.map(item => ({
                name: item.item_name,
                type: item.item_type,
                price: item.price
            })),
            balance: balance
        });

        logger.info(`[NpcHandler] Shop dialog sent to ${player.name}`);
    }

    /**
     * Handler de compra de item
     */
    async handleBuy(client, data) {
        try {

            if (!client.player) {
                logger.warn('[NpcHandler] [DEBUG] handleBuy: client.player não existe');
                return;
            }
            const player = client.player;
            const { npcId, itemType, itemName, price } = data;

            logger.info(`[NpcHandler] Player ${player.name} trying to buy ${itemName} for ${price} gold`);

            // Verifica NPC (NÃO checa mais isPlayerNear)
            const npc = this.gameWorld.npcs.get(npcId);
            if (!npc) {
                logger.warn(`[NpcHandler] [DEBUG] handleBuy: NPC ${npcId} não encontrado`);
                client.send('system_message', {
                    message: 'NPC não encontrado.'
                });
                return;
            }


            const balance = await this.balanceRepository.getBalance(player.dbId);
            if (balance < price) {
                client.send('system_message', {
                    message: 'Gold insuficiente.'
                });
                logger.warn(`[NpcHandler] ${player.name} has insufficient gold: ${balance} < ${price}`);
                return;
            }

            const newBalance = await this.balanceRepository.removeGold(player.dbId, price);
            // Atualiza o campo goldCoin do player em memória (GameWorld)
            if (this.gameWorld.players) {
                let playerObj = this.gameWorld.players.get(player.dbId) || this.gameWorld.players.get(player.id);
                // Se não achou, tenta por string ou id/dbId
                if (!playerObj) {
                    for (const p of this.gameWorld.players.values()) {
                        if (p.dbId == player.dbId || p.id == player.id || p.id == String(player.dbId) || p.dbId == String(player.id)) {
                            playerObj = p;
                            break;
                        }
                    }
                }
                if (playerObj) playerObj.goldCoin = newBalance;
            }

            await this.inventoryRepository.addItem(player.dbId, itemType, itemName, 1);

            // Notifica player
            client.send('purchase_success', {
                itemName: itemName,
                price: price,
                newBalance: newBalance
            });

            logger.info(`[NpcHandler] ${player.name} comprou ${itemName} por ${price} gold (novo balance: ${newBalance})`);
        } catch (err) {
            logger.error(`[NpcHandler] Erro em handleBuy: ${err && err.stack ? err.stack : err}`);
        }
    }

    /**
     * Cura o player e seus pokémons
     */
    async handleHeal(client, npc) {
        if (!client.player) return;
        
        const player = client.player;
        logger.info(`[NpcHandler] Healing ${player.name} at ${npc.name}`);

        // Cura HP do player
        player.hp = player.maxHp;

        // Cura todos os pokémons do player
        if (player.pokemons && player.pokemons.length > 0) {
            for (const pokemon of player.pokemons) {
                pokemon.current_hp = pokemon.maxHp;
                pokemon.current_mana = pokemon.maxMana;
            }
        }

        // Atualiza no banco
        await this.gameWorld.savePlayer(player);

        // Notifica player
        client.send('npc_heal', {
            message: 'Seus Pokémon estão totalmente curados!'
        });

        logger.info(`[NpcHandler] ${player.name} was healed by ${npc.name}`);
    }
}
