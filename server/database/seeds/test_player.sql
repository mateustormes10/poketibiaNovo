-- Script para criar player de teste
-- Insere account de teste se não existir
INSERT INTO accounts (id, name, password, email, created_at) 
VALUES (1, 'admin', '$2a$10$test', 'admin@poketibia.com', NOW())
ON DUPLICATE KEY UPDATE id = id;

-- Insere player de teste se não existir
INSERT INTO players (id, account_id, name, level, experience, hp, max_hp, mp, max_mp, pos_x, pos_y, pos_z, created_at)
VALUES (1, 1, 'Admin', 1, 0, 100, 100, 50, 50, 50, 50, 1, NOW())
ON DUPLICATE KEY UPDATE id = id;

-- Verifica se foi criado
SELECT * FROM players WHERE id = 1;
SELECT * FROM accounts WHERE id = 1;
