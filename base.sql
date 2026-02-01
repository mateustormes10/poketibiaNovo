SET FOREIGN_KEY_CHECKS=0;

-- ======================
-- ACCOUNTS
-- ======================
CREATE TABLE accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    premdays INT NOT NULL DEFAULT 0,
    lastday INT NOT NULL DEFAULT 0,
    email VARCHAR(255) NOT NULL DEFAULT '',
    account_key VARCHAR(20) NOT NULL DEFAULT '0',
    blocked TINYINT(1) NOT NULL DEFAULT 0,
    warnings INT NOT NULL DEFAULT 0,
    group_id INT NOT NULL DEFAULT 1,
    UNIQUE KEY uk_account_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO accounts (name, password)
VALUES
('teste', '123'),
('teste2', '123');


-- ======================
-- PLAYERS
-- ======================
CREATE TABLE players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    world_id INT NOT NULL DEFAULT 0,
    group_id INT NOT NULL,
    account_id INT NOT NULL,
    level INT NOT NULL DEFAULT 1,
    vocation INT NOT NULL DEFAULT 0,
    health INT NOT NULL DEFAULT 100,
    healthmax INT NOT NULL DEFAULT 100,
    experience BIGINT NOT NULL DEFAULT 0,
    lookbody INT NOT NULL DEFAULT 10,
    lookfeet INT NOT NULL DEFAULT 10,
    lookhead INT NOT NULL DEFAULT 10,
    looklegs INT NOT NULL DEFAULT 10,
    looktype INT NOT NULL DEFAULT 136,
    lookaddons INT NOT NULL DEFAULT 0,
    maglevel INT NOT NULL DEFAULT 0,
    mana INT NOT NULL DEFAULT 100,
    manamax INT NOT NULL DEFAULT 100,
    manaspent INT NOT NULL DEFAULT 0,
    soul INT NOT NULL DEFAULT 0,
    town_id INT NOT NULL,
    posx INT NOT NULL DEFAULT 0,
    posy INT NOT NULL DEFAULT 0,
    posz INT NOT NULL DEFAULT 0,
    conditions BLOB NOT NULL,
    cap INT NOT NULL DEFAULT 0,
    sex INT NOT NULL DEFAULT 0,
    lastlogin INT NOT NULL DEFAULT 0,
    lastip INT NOT NULL DEFAULT 0,
    save TINYINT(1) NOT NULL DEFAULT 1,
    skull INT NOT NULL DEFAULT 0,
    skulltime INT NOT NULL DEFAULT 0,
    rank_id INT NOT NULL,
    guildnick VARCHAR(255) NOT NULL DEFAULT '',
    lastlogout INT NOT NULL DEFAULT 0,
    blessings INT NOT NULL DEFAULT 0,
    balance INT NOT NULL DEFAULT 0,
    stamina INT NOT NULL DEFAULT 151200000,
    direction INT NOT NULL DEFAULT 2,
    loss_experience INT NOT NULL DEFAULT 100,
    loss_mana INT NOT NULL DEFAULT 100,
    loss_skills INT NOT NULL DEFAULT 100,
    loss_containers INT NOT NULL DEFAULT 100,
    loss_items INT NOT NULL DEFAULT 100,
    premend INT NOT NULL DEFAULT 0,
    online TINYINT(1) NOT NULL DEFAULT 0,
    marriage INT NOT NULL DEFAULT 0,
    promotion INT NOT NULL DEFAULT 0,
    deleted TINYINT(1) NOT NULL DEFAULT 0,
    description VARCHAR(255) NOT NULL DEFAULT '',
    UNIQUE KEY uk_player_name (name, deleted),
    CONSTRAINT fk_player_account FOREIGN KEY (account_id)
        REFERENCES accounts(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE players
MODIFY COLUMN lookaddons VARCHAR(50) NOT NULL DEFAULT 'default';
ALTER TABLE players 
MODIFY COLUMN conditions BLOB NOT NULL DEFAULT '{"fome": "100", "stamina": "100", "points":0 ,"hit_points": 0, "velocity": 0, "damage": 0, "defense": 0, "crit_chance": 0, "crit_damage": 0, "dodge": 0, "coundown": 0, "scan_efficiency": 0, "lucky": 0}';

INSERT INTO players (
    name, world_id, group_id, account_id,
    level, vocation,
    health, healthmax,
    experience,
    lookbody, lookfeet, lookhead, looklegs, looktype, lookaddons,
    maglevel, mana, manamax, manaspent,
    soul, town_id,
    posx, posy, posz,
    conditions,
    cap, sex,
    rank_id
) VALUES
(
    'TormesBr', 0, 1, 1,
    1, 4,
    100, 100,
    0,
    10, 10, 10, 10, 136, 'default',
    0, 100, 100, 0,
    0, 1,
    0, 0, 2,
    '',
    0, 0,
    0
),
(
    'AshKetchum', 0, 1, 2,
    1, 0,
    100, 100,
    0,
    10, 10, 10, 10, 136, 'default',
    0, 100, 100, 0,
    0, 1,
    3, 3, 2,
    '',
    0, 0,
    0
);


-- ======================
-- VIP LIST
-- ======================
CREATE TABLE account_viplist (
    account_id INT NOT NULL,
    world_id INT NOT NULL DEFAULT 0,
    player_id INT NOT NULL,
    PRIMARY KEY (account_id, player_id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (player_id) REFERENCES players(id)
) ENGINE=InnoDB;

-- ======================
-- BANS
-- ======================
CREATE TABLE bans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type INT NOT NULL,
    value INT NOT NULL,
    param BIGINT NOT NULL DEFAULT 4294967295,
    active TINYINT(1) NOT NULL DEFAULT 1,
    expires INT NOT NULL,
    added INT NOT NULL,
    admin_id INT NOT NULL DEFAULT 0,
    comment TEXT NOT NULL,
    reason INT NOT NULL DEFAULT 0,
    action_type INT NOT NULL DEFAULT 0,
    statement_text VARCHAR(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB;

-- ======================
-- PLAYER DEATHS
-- ======================
CREATE TABLE player_deaths (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    date INT NOT NULL,
    level INT NOT NULL,
    FOREIGN KEY (player_id) REFERENCES players(id)
) ENGINE=InnoDB;

CREATE TABLE killers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    death_id INT NOT NULL,
    final_hit TINYINT(1) NOT NULL DEFAULT 0,
    unjustified TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (death_id) REFERENCES player_deaths(id)
) ENGINE=InnoDB;

CREATE TABLE environment_killers (
    kill_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    FOREIGN KEY (kill_id) REFERENCES killers(id)
) ENGINE=InnoDB;

-- ======================
-- GLOBAL STORAGE
-- ======================
CREATE TABLE global_storage (
    storage_key INT NOT NULL,
    world_id INT NOT NULL DEFAULT 0,
    value VARCHAR(255) NOT NULL DEFAULT '0',
    PRIMARY KEY (storage_key, world_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS=1;

SET FOREIGN_KEY_CHECKS=0;

-- ======================
-- GUILDS
-- ======================
CREATE TABLE guilds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    world_id INT NOT NULL DEFAULT 0,
    name VARCHAR(255) NOT NULL,
    ownerid INT NOT NULL,
    creationdata INT NOT NULL,
    motd VARCHAR(255) NOT NULL DEFAULT '',
    UNIQUE KEY uk_guild (name, world_id),
    FOREIGN KEY (ownerid) REFERENCES players(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE guild_invites (
    player_id INT NOT NULL,
    guild_id INT NOT NULL,
    PRIMARY KEY (player_id, guild_id),
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id)
) ENGINE=InnoDB;

CREATE TABLE guild_ranks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    level INT NOT NULL,
    FOREIGN KEY (guild_id) REFERENCES guilds(id)
) ENGINE=InnoDB;

-- ======================
-- HOUSES
-- ======================
CREATE TABLE houses (
    id INT NOT NULL,
    world_id INT NOT NULL DEFAULT 0,
    owner INT NOT NULL,
    paid INT NOT NULL DEFAULT 0,
    warnings INT NOT NULL DEFAULT 0,
    lastwarning INT NOT NULL DEFAULT 0,
    name VARCHAR(255) NOT NULL,
    town INT NOT NULL DEFAULT 0,
    size INT NOT NULL DEFAULT 0,
    price INT NOT NULL DEFAULT 0,
    rent INT NOT NULL DEFAULT 0,
    doors INT NOT NULL DEFAULT 0,
    beds INT NOT NULL DEFAULT 0,
    tiles INT NOT NULL DEFAULT 0,
    guild TINYINT(1) NOT NULL DEFAULT 0,
    clear_house TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id, world_id)
) ENGINE=InnoDB;

CREATE TABLE house_lists (
    house_id INT NOT NULL,
    world_id INT NOT NULL DEFAULT 0,
    listid INT NOT NULL,
    list TEXT NOT NULL,
    PRIMARY KEY (house_id, world_id, listid),
    FOREIGN KEY (house_id, world_id) REFERENCES houses(id, world_id)
) ENGINE=InnoDB;

CREATE TABLE house_data (
    house_id INT NOT NULL,
    world_id INT NOT NULL DEFAULT 0,
    data LONGBLOB NOT NULL,
    PRIMARY KEY (house_id, world_id),
    FOREIGN KEY (house_id, world_id) REFERENCES houses(id, world_id)
) ENGINE=InnoDB;

CREATE TABLE house_auctions (
    house_id INT NOT NULL,
    world_id INT NOT NULL DEFAULT 0,
    player_id INT NOT NULL,
    bid INT NOT NULL DEFAULT 0,
    bid_limit INT NOT NULL DEFAULT 0,
    endtime INT NOT NULL DEFAULT 0,
    PRIMARY KEY (house_id, world_id),
    FOREIGN KEY (house_id, world_id) REFERENCES houses(id, world_id),
    FOREIGN KEY (player_id) REFERENCES players(id)
) ENGINE=InnoDB;

-- ======================
-- PLAYER DATA
-- ======================

CREATE TABLE player_depotitems (
    player_id INT NOT NULL,
    sid INT NOT NULL,
    pid INT NOT NULL DEFAULT 0,
    itemtype INT NOT NULL,
    count INT NOT NULL DEFAULT 0,
    attributes BLOB NOT NULL,
    PRIMARY KEY (player_id, sid),
    FOREIGN KEY (player_id) REFERENCES players(id)
) ENGINE=InnoDB;

CREATE TABLE player_namelocks (
    player_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    new_name VARCHAR(255) NOT NULL,
    date INT NOT NULL DEFAULT 0,
    FOREIGN KEY (player_id) REFERENCES players(id)
) ENGINE=InnoDB;

CREATE TABLE player_storage (
    player_id INT NOT NULL,
    storage_key INT NOT NULL,
    value VARCHAR(255) NOT NULL DEFAULT '0',
    PRIMARY KEY (player_id, storage_key),
    FOREIGN KEY (player_id) REFERENCES players(id)
) ENGINE=InnoDB;

CREATE TABLE player_viplist (
    player_id INT NOT NULL,
    vip_id INT NOT NULL,
    PRIMARY KEY (player_id, vip_id),
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (vip_id) REFERENCES players(id)
) ENGINE=InnoDB;

-- ======================
-- SERVER
-- ======================
CREATE TABLE server_config (
    config VARCHAR(35) NOT NULL,
    value INT NOT NULL,
    PRIMARY KEY (config)
) ENGINE=InnoDB;

CREATE TABLE server_motd (
    id INT NOT NULL,
    world_id INT NOT NULL DEFAULT 0,
    text TEXT NOT NULL,
    PRIMARY KEY (id, world_id)
) ENGINE=InnoDB;

CREATE TABLE server_record (
    record INT NOT NULL,
    world_id INT NOT NULL DEFAULT 0,
    timestamp INT NOT NULL,
    PRIMARY KEY (record, world_id, timestamp)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS=1;

CREATE TABLE server_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    world_id INT NOT NULL DEFAULT 0,
    player_id INT NOT NULL DEFAULT 0,
    posx INT NOT NULL DEFAULT 0,
    posy INT NOT NULL DEFAULT 0,
    posz INT NOT NULL DEFAULT 0,
    timestamp INT NOT NULL DEFAULT 0,
    report TEXT NOT NULL,
    read_count INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE player_active_monsters (
    player_id INT NOT NULL,
    monster_id INT NOT NULL,
    slot INT NOT NULL, -- 1 a 6
    nickname VARCHAR(50) DEFAULT NULL,
    x INT NOT NULL DEFAULT 0,
    y INT NOT NULL DEFAULT 0,
    direction VARCHAR(10) NOT NULL DEFAULT 'down',
    PRIMARY KEY (player_id, slot),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

INSERT INTO player_active_monsters (player_id, monster_id, slot, direction)
VALUES 
(1, 1, 1, 'down'),  -- o pokemon_id aqui pode dar erro precisa ser um id correto de dentro de pokemon
(1, 2, 2, 'down');  -- Raichu



CREATE TABLE player_monsters (
    id INT AUTO_INCREMENT PRIMARY KEY,

    player_id INT NOT NULL,
    monster_id INT NOT NULL,
    nickname VARCHAR(50) DEFAULT NULL,

    level INT NOT NULL DEFAULT 1,
    experience BIGINT NOT NULL DEFAULT 0,

    current_hp INT NOT NULL,
    current_mana INT NOT NULL,

    created_at INT NOT NULL DEFAULT UNIX_TIMESTAMP(),

    FOREIGN KEY (player_id) REFERENCES players(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================
-- PLAYER INVENTORY
-- ======================
-- Se a tabela já existe, remova primeiro
DROP TABLE IF EXISTS player_inventory;

-- Cria a tabela corretamente
CREATE TABLE player_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    item_type VARCHAR(50) NOT NULL DEFAULT 'consumable',
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_player_inventory (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE player_inventory
ADD COLUMN slot_order INT NOT NULL DEFAULT 0 AFTER item_name;


-- Adiciona itens de teste para o player 1
INSERT INTO player_inventory (player_id, item_type, item_name, quantity) VALUES
(1, 'consumable', 'Poção', 15),
(1, 'consumable', 'Super Poção', 8),
(1, 'battle', 'Pokébola', 25),
(1, 'misc', 'Gold Coin', 10000);