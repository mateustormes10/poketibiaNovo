-- ==============================================
-- SEED DATA PARA TESTE DO SISTEMA DE INVENTÁRIO
-- ==============================================

-- Limpa dados de teste anteriores (cuidado em produção!)
-- DELETE FROM player_inventory WHERE player_id IN (1, 2, 3);

-- Player 1 - Inventário Variado
INSERT INTO player_inventory (player_id, item_type, item_name, quantity) VALUES
(1, 'consumable', 'Poção', 15),
(1, 'consumable', 'Super Poção', 8),
(1, 'consumable', 'Hyper Poção', 3),
(1, 'consumable', 'Revive', 5),
(1, 'battle', 'Pokébola', 25),
(1, 'battle', 'Great Ball', 10),
(1, 'battle', 'Ultra Ball', 5),
(1, 'misc', 'Gold Coin', 10000);

-- Player 2 - Inventário Inicial
INSERT INTO player_inventory (player_id, item_type, item_name, quantity) VALUES
(2, 'consumable', 'Poção', 5),
(2, 'battle', 'Pokébola', 10),
(2, 'misc', 'Gold Coin', 500);

-- Player 3 - Inventário Vazio (para testar)
-- Não insere nada, inventário virá vazio

-- Player 4 - Inventário Quase Cheio (para testar limite)
INSERT INTO player_inventory (player_id, item_type, item_name, quantity, slot_order) VALUES
(4, 'consumable', 'Poção', 99, 1),
(4, 'consumable', 'Super Poção', 99, 2),
(4, 'consumable', 'Hyper Poção', 99, 3),
(4, 'consumable', 'Revive', 99, 4),
(4, 'battle', 'Pokébola', 99, 5),
(4, 'battle', 'Great Ball', 99, 6),
(4, 'battle', 'Ultra Ball', 99, 7),
(4, 'misc', 'Gold Coin', 99999, 8),
(4, 'consumable', 'Poção', 10, 9),
(4, 'consumable', 'Poção', 10, 10),
(4, 'consumable', 'Poção', 10, 11),
(4, 'consumable', 'Poção', 10, 12),
(4, 'consumable', 'Poção', 10, 13),
(4, 'consumable', 'Poção', 10, 14),
(4, 'consumable', 'Poção', 10, 15),
(4, 'consumable', 'Poção', 10, 16),
(4, 'consumable', 'Poção', 10, 17),
(4, 'consumable', 'Poção', 10, 18),
(4, 'consumable', 'Poção', 10, 19),
(4, 'consumable', 'Poção', 10, 20),
(4, 'consumable', 'Poção', 10, 21),
(4, 'consumable', 'Poção', 10, 22),
(4, 'consumable', 'Poção', 10, 23),
(4, 'consumable', 'Poção', 10, 24),
(4, 'consumable', 'Poção', 10, 25),
(4, 'consumable', 'Poção', 10, 26),
(4, 'consumable', 'Poção', 10, 27),
(4, 'consumable', 'Poção', 10, 28),
(4, 'consumable', 'Poção', 10, 29),
(4, 'consumable', 'Poção', 10, 30),
(4, 'consumable', 'Poção', 10, 31),
(4, 'consumable', 'Poção', 10, 32),
(4, 'consumable', 'Poção', 10, 33),
(4, 'consumable', 'Poção', 10, 34),
(4, 'consumable', 'Poção', 10, 35),
(4, 'consumable', 'Poção', 10, 36),
(4, 'consumable', 'Poção', 10, 37),
(4, 'consumable', 'Poção', 10, 38),
(4, 'consumable', 'Poção', 10, 39);
-- Falta 1 slot para o inventário ficar cheio (40 slots)

-- Verificar dados inseridos
SELECT 
    player_id,
    COUNT(*) as total_items,
    SUM(quantity) as total_quantity
FROM player_inventory
GROUP BY player_id;

-- Verificar inventário de um player específico
SELECT * FROM player_inventory WHERE player_id = 1 ORDER BY slot_order;
