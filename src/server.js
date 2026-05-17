require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool } = require('./db');

const ROOT_DIR = path.join(__dirname, '..');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

app.use(cors({ origin: ALLOWED_ORIGIN === '*' ? true : ALLOWED_ORIGIN }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.get('/rooms', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'rooms.html'));
});

app.get('/facilities', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'facilities.html'));
});

app.get('/cafe', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'cafe.html'));
});

app.get('/breakfast', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'breakfast.html'));
});

app.get('/reservation', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'reservation.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'admin.html'));
});

function isValidMonth(input) {
  return /^\d{4}-\d{2}$/.test(input || '');
}

function isValidDate(input) {
  return /^\d{4}-\d{2}-\d{2}$/.test(input || '');
}

app.get('/api/health', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json({ ok: true, now: result.rows[0].now });
  } catch (error) {
    next(error);
  }
});

app.get('/api/calendar', async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!isValidMonth(month)) {
      return res.status(400).json({ message: 'month는 YYYY-MM 형식이어야 합니다.' });
    }

    const sql = `
      WITH month_range AS (
        SELECT to_date($1 || '-01', 'YYYY-MM-DD') AS month_start
      ),
      day_series AS (
        SELECT generate_series(
          month_start,
          (month_start + INTERVAL '1 month - 1 day')::date,
          INTERVAL '1 day'
        )::date AS stay_date
        FROM month_range
      ),
      active_rooms AS (
        SELECT room_id
        FROM rooms
        WHERE is_active = TRUE
      ),
      active_reservations AS (
        SELECT room_id, stay_date
        FROM reservations
        WHERE status IN ('pending', 'confirmed')
          AND stay_date >= (SELECT month_start FROM month_range)
          AND stay_date < ((SELECT month_start FROM month_range) + INTERVAL '1 month')
      )
      SELECT
        TO_CHAR(ds.stay_date, 'YYYY-MM-DD') AS stay_date,
        COUNT(*) FILTER (WHERE ar.room_id IS NULL) AS available_count,
        COUNT(*) FILTER (WHERE ar.room_id IS NOT NULL) AS reserved_count,
        COUNT(*) AS total_count
      FROM day_series ds
      CROSS JOIN active_rooms r
      LEFT JOIN active_reservations ar
        ON ar.room_id = r.room_id
      AND ar.stay_date = ds.stay_date
      GROUP BY ds.stay_date
      ORDER BY ds.stay_date;
    `;

    const result = await pool.query(sql, [month]);
    const days = result.rows.map((row) => ({
      date: String(row.stay_date).slice(0, 10),
      availableCount: Number(row.available_count),
      reservedCount: Number(row.reserved_count),
      totalCount: Number(row.total_count),
      hasAvailability: Number(row.available_count) > 0,
      calendarStatus: Number(row.available_count) > 0 ? 'available' : 'reserved',
    }));

    res.json({ month, days });
  } catch (error) {
    next(error);
  }
});

