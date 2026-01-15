-- ==============================================
-- SEED DATA PARA TESTE DO SISTEMA DE INVENTÁRIO
-- ==============================================

-- Limpa dados de teste anteriores (cuidado em produção!)
-- DELETE FROM player_inventory WHERE player_id IN (1, 2, 3);

-- Player 1 - Inventário Variado
INSERT INTO player_inventory (player_id, item_type, item_name, quantity) VALUES
(1, 'potion', 'Poção', 15),
(1, 'potion', 'Super Poção', 8),
(1, 'potion', 'Hyper Poção', 3),
(1, 'revive', 'Revive', 5),
(1, 'gold', 'Gold Coin', 10000);

-- Player 2 - Inventário Inicial
INSERT INTO player_inventory (player_id, item_type, item_name, quantity) VALUES
(1, 'potion', 'Poção', 5),
(1, 'gold', 'Gold Coin', 500);

-- Player 3 - Inventário Vazio (para testar)
-- Não insere nada, inventário virá vazio

-- Verificar dados inseridos
SELECT 
    player_id,
    COUNT(*) as total_items,
    SUM(quantity) as total_quantity
FROM player_inventory
GROUP BY player_id;

-- Verificar inventário de um player específico
SELECT * FROM player_inventory WHERE player_id = 1 ORDER BY slot_order;
