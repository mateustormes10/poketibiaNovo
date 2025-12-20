-- Tabelas de NPCs e Economia
USE poketibia;

-- Balance (Gold Coin)
CREATE TABLE IF NOT EXISTS balance (
    player_id INT NOT NULL PRIMARY KEY,
    gold_coin INT NOT NULL DEFAULT 0,
    FOREIGN KEY (player_id) REFERENCES players(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- NPCs
CREATE TABLE IF NOT EXISTS npcs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    x INT NOT NULL,
    y INT NOT NULL,
    z INT NOT NULL,
    sprite INT NOT NULL DEFAULT 0,
    world_id INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- NPC Shop Items
CREATE TABLE IF NOT EXISTS npc_shop_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    npc_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    price INT NOT NULL,
    FOREIGN KEY (npc_id) REFERENCES npcs(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Player Inventory
CREATE TABLE IF NOT EXISTS player_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (player_id) REFERENCES players(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insere NPCs iniciais
INSERT INTO npcs (name, type, x, y, z, sprite, world_id)
VALUES 
('Vendedor', 'shop', 10, 15, 3, 0, 0),
('Enfermeira', 'heal', 12, 15, 3, 0, 0)
ON DUPLICATE KEY UPDATE name=name;

-- Insere itens da loja do Vendedor
INSERT INTO npc_shop_items (npc_id, item_name, item_type, price)
VALUES 
(1, 'Poção', 'potion', 10),
(1, 'Pokéball', 'pokeball', 25)
ON DUPLICATE KEY UPDATE item_name=item_name;

-- Insere balance inicial para players existentes
INSERT IGNORE INTO balance (player_id, gold_coin)
SELECT id, 0 FROM players
WHERE id <= 10;