app.get('/api/availability', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'date는 YYYY-MM-DD 형식이어야 합니다.' });
    }

    const sql = `
      WITH target_date AS (
        SELECT $1::date AS stay_date,
               CASE WHEN EXTRACT(MONTH FROM $1::date) IN (7, 8) THEN 'peak'::season_type ELSE 'off_peak'::season_type END AS season,
               CASE WHEN EXTRACT(DOW FROM $1::date) IN (5, 6) THEN 'weekend'::day_type ELSE 'weekday'::day_type END AS day_kind
      )
      SELECT
        r.room_id,
        r.room_code,
        r.room_name,
        r.base_guests,
        r.max_guests,
        r.extra_guest_fee,
        r.is_whole_rental,
        rp.base_price,
        td.season,
        td.day_kind,
        CASE
          WHEN rv.reservation_id IS NULL THEN 'available'
          ELSE 'reserved'
        END AS status,
        rv.reservation_id,
        rv.status AS reservation_status
      FROM rooms r
      CROSS JOIN target_date td
      JOIN room_prices rp
        ON rp.room_id = r.room_id
       AND rp.season = td.season
       AND rp.day_kind = td.day_kind
      LEFT JOIN reservations rv
        ON rv.room_id = r.room_id
       AND rv.stay_date = td.stay_date
       AND rv.status IN ('pending', 'confirmed')
      WHERE r.is_active = TRUE
      ORDER BY r.sort_order, r.room_id;
    `;

    const result = await pool.query(sql, [date]);
    res.json({
      date,
      rooms: result.rows.map((row) => ({
        roomId: Number(row.room_id),
        roomCode: row.room_code,
        roomName: row.room_name,
        baseGuests: Number(row.base_guests),
        maxGuests: Number(row.max_guests),
        extraGuestFee: Number(row.extra_guest_fee),
        isWholeRental: row.is_whole_rental,
        basePrice: Number(row.base_price),
        season: row.season,
        dayKind: row.day_kind,
        status: row.status,
        reservationId: row.reservation_id ? Number(row.reservation_id) : null,
        reservationStatus: row.reservation_status || null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/reservations', async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { roomId, stayDate, guestName, phoneNumber, depositorName, guestCount } = req.body || {};

    if (!roomId || !isValidDate(stayDate) || !guestName || !phoneNumber || !depositorName || !guestCount) {
      return res.status(400).json({ message: '필수 입력값이 누락되었습니다.' });
    }

    await client.query('BEGIN');

    const insertSql = `SELECT create_pending_reservation($1, $2, $3, $4, $5, $6) AS reservation_id`;
    const insertResult = await client.query(insertSql, [
      Number(roomId),
      stayDate,
      String(guestName).trim(),
      String(phoneNumber).trim(),
      String(depositorName).trim(),
      Number(guestCount),
    ]);

    const reservationId = Number(insertResult.rows[0].reservation_id);

    const detailSql = `
      SELECT
        rv.reservation_id,
        rv.stay_date,
        rv.guest_name,
        rv.phone_number,
        rv.depositor_name,
        rv.guest_count,
        rv.base_price_snapshot,
        rv.final_price,
        rv.status,
        rv.hold_expires_at,
        rm.room_name
      FROM reservations rv
      JOIN rooms rm ON rm.room_id = rv.room_id
      WHERE rv.reservation_id = $1
    `;
    const detailResult = await client.query(detailSql, [reservationId]);

    await client.query('COMMIT');

    return res.status(201).json({
      message: '예약중 상태로 저장되었습니다.',
      reservation: detailResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      return res.status(409).json({ message: '이미 해당 날짜의 객실이 예약중입니다.' });
    }

    return next(error);
  } finally {
    client.release();
  }
});



const crypto = require('crypto');
const ADMIN_ID = process.env.ADMIN_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_ID || !ADMIN_PASSWORD) {
  throw new Error('ADMIN_ID 또는 ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.');
}
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.createHash('sha256').update(`${ADMIN_ID}:${ADMIN_PASSWORD}:admin`).digest('hex');

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ message: '관리자 인증이 필요합니다.' });
  }
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { adminId, password } = req.body || {};
  if (String(adminId || '') === ADMIN_ID && String(password || '') === ADMIN_PASSWORD) {
    return res.json({ message: '로그인 성공', token: ADMIN_TOKEN });
  }
  return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
});

app.get('/api/admin/reservations', requireAdmin, async (req, res, next) => {
  try {
    const { date, status } = req.query;
    const conditions = [];
    const values = [];

    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({ message: 'date는 YYYY-MM-DD 형식이어야 합니다.' });
      }
      values.push(date);
      conditions.push(`rv.stay_date = $${values.length}`);
    }

    if (status) {
      values.push(status);
      conditions.push(`rv.status = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT
        rv.reservation_id,
        TO_CHAR(rv.stay_date, 'YYYY-MM-DD') AS stay_date,
        rm.room_name,
        rv.guest_name,
        rv.phone_number,
        rv.depositor_name,
        rv.guest_count,
        rv.final_price,
        rv.status,
        rv.created_at
      FROM reservations rv
      JOIN rooms rm ON rm.room_id = rv.room_id
      ${whereClause}
      ORDER BY rv.stay_date DESC, rv.created_at DESC;
    `;

    const result = await pool.query(sql, values);
    res.json({
      reservations: result.rows.map((row) => ({
        reservationId: Number(row.reservation_id),
        stayDate: row.stay_date,
        roomName: row.room_name,
        guestName: row.guest_name,
        phoneNumber: row.phone_number,
        depositorName: row.depositor_name,
        guestCount: Number(row.guest_count),
        finalPrice: Number(row.final_price),
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/reservations/:reservationId/status', requireAdmin, async (req, res, next) => {
  try {
    const reservationId = Number(req.params.reservationId);
    const { status } = req.body || {};
    if (!reservationId || !['confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: '변경할 예약 상태가 올바르지 않습니다.' });
    }

    const sql = `
      UPDATE reservations
      SET status = $2,
          updated_at = NOW()
      WHERE reservation_id = $1
      RETURNING reservation_id, status
    `;
    const result = await pool.query(sql, [reservationId, status]);
    if (!result.rowCount) {
      return res.status(404).json({ message: '해당 예약을 찾을 수 없습니다.' });
    }
    res.json({ message: '예약 상태가 변경되었습니다.', reservation: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: '서버 오류가 발생했습니다.',
    detail: error.message,
  });
});

app.listen(PORT, () => {
  console.log(`Reservation API server running on http://localhost:${PORT}`);
});
