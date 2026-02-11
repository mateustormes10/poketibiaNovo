-- Backup das casas padrão para tabela house_lists
-- Execute este script para restaurar as casas de exemplo

INSERT INTO house_lists (
  house_id, map_id, city_name, door_x, door_y, door_z,
  area_from_x, area_from_y, area_to_x, area_to_y, area_z,
  size_sqm, rent_price, owner_id, is_rented, last_paid_at, created_at, updated_at
) VALUES
(1, 'CidadeInicial', 'CidadeInicial', 10, 10, 3, 11, 10, 15, 14, 3, 25, 500, 1, 1, NULL, '2026-02-10 09:10:59', '2026-02-10 12:16:17'),
(2, 'CidadeInicial', 'CidadeInicial', 20, 8, 3, 21, 8, 26, 12, 3, 30, 650, NULL, 0, NULL, '2026-02-10 09:10:59', '2026-02-10 12:16:20'),
(3, 'CidadeInicial', 'CidadeInicial', 5, 20, 3, 6, 20, 10, 24, 3, 20, 400, NULL, 0, NULL, '2026-02-10 09:10:59', '2026-02-10 12:16:23');
