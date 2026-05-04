BEGIN;

INSERT INTO rooms (room_code, room_name, sort_order, base_guests, max_guests, extra_guest_fee, is_whole_rental)
VALUES
('DASIL', '다실', 1, 4, 8, 10000, FALSE),
('YESIL1', '예실1', 2, 2, 4, 10000, FALSE),
('YESIL2', '예실2', 3, 2, 4, 10000, FALSE),
('BYEOLSIL', '별실', 4, 2, 2, 10000, FALSE),
('UMSIL1', '움실1', 5, 2, 4, 10000, FALSE),
('UMSIL2', '움실2', 6, 2, 4, 10000, FALSE),
('WHOLE', '펜션 전체 대관', 7, 15, 30, 10000, TRUE)
ON CONFLICT (room_code) DO UPDATE SET
    room_name = EXCLUDED.room_name,
    sort_order = EXCLUDED.sort_order,
    base_guests = EXCLUDED.base_guests,
    max_guests = EXCLUDED.max_guests,
    extra_guest_fee = EXCLUDED.extra_guest_fee,
    is_whole_rental = EXCLUDED.is_whole_rental,
    updated_at = NOW();

WITH room_map AS (
    SELECT room_id, room_code FROM rooms
)
INSERT INTO room_prices (room_id, season, day_kind, base_price)
SELECT rm.room_id, p.season::season_type, p.day_kind::day_type, p.base_price
FROM room_map rm
JOIN (
    VALUES
    ('DASIL',    'off_peak', 'weekday', 220000),
    ('DASIL',    'off_peak', 'weekend', 270000),
    ('DASIL',    'peak',     'weekday', 270000),
    ('DASIL',    'peak',     'weekend', 330000),

    ('YESIL1',   'off_peak', 'weekday', 130000),
    ('YESIL1',   'off_peak', 'weekend', 160000),
    ('YESIL1',   'peak',     'weekday', 160000),
    ('YESIL1',   'peak',     'weekend', 210000),

    ('YESIL2',   'off_peak', 'weekday', 130000),
    ('YESIL2',   'off_peak', 'weekend', 160000),
    ('YESIL2',   'peak',     'weekday', 160000),
    ('YESIL2',   'peak',     'weekend', 210000),

    ('BYEOLSIL', 'off_peak', 'weekday',  90000),
    ('BYEOLSIL', 'off_peak', 'weekend', 110000),
    ('BYEOLSIL', 'peak',     'weekday', 130000),
    ('BYEOLSIL', 'peak',     'weekend', 160000),

    ('UMSIL1',   'off_peak', 'weekday', 140000),
    ('UMSIL1',   'off_peak', 'weekend', 180000),
    ('UMSIL1',   'peak',     'weekday', 180000),
    ('UMSIL1',   'peak',     'weekend', 230000),

    ('UMSIL2',   'off_peak', 'weekday', 140000),
    ('UMSIL2',   'off_peak', 'weekend', 180000),
    ('UMSIL2',   'peak',     'weekday', 180000),
    ('UMSIL2',   'peak',     'weekend', 230000),

    ('WHOLE',    'off_peak', 'weekday', 1000000),
    ('WHOLE',    'off_peak', 'weekend', 1200000),
    ('WHOLE',    'peak',     'weekday', 1300000),
    ('WHOLE',    'peak',     'weekend', 1500000)
) AS p(room_code, season, day_kind, base_price)
  ON rm.room_code = p.room_code
ON CONFLICT (room_id, season, day_kind) DO UPDATE SET
    base_price = EXCLUDED.base_price,
    updated_at = NOW();

COMMIT;
