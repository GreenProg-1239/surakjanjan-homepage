-- PostgreSQL schema for pension reservation system
-- Designed from current reservation page requirements and existing room list/pricing rules.

BEGIN;

-- 예약 상태는 내부적으로 세분화해서 관리하고,
-- 캘린더에는 reserved 상태만 노출하도록 설계한다.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
        CREATE TYPE reservation_status AS ENUM (
            'pending',    -- 예약중(입금 대기)
            'confirmed',  -- 예약확정
            'cancelled',  -- 관리자/사용자 취소
            'expired'     -- 임시예약 만료
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'season_type') THEN
        CREATE TYPE season_type AS ENUM ('off_peak', 'peak');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'day_type') THEN
        CREATE TYPE day_type AS ENUM ('weekday', 'weekend');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS rooms (
    room_id              BIGSERIAL PRIMARY KEY,
    room_code            VARCHAR(30) NOT NULL UNIQUE,
    room_name            VARCHAR(100) NOT NULL,
    sort_order           INTEGER NOT NULL DEFAULT 0,
    base_guests          INTEGER NOT NULL CHECK (base_guests >= 1),
    max_guests           INTEGER NOT NULL CHECK (max_guests >= base_guests),
    extra_guest_fee      INTEGER NOT NULL DEFAULT 10000 CHECK (extra_guest_fee >= 0),
    is_whole_rental      BOOLEAN NOT NULL DEFAULT FALSE,
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_prices (
    room_price_id        BIGSERIAL PRIMARY KEY,
    room_id              BIGINT NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    season               season_type NOT NULL,
    day_kind             day_type NOT NULL,
    base_price           INTEGER NOT NULL CHECK (base_price >= 0),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_room_prices UNIQUE (room_id, season, day_kind)
);

CREATE TABLE IF NOT EXISTS reservations (
    reservation_id       BIGSERIAL PRIMARY KEY,
    room_id              BIGINT NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
    stay_date            DATE NOT NULL,
    guest_name           VARCHAR(100) NOT NULL,
    phone_number         VARCHAR(30) NOT NULL,
    depositor_name       VARCHAR(100) NOT NULL,
    guest_count          INTEGER NOT NULL CHECK (guest_count >= 1),
    base_guests_snapshot INTEGER NOT NULL CHECK (base_guests_snapshot >= 1),
    max_guests_snapshot  INTEGER NOT NULL CHECK (max_guests_snapshot >= base_guests_snapshot),
    extra_guest_fee_snapshot INTEGER NOT NULL DEFAULT 10000 CHECK (extra_guest_fee_snapshot >= 0),
    season_snapshot      season_type NOT NULL,
    day_kind_snapshot    day_type NOT NULL,
    base_price_snapshot  INTEGER NOT NULL CHECK (base_price_snapshot >= 0),
    final_price          INTEGER NOT NULL CHECK (final_price >= 0),
    status               reservation_status NOT NULL DEFAULT 'pending',
    reserved_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hold_expires_at      TIMESTAMPTZ NULL,
    confirmed_at         TIMESTAMPTZ NULL,
    cancelled_at         TIMESTAMPTZ NULL,
    cancellation_reason  TEXT NULL,
    admin_memo           TEXT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_guest_count_within_max CHECK (guest_count <= max_guests_snapshot)
);

-- 같은 날짜/객실에 대해 pending 또는 confirmed 가 동시에 2건 이상 생기지 않게 방지
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_reservation_per_room_date
ON reservations (room_id, stay_date)
WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_reservations_stay_date ON reservations (stay_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status);
CREATE INDEX IF NOT EXISTS idx_reservations_hold_expires_at ON reservations (hold_expires_at);

-- 달력용 상태 조회 뷰
CREATE OR REPLACE VIEW calendar_room_status AS
SELECT
    r.room_id,
    rm.room_name,
    r.stay_date,
    CASE
        WHEN r.status IN ('pending', 'confirmed') THEN 'reserved'
        ELSE 'available'
    END AS calendar_status,
    r.status AS internal_status,
    r.hold_expires_at
FROM reservations r
JOIN rooms rm ON rm.room_id = r.room_id
WHERE r.status IN ('pending', 'confirmed');

-- 요금 계산 헬퍼 함수
CREATE OR REPLACE FUNCTION calc_room_price(
    p_room_id BIGINT,
    p_stay_date DATE,
    p_guest_count INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_season season_type;
    v_day_kind day_type;
    v_base_guests INTEGER;
    v_extra_guest_fee INTEGER;
    v_base_price INTEGER;
    v_extra_count INTEGER;
BEGIN
    IF EXTRACT(MONTH FROM p_stay_date) IN (7, 8) THEN
        v_season := 'peak';
    ELSE
        v_season := 'off_peak';
    END IF;

    -- PostgreSQL DOW: 0=일, 5=금, 6=토
    IF EXTRACT(DOW FROM p_stay_date) IN (5, 6) THEN
        v_day_kind := 'weekend';
    ELSE
        v_day_kind := 'weekday';
    END IF;

    SELECT base_guests, extra_guest_fee
      INTO v_base_guests, v_extra_guest_fee
      FROM rooms
     WHERE room_id = p_room_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'room_id % not found', p_room_id;
    END IF;

    SELECT base_price
      INTO v_base_price
      FROM room_prices
     WHERE room_id = p_room_id
       AND season = v_season
       AND day_kind = v_day_kind;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'price rule missing for room_id %, season %, day_kind %', p_room_id, v_season, v_day_kind;
    END IF;

    v_extra_count := GREATEST(0, p_guest_count - v_base_guests);
    RETURN v_base_price + (v_extra_count * v_extra_guest_fee);
END;
$$ LANGUAGE plpgsql;

-- 예약 생성용 예시 트랜잭션에서 사용할 보조 함수
CREATE OR REPLACE FUNCTION create_pending_reservation(
    p_room_id BIGINT,
    p_stay_date DATE,
    p_guest_name VARCHAR,
    p_phone_number VARCHAR,
    p_depositor_name VARCHAR,
    p_guest_count INTEGER,
    p_hold_hours INTEGER DEFAULT 3
) RETURNS BIGINT AS $$
DECLARE
    v_room rooms%ROWTYPE;
    v_season season_type;
    v_day_kind day_type;
    v_base_price INTEGER;
    v_final_price INTEGER;
    v_reservation_id BIGINT;
BEGIN
    SELECT * INTO v_room
      FROM rooms
     WHERE room_id = p_room_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'active room_id % not found', p_room_id;
    END IF;

    IF p_guest_count > v_room.max_guests THEN
        RAISE EXCEPTION 'guest_count % exceeds max_guests % for room_id %', p_guest_count, v_room.max_guests, p_room_id;
    END IF;

    IF EXTRACT(MONTH FROM p_stay_date) IN (7, 8) THEN
        v_season := 'peak';
    ELSE
        v_season := 'off_peak';
    END IF;

    IF EXTRACT(DOW FROM p_stay_date) IN (5, 6) THEN
        v_day_kind := 'weekend';
    ELSE
        v_day_kind := 'weekday';
    END IF;

    SELECT base_price INTO v_base_price
      FROM room_prices
     WHERE room_id = p_room_id
       AND season = v_season
       AND day_kind = v_day_kind;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'price rule missing for room_id %, season %, day_kind %', p_room_id, v_season, v_day_kind;
    END IF;

    v_final_price := v_base_price + (GREATEST(0, p_guest_count - v_room.base_guests) * v_room.extra_guest_fee);

    INSERT INTO reservations (
        room_id,
        stay_date,
        guest_name,
        phone_number,
        depositor_name,
        guest_count,
        base_guests_snapshot,
        max_guests_snapshot,
        extra_guest_fee_snapshot,
        season_snapshot,
        day_kind_snapshot,
        base_price_snapshot,
        final_price,
        status,
        hold_expires_at
    ) VALUES (
        p_room_id,
        p_stay_date,
        p_guest_name,
        p_phone_number,
        p_depositor_name,
        p_guest_count,
        v_room.base_guests,
        v_room.max_guests,
        v_room.extra_guest_fee,
        v_season,
        v_day_kind,
        v_base_price,
        v_final_price,
        'pending',
        NOW() + make_interval(hours => p_hold_hours)
    ) RETURNING reservation_id INTO v_reservation_id;

    RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
