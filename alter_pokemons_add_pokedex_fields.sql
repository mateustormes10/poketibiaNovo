-- Adiciona campos para suportar todos os dados do Pokédex nacional
ALTER TABLE pokemons
ADD COLUMN national_dex_number INT AFTER id,
ADD COLUMN form VARCHAR(50) NULL AFTER name,
ADD COLUMN experience INT NULL AFTER defense_base,
ADD COLUMN base_sp_atk INT NULL AFTER defense_base,
ADD COLUMN base_sp_def INT NULL AFTER base_sp_atk