require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ---------------------------------------------------------------------------
// MySQL connection pool (phpMyAdmin / MariaDB)
// ---------------------------------------------------------------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'flowmusic',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true,      // DATETIME приходит строкой 'YYYY-MM-DD HH:MM:SS'
  decimalNumbers: true,   // DECIMAL приходит числом
});

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'flowmusic',
};

async function initDatabase() {
  // 1. Ensure the database itself exists
  const adminConn = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
  });
  await adminConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await adminConn.end();

  // 2. Verify the pool connection
  await pool.query('SELECT 1');

  // 3. Create tables if they don't exist (idempotent)
  const queries = [
    `CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\`          VARCHAR(36)  NOT NULL,
      \`device_id\`   VARCHAR(128) NOT NULL,
      \`email\`       VARCHAR(255) DEFAULT NULL,
      \`username\`    VARCHAR(64)  DEFAULT NULL,
      \`created_at\`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`last_active\` DATETIME     DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_users_device_id\` (\`device_id\`),
      KEY \`idx_users_created_at\` (\`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`subscriptions\` (
      \`id\`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\`    VARCHAR(36)  NOT NULL,
      \`status\`     ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
      \`start_date\` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`end_date\`   DATETIME     NOT NULL,
      \`auto_renew\` TINYINT(1)   NOT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`),
      KEY \`idx_subscriptions_user\` (\`user_id\`),
      KEY \`idx_subscriptions_status_end\` (\`status\`, \`end_date\`),
      CONSTRAINT \`fk_subscriptions_user\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`transactions\` (
      \`id\`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
      \`user_id\`     VARCHAR(36)   NOT NULL,
      \`inv_id\`      VARCHAR(64)   DEFAULT NULL,
      \`amount\`      DECIMAL(10,2) NOT NULL,
      \`currency\`    VARCHAR(8)    NOT NULL DEFAULT 'RUB',
      \`description\` VARCHAR(255)  DEFAULT NULL,
      \`status\`      ENUM('pending','success','fail') NOT NULL DEFAULT 'pending',
      \`created_at\`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_transactions_inv_id\` (\`inv_id\`),
      KEY \`idx_transactions_user\` (\`user_id\`),
      CONSTRAINT \`fk_transactions_user\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`tracks\` (
      \`id\`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`yandex_id\`   BIGINT UNSIGNED NOT NULL,
      \`title\`       VARCHAR(255)    NOT NULL,
      \`artist\`      VARCHAR(255)    DEFAULT NULL,
      \`album\`       VARCHAR(255)    DEFAULT NULL,
      \`duration_ms\` INT UNSIGNED    DEFAULT NULL,
      \`cover_url\`   VARCHAR(512)    DEFAULT NULL,
      \`created_at\`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_tracks_yandex_id\` (\`yandex_id\`),
      KEY \`idx_tracks_title\` (\`title\`),
      KEY \`idx_tracks_artist\` (\`artist\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`playlists\` (
      \`id\`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\`     VARCHAR(36)  NOT NULL,
      \`name\`        VARCHAR(128) NOT NULL,
      \`description\` VARCHAR(255) DEFAULT NULL,
      \`cover_url\`   VARCHAR(512) DEFAULT NULL,
      \`created_at\`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_playlists_user\` (\`user_id\`),
      CONSTRAINT \`fk_playlists_user\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`playlist_tracks\` (
      \`playlist_id\` INT UNSIGNED    NOT NULL,
      \`track_id\`    BIGINT UNSIGNED NOT NULL,
      \`position\`    INT UNSIGNED    NOT NULL DEFAULT 0,
      \`added_at\`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`playlist_id\`, \`track_id\`),
      KEY \`idx_playlist_tracks_track\` (\`track_id\`),
      CONSTRAINT \`fk_playlist_tracks_playlist\`
        FOREIGN KEY (\`playlist_id\`) REFERENCES \`playlists\` (\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`fk_playlist_tracks_track\`
        FOREIGN KEY (\`track_id\`) REFERENCES \`tracks\` (\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`favorites\` (
      \`user_id\`    VARCHAR(36)     NOT NULL,
      \`track_id\`   BIGINT UNSIGNED NOT NULL,
      \`added_at\`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`user_id\`, \`track_id\`),
      KEY \`idx_favorites_track\` (\`track_id\`),
      CONSTRAINT \`fk_favorites_user\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`fk_favorites_track\`
        FOREIGN KEY (\`track_id\`) REFERENCES \`tracks\` (\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`codes\` (
      \`id\`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
      \`code\`        VARCHAR(32)   NOT NULL,
      \`days\`        INT UNSIGNED  NOT NULL DEFAULT 30,
      \`status\`      ENUM('active','used','disabled') NOT NULL DEFAULT 'active',
      \`user_id\`     VARCHAR(36)   DEFAULT NULL,
      \`created_at\`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`used_at\`     DATETIME      DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_codes_code\` (\`code\`),
      KEY \`idx_codes_status\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`play_history\` (
      \`id\`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\`   VARCHAR(36)     NOT NULL,
      \`track_id\`  BIGINT UNSIGNED NOT NULL,
      \`played_at\` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_history_user\` (\`user_id\`),
      KEY \`idx_history_track\` (\`track_id\`),
      KEY \`idx_history_played_at\` (\`played_at\`),
      CONSTRAINT \`fk_history_user\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`fk_history_track\`
        FOREIGN KEY (\`track_id\`) REFERENCES \`tracks\` (\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  for (const sql of queries) {
    await pool.query(sql);
  }

  console.log(`MySQL connected: ${DB_CONFIG.host}/${DB_CONFIG.database}`);
}

async function runSql(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

async function getFirst(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

async function getAll(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

function toMySQLDateTime(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateId() {
  return crypto.randomUUID();
}

const SUBSCRIPTION_PRICE = parseFloat(process.env.SUBSCRIPTION_PRICE || '99');
const SUBSCRIPTION_CURRENCY = process.env.SUBSCRIPTION_CURRENCY || 'RUB';
const SUBSCRIPTION_DAYS = parseInt(process.env.SUBSCRIPTION_DAYS || '30', 10);

// ---------------------------------------------------------------------------
// Robokassa helpers
// ---------------------------------------------------------------------------
const MERCHANT_LOGIN = process.env.ROBOKASSA_MERCHANT_LOGIN || '';
const PASSWORD_1 = process.env.ROBOKASSA_PASSWORD_1 || '';
const PASSWORD_2 = process.env.ROBOKASSA_PASSWORD_2 || '';

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
}

function getRobokassaPaymentUrl(invId, amount, description) {
  const outSum = amount.toFixed(2);
  const signature = md5(`${MERCHANT_LOGIN}:${outSum}:${invId}:${PASSWORD_1}`);

  const params = new URLSearchParams({
    MerchantLogin: MERCHANT_LOGIN,
    OutSum: outSum,
    InvId: String(invId),
    Description: description,
    SignatureValue: signature,
    IsTest: '0',
    Encoding: 'utf-8',
  });

  return {
    url: `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`,
    invId,
  };
}

function validateRobokassaResult(outSum, invId, signatureValue) {
  return md5(`${outSum}:${invId}:${PASSWORD_2}`) === signatureValue.toUpperCase();
}

function validateRobokassaSuccess(outSum, invId, signatureValue) {
  return md5(`${outSum}:${invId}:${PASSWORD_1}`) === signatureValue.toUpperCase();
}

// ---------------------------------------------------------------------------
// Admin auth
// ---------------------------------------------------------------------------
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const adminTokens = new Set(); // in-memory session tokens

function generateAdminToken() {
  const token = crypto.randomUUID();
  adminTokens.add(token);
  return token;
}

function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Admin panel not configured (ADMIN_PASSWORD not set)' });
  }
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!adminTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ---------------------------------------------------------------------------
// Express middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

app.get('/api/status', (req, res) => {
  res.json({ ok: true, version: '1.0.0' });
});

/**
 * GET /api/subscription/:deviceId
 */
app.get('/api/subscription/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const user = await getFirst('SELECT id FROM users WHERE device_id = ?', [deviceId]);

    if (!user) {
      return res.json({ active: false, subscription: null });
    }

    const active = await getFirst(
      `SELECT status, start_date, end_date, auto_renew
       FROM subscriptions
       WHERE user_id = ? AND status = 'active' AND end_date > NOW()
       ORDER BY end_date DESC LIMIT 1`,
      [user.id]
    );

    if (active) {
      return res.json({
        active: true,
        subscription: {
          status: active.status,
          startDate: active.start_date,
          endDate: active.end_date,
          autoRenew: !!active.auto_renew,
        },
      });
    }

    const last = await getFirst(
      `SELECT status, start_date, end_date
       FROM subscriptions WHERE user_id = ?
       ORDER BY end_date DESC LIMIT 1`,
      [user.id]
    );

    return res.json({
      active: false,
      subscription: last
        ? { status: last.status, startDate: last.start_date, endDate: last.end_date }
        : null,
    });
  } catch (err) {
    console.error('Subscription check error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * POST /api/payment/create
 */
app.post('/api/payment/create', async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    let user = await getFirst('SELECT id FROM users WHERE device_id = ?', [deviceId]);
    if (!user) {
      const uid = generateId();
      await runSql('INSERT INTO users (id, device_id) VALUES (?, ?)', [uid, deviceId]);
      user = { id: uid };
    }

    const invId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    await runSql(
      `INSERT INTO transactions (user_id, inv_id, amount, currency, description, status)
       VALUES (?, ?, ?, ?, 'FlowMusic Premium — 1 месяц', 'pending')`,
      [user.id, invId, SUBSCRIPTION_PRICE, SUBSCRIPTION_CURRENCY]
    );

    const description = `FlowMusic Premium — ${SUBSCRIPTION_DAYS} дней`;
    const payment = getRobokassaPaymentUrl(invId, SUBSCRIPTION_PRICE, description);

    res.json({ success: true, paymentUrl: payment.url, invId: payment.invId });
  } catch (err) {
    console.error('Payment create error:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

/**
 * POST /api/payment/result — Robokassa ResultURL callback
 */
app.post('/api/payment/result', async (req, res) => {
  const { OutSum, InvId, SignatureValue } = req.body;
  console.log('Robokassa result callback:', { OutSum, InvId, SignatureValue });

  if (!OutSum || !InvId || !SignatureValue) {
    return res.status(400).send('BAD PARAMS');
  }
  if (!validateRobokassaResult(OutSum, InvId, SignatureValue)) {
    console.error('Invalid Robokassa signature');
    return res.status(403).send('INVALID SIGNATURE');
  }

  try {
    const tx = await getFirst('SELECT * FROM transactions WHERE inv_id = ?', [InvId]);
    if (!tx) {
      console.error('Transaction not found:', InvId);
      return res.status(404).send('TRANSACTION NOT FOUND');
    }

    await runSql('UPDATE transactions SET status = ? WHERE inv_id = ?', ['success', InvId]);

    const startDate = toMySQLDateTime(new Date());
    const endObj = new Date();
    endObj.setDate(endObj.getDate() + SUBSCRIPTION_DAYS);
    const endDate = toMySQLDateTime(endObj);

    const existing = await getFirst(
      `SELECT id, end_date FROM subscriptions
       WHERE user_id = ? AND status = 'active' ORDER BY end_date DESC LIMIT 1`,
      [tx.user_id]
    );

    if (existing) {
      const extEnd = new Date(existing.end_date);
      extEnd.setDate(extEnd.getDate() + SUBSCRIPTION_DAYS);
      await runSql('UPDATE subscriptions SET end_date = ?, auto_renew = 0 WHERE id = ?', [toMySQLDateTime(extEnd), existing.id]);
    } else {
      await runSql(
        `INSERT INTO subscriptions (user_id, status, start_date, end_date, auto_renew)
         VALUES (?, 'active', ?, ?, 0)`,
        [tx.user_id, startDate, endDate]
      );
    }

    await runSql('UPDATE users SET last_active = NOW() WHERE id = ?', [tx.user_id]);
    console.log('Subscription activated for user:', tx.user_id);
    res.status(200).send(`OK${InvId}`);
  } catch (err) {
    console.error('Result callback error:', err);
    res.status(500).send('INTERNAL ERROR');
  }
});

/**
 * GET /api/payment/success — Robokassa SuccessURL redirect
 */
app.get('/api/payment/success', (req, res) => {
  const { OutSum, InvId, SignatureValue } = req.query;
  if (!validateRobokassaSuccess(OutSum, InvId, SignatureValue)) {
    return res.status(403).send('Подпись не прошла проверку. Обратитесь в поддержку.');
  }
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
  res.redirect(`${frontendUrl}?payment=success&invId=${InvId}`);
});

/**
 * GET /api/payment/fail — Robokassa FailURL redirect
 */
app.get('/api/payment/fail', (req, res) => {
  const { InvId } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
  res.redirect(`${frontendUrl}?payment=fail&invId=${InvId}`);
});

/**
 * POST /api/payment/check-status
 */
app.post('/api/payment/check-status', async (req, res) => {
  try {
    const { invId, deviceId } = req.body;
    if (!invId || !deviceId) return res.status(400).json({ error: 'invId and deviceId required' });

    const user = await getFirst('SELECT id FROM users WHERE device_id = ?', [deviceId]);
    if (!user) return res.json({ paid: false });

    const tx = await getFirst('SELECT status FROM transactions WHERE inv_id = ? AND user_id = ?', [invId, user.id]);
    res.json({ paid: tx ? tx.status === 'success' : false });
  } catch (err) {
    console.error('Check status error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * GET /api/price
 */
app.get('/api/price', (req, res) => {
  res.json({
    price: SUBSCRIPTION_PRICE,
    currency: SUBSCRIPTION_CURRENCY,
    days: SUBSCRIPTION_DAYS,
    label: `${SUBSCRIPTION_PRICE} ₽/мес`,
  });
});

/**
 * POST /api/payment/check-active
 */
app.post('/api/payment/check-active', async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    const user = await getFirst('SELECT id FROM users WHERE device_id = ?', [deviceId]);
    if (!user) return res.json({ active: false });

    const active = await getFirst(
      `SELECT status, start_date, end_date, auto_renew
       FROM subscriptions
       WHERE user_id = ? AND status = 'active' AND end_date > NOW()
       ORDER BY end_date DESC LIMIT 1`,
      [user.id]
    );

    res.json({ active: !!active, endDate: active ? active.end_date : null });
  } catch (err) {
    console.error('Check active error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---------------------------------------------------------------------------
// Activation codes (FunPay sale)
// ---------------------------------------------------------------------------

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без похожих: 0/O, 1/I
  let code = '';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) code += chars[Math.floor(Math.random() * chars.length)];
    if (i < 3) code += '-';
  }
  return code; // формат: XXXX-XXXX-XXXX-XXXX
}

/**
 * POST /api/code/activate — активация кода пользователем
 * Body: { code, deviceId }
 */
app.post('/api/code/activate', async (req, res) => {
  try {
    const { code, deviceId } = req.body;
    if (!code || !deviceId) return res.status(400).json({ error: 'code and deviceId required' });

    const normalized = String(code).trim().toUpperCase().replace(/\s+/g, '');
    const subDays = SUBSCRIPTION_DAYS;

    const codeRow = await getFirst('SELECT * FROM codes WHERE code = ?', [normalized]);
    if (!codeRow) return res.status(404).json({ error: 'Код не найден' });
    if (codeRow.status === 'used') return res.status(409).json({ error: 'Код уже использован' });
    if (codeRow.status === 'disabled') return res.status(403).json({ error: 'Код отключён' });

    let user = await getFirst('SELECT id FROM users WHERE device_id = ?', [deviceId]);
    if (!user) {
      const uid = generateId();
      await runSql('INSERT INTO users (id, device_id) VALUES (?, ?)', [uid, deviceId]);
      user = { id: uid };
    }

    const days = codeRow.days || subDays;
    const startDate = toMySQLDateTime(new Date());
    const endObj = new Date();
    endObj.setDate(endObj.getDate() + days);
    const endDate = toMySQLDateTime(endObj);

    // Продление существующей активной подписки
    const existing = await getFirst(
      `SELECT id, end_date FROM subscriptions
       WHERE user_id = ? AND status = 'active' ORDER BY end_date DESC LIMIT 1`,
      [user.id]
    );

    if (existing) {
      const extEnd = new Date(existing.end_date);
      extEnd.setDate(extEnd.getDate() + days);
      await runSql('UPDATE subscriptions SET end_date = ? WHERE id = ?', [toMySQLDateTime(extEnd), existing.id]);
    } else {
      await runSql(
        `INSERT INTO subscriptions (user_id, status, start_date, end_date, auto_renew)
         VALUES (?, 'active', ?, ?, 0)`,
        [user.id, startDate, endDate]
      );
    }

    // Помечаем код использованным
    await runSql(
      'UPDATE codes SET status = ?, user_id = ?, used_at = NOW() WHERE id = ?',
      ['used', user.id, codeRow.id]
    );

    await runSql('UPDATE users SET last_active = NOW() WHERE id = ?', [user.id]);

    const newEnd = getFirst(
      `SELECT end_date FROM subscriptions
       WHERE user_id = ? AND status = 'active' ORDER BY end_date DESC LIMIT 1`,
      [user.id]
    );

    console.log(`Code ${normalized} activated for device ${deviceId} (+${days} days)`);
    res.json({ success: true, days, endDate: newEnd ? newEnd.end_date : endDate });
  } catch (err) {
    console.error('Code activate error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * POST /api/admin/code/create — создать новый код (админ)
 * Body: { days (optional, default 30), count (optional, default 1) }
 */
app.post('/api/admin/code/create', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.body.days, 10) || SUBSCRIPTION_DAYS;
    const count = Math.min(parseInt(req.body.count, 10) || 1, 100);
    const created = [];

    for (let i = 0; i < count; i++) {
      let newCode = generateCode();
      // Защита от коллизий
      let exists = await getFirst('SELECT id FROM codes WHERE code = ?', [newCode]);
      while (exists) {
        newCode = generateCode();
        exists = await getFirst('SELECT id FROM codes WHERE code = ?', [newCode]);
      }
      await runSql('INSERT INTO codes (code, days) VALUES (?, ?)', [newCode, days]);
      created.push(newCode);
    }

    console.log(`Admin created ${count} code(s) for ${days} days`);
    res.json({ success: true, codes: created, days });
  } catch (err) {
    console.error('Admin code create error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * GET /api/admin/codes — список всех кодов (админ)
 */
app.get('/api/admin/codes', requireAdmin, async (req, res) => {
  try {
    const codes = await getAll(`
      SELECT c.id, c.code, c.days, c.status, c.created_at, c.used_at,
             u.device_id AS used_by_device
      FROM codes c
      LEFT JOIN users u ON u.id = c.user_id
      ORDER BY c.id DESC
    `);
    res.json({ codes });
  } catch (err) {
    console.error('Admin codes error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---------------------------------------------------------------------------
// Admin API
// ---------------------------------------------------------------------------

/**
 * POST /api/admin/login — authenticate as admin
 * Body: { password }
 */
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Admin panel not configured' });
  }
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Wrong password' });
  }
  const token = generateAdminToken();
  res.json({ success: true, token });
});

/**
 * GET /api/admin/users — list all users with their subscription status
 */
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await getAll(`
      SELECT
        u.id,
        u.device_id,
        u.created_at,
        u.last_active,
        s.status AS sub_status,
        s.start_date AS sub_start,
        s.end_date AS sub_end,
        s.auto_renew,
        (SELECT COUNT(*) FROM transactions t WHERE t.user_id = u.id) AS tx_count
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id AND s.id = (
        SELECT id FROM subscriptions WHERE user_id = u.id ORDER BY end_date DESC LIMIT 1
      )
      ORDER BY u.created_at DESC
    `);

    const result = users.map(u => ({
      id: u.id,
      deviceId: u.device_id,
      createdAt: u.created_at,
      lastActive: u.last_active,
      subscription: u.sub_status ? {
        status: u.sub_status,
        startDate: u.sub_start,
        endDate: u.sub_end,
        autoRenew: !!u.auto_renew,
        active: u.sub_status === 'active' && u.sub_end && new Date(u.sub_end) > new Date(),
      } : null,
      transactionsCount: u.tx_count || 0,
    }));

    res.json({ users: result, total: result.length });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * POST /api/admin/subscription/grant — grant subscription to a user
 * Body: { deviceId, days (optional, default 30) }
 */
app.post('/api/admin/subscription/grant', requireAdmin, async (req, res) => {
  try {
    const { deviceId, days } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    let user = await getFirst('SELECT id FROM users WHERE device_id = ?', [deviceId]);
    if (!user) {
      const uid = generateId();
      await runSql('INSERT INTO users (id, device_id) VALUES (?, ?)', [uid, deviceId]);
      user = { id: uid };
    }

    const subDays = parseInt(days, 10) || SUBSCRIPTION_DAYS;
    const startDate = toMySQLDateTime(new Date());
    const endObj = new Date();
    endObj.setDate(endObj.getDate() + subDays);
    const endDate = toMySQLDateTime(endObj);

    // Extend existing active subscription if any
    const existing = await getFirst(
      `SELECT id, end_date FROM subscriptions
       WHERE user_id = ? AND status = 'active' ORDER BY end_date DESC LIMIT 1`,
      [user.id]
    );

    if (existing) {
      const extEnd = new Date(existing.end_date);
      extEnd.setDate(extEnd.getDate() + subDays);
      await runSql('UPDATE subscriptions SET end_date = ? WHERE id = ?', [toMySQLDateTime(extEnd), existing.id]);
    } else {
      await runSql(
        `INSERT INTO subscriptions (user_id, status, start_date, end_date, auto_renew)
         VALUES (?, 'active', ?, ?, 0)`,
        [user.id, startDate, endDate]
      );
    }

    console.log(`Admin granted ${subDays} days subscription to device ${deviceId}`);
    res.json({ success: true, deviceId, days: subDays });
  } catch (err) {
    console.error('Admin grant error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * POST /api/admin/subscription/revoke — revoke active subscription
 * Body: { deviceId }
 */
app.post('/api/admin/subscription/revoke', requireAdmin, async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    const user = await getFirst('SELECT id FROM users WHERE device_id = ?', [deviceId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const active = await getFirst(
      `SELECT id FROM subscriptions
       WHERE user_id = ? AND status = 'active' AND end_date > NOW()
       ORDER BY end_date DESC LIMIT 1`,
      [user.id]
    );

    if (!active) return res.json({ success: true, message: 'No active subscription to revoke' });

    await runSql('UPDATE subscriptions SET status = ? WHERE id = ?', ['cancelled', active.id]);
    console.log(`Admin revoked subscription for device ${deviceId}`);
    res.json({ success: true, deviceId });
  } catch (err) {
    console.error('Admin revoke error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * POST /api/admin/subscription/extend — extend by N days
 * Body: { deviceId, days }
 */
app.post('/api/admin/subscription/extend', requireAdmin, async (req, res) => {
  try {
    const { deviceId, days } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    const extDays = parseInt(days, 10) || 30;

    const user = await getFirst('SELECT id FROM users WHERE device_id = ?', [deviceId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existing = await getFirst(
      `SELECT id, end_date FROM subscriptions
       WHERE user_id = ? AND status = 'active' ORDER BY end_date DESC LIMIT 1`,
      [user.id]
    );

    if (!existing) return res.status(400).json({ error: 'No active subscription to extend' });

    const extEnd = new Date(existing.end_date);
    extEnd.setDate(extEnd.getDate() + extDays);
    await runSql('UPDATE subscriptions SET end_date = ? WHERE id = ?', [toMySQLDateTime(extEnd), existing.id]);

    console.log(`Admin extended subscription for device ${deviceId} by ${extDays} days`);
    res.json({ success: true, deviceId, days: extDays, newEndDate: toMySQLDateTime(extEnd) });
  } catch (err) {
    console.error('Admin extend error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---------------------------------------------------------------------------
// Admin panel HTML
// ---------------------------------------------------------------------------
app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FlowMusic Admin</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0d0d0d; color: #e0e0e0; min-height: 100vh;
}
.container { max-width: 1200px; margin: 0 auto; padding: 24px; }
h1 { font-size: 28px; color: #ffd700; margin-bottom: 8px; }
.subtitle { color: #888; margin-bottom: 24px; }
.card {
  background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px;
  padding: 20px; margin-bottom: 20px;
}
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 10px 8px; color: #888; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #2a2a2a; }
td { padding: 10px 8px; border-bottom: 1px solid #222; font-size: 13px; vertical-align: middle; }
tr:hover td { background: rgba(255,255,255,0.03); }
.badge {
  display: inline-block; padding: 2px 8px; border-radius: 10px;
  font-size: 11px; font-weight: 600;
}
.badge-active { background: rgba(74,222,128,0.15); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
.badge-expired { background: rgba(255,71,87,0.15); color: #ff6b6b; border: 1px solid rgba(255,71,87,0.2); }
.badge-none { background: rgba(255,255,255,0.05); color: #666; }
.device-id { font-family: monospace; font-size: 11px; color: #999; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
.actions { display: flex; gap: 4px; flex-wrap: wrap; }
.actions button {
  padding: 4px 10px; border: 1px solid #444; border-radius: 6px;
  background: transparent; color: #ccc; font-size: 11px; cursor: pointer; transition: all 0.2s;
}
.actions button:hover { background: #333; border-color: #666; }
.actions .grant { border-color: #4ade80; color: #4ade80; }
.actions .grant:hover { background: rgba(74,222,128,0.1); }
.actions .revoke { border-color: #ff6b6b; color: #ff6b6b; }
.actions .revoke:hover { background: rgba(255,71,87,0.1); }
.actions .extend { border-color: #ffd700; color: #ffd700; }
.actions .extend:hover { background: rgba(255,215,0,0.1); }
.stats-row { display: flex; gap: 16px; margin-bottom: 20px; }
.stat-box { flex: 1; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 10px; padding: 16px; text-align: center; }
.stat-box .num { font-size: 28px; font-weight: 700; color: #ffd700; }
.stat-box .label { font-size: 12px; color: #888; margin-top: 4px; }
.login-box { max-width: 320px; margin: 100px auto; text-align: center; }
.login-box input {
  width: 100%; padding: 12px 16px; background: #1a1a1a; border: 1px solid #333;
  border-radius: 8px; color: #fff; font-size: 16px; margin: 16px 0; outline: none;
}
.login-box input:focus { border-color: #ffd700; }
.login-box button {
  width: 100%; padding: 12px; background: #ffd700; color: #000;
  border: none; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer;
}
.login-box button:hover { background: #ffed4a; }
#error { color: #ff6b6b; font-size: 14px; margin-top: 8px; }
.toast {
  position: fixed; bottom: 24px; right: 24px; padding: 12px 20px;
  border-radius: 10px; background: #2a2a2a; color: #fff; font-size: 13px;
  border: 1px solid #444; z-index: 9999; opacity: 0; transition: opacity 0.3s;
}
.toast.show { opacity: 1; }
.filter-input {
  width: 100%; padding: 10px 14px; background: #1a1a1a; border: 1px solid #333;
  border-radius: 8px; color: #fff; font-size: 14px; outline: none; margin-bottom: 16px;
}
.filter-input:focus { border-color: #555; }
.loading { text-align: center; padding: 40px; color: #666; }
</style>
</head>
<body>
<div id="app"></div>
<script>
const API = '';
let token = localStorage.getItem('adminToken');

function showToast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast show';
  t.textContent = msg;
  if (type === 'success') t.style.borderColor = '#4ade80';
  if (type === 'error') t.style.borderColor = '#ff6b6b';
  document.body.appendChild(t);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (res.status === 401) { token = null; localStorage.removeItem('adminToken'); render(); }
  return res.json();
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function daysLeft(endDate) {
  if (!endDate) return 0;
  return Math.max(0, Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24)));
}

async function grantSub(deviceId) {
  const days = prompt('На сколько дней выдать подписку?', '30');
  if (!days) return;
  const r = await api('POST', '/api/admin/subscription/grant', { deviceId, days: parseInt(days) });
  if (r.success) { showToast('Подписка выдана на ' + days + ' дней', 'success'); loadUsers(); }
  else showToast(r.error || 'Ошибка', 'error');
}

async function revokeSub(deviceId) {
  if (!confirm('Отозвать подписку у этого пользователя?')) return;
  const r = await api('POST', '/api/admin/subscription/revoke', { deviceId });
  if (r.success) { showToast('Подписка отозвана', 'success'); loadUsers(); }
  else showToast(r.error || 'Ошибка', 'error');
}

async function extendSub(deviceId) {
  const days = prompt('На сколько дней продлить?', '30');
  if (!days) return;
  const r = await api('POST', '/api/admin/subscription/extend', { deviceId, days: parseInt(days) });
  if (r.success) { showToast('Подписка продлена на ' + days + ' дней', 'success'); loadUsers(); }
  else showToast(r.error || 'Ошибка', 'error');
}

let usersData = [];
let codesData = [];
let view = 'users';

async function createCodes() {
  const days = prompt('Срок действия кода (дней):', '30');
  if (!days) return;
  const count = prompt('Сколько кодов создать?', '1');
  if (!count) return;
  const r = await api('POST', '/api/admin/code/create', { days: parseInt(days), count: parseInt(count) });
  if (r.success) {
    showToast('Создано кодов: ' + r.codes.length, 'success');
    loadCodes();
  } else showToast(r.error || 'Ошибка', 'error');
}

async function loadCodes() {
  document.getElementById('codesBody').innerHTML = '<tr><td colspan="5" class="loading">Загрузка...</td></tr>';
  const r = await api('GET', '/api/admin/codes');
  if (r.codes) {
    codesData = r.codes;
    renderCodes(r.codes);
    const active = r.codes.filter(c => c.status === 'active').length;
    document.getElementById('activeCodes').textContent = active;
    document.getElementById('totalCodes').textContent = r.codes.length;
  }
}

function renderCodes(codes) {
  const tbody = document.getElementById('codesBody');
  if (codes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:30px;">Кодов пока нет — создай первый</td></tr>';
    return;
  }
  tbody.innerHTML = codes.map(c => {
    let badge = '<span class="badge badge-active">Активен</span>';
    if (c.status === 'used') badge = '<span class="badge badge-expired">Использован</span>';
    else if (c.status === 'disabled') badge = '<span class="badge badge-none">Отключён</span>';
    return '<tr>' +
      '<td style="font-family:monospace;font-weight:600;color:#ffd700;">' + c.code + '</td>' +
      '<td>' + c.days + ' дн.</td>' +
      '<td>' + badge + '</td>' +
      '<td>' + (c.used_by_device ? '<div class="device-id" title="' + c.used_by_device + '">' + c.used_by_device.substring(0, 16) + '...</div>' : '—') + '</td>' +
      '<td>' + formatDate(c.used_at || c.created_at) + '</td>' +
    '</tr>';
  }).join('');
}

function codesSection() {
  return '<div class="card">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<h2 style="font-size:18px;color:#ffd700;">🎟 Коды активации</h2>' +
      '<button onclick="createCodes()" style="padding:8px 16px;background:#ffd700;border:none;border-radius:8px;color:#000;font-weight:700;cursor:pointer;">+ Создать код</button>' +
    '</div>' +
    '<table><thead><tr>' +
      '<th>Код</th><th>Срок</th><th>Статус</th><th>Активирован на</th><th>Дата</th>' +
    '</tr></thead><tbody id="codesBody"><tr><td colspan="5" class="loading">Загрузка...</td></tr></tbody></table>' +
  '</div>';
}

function showCodes() {
  view = 'codes';
  document.getElementById('app').innerHTML = '<div class="container">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<div><h1>👑 FlowMusic Admin</h1><p class="subtitle">Управление кодами активации</p></div>' +
      '<div style="display:flex;gap:8px;">' +
        '<button onclick="showUsers()" style="padding:8px 16px;background:transparent;border:1px solid #444;border-radius:8px;color:#ccc;cursor:pointer;">👥 Пользователи</button>' +
        '<button onclick="logout()" style="padding:8px 16px;background:transparent;border:1px solid #444;border-radius:8px;color:#ccc;cursor:pointer;">Выйти</button>' +
      '</div>' +
    '</div>' +
    '<div class="stats-row">' +
      '<div class="stat-box"><div class="num" id="activeCodes">0</div><div class="label">Активных кодов</div></div>' +
      '<div class="stat-box"><div class="num" id="totalCodes">0</div><div class="label">Всего кодов</div></div>' +
    '</div>' +
    codesSection() +
  '</div>';
  loadCodes();
}

function showUsers() {
  view = 'users';
  render();
}

async function loadUsers() {
  document.getElementById('usersBody').innerHTML = '<tr><td colspan="6" class="loading">Загрузка...</td></tr>';
  const r = await api('GET', '/api/admin/users');
  if (r.users) {
    usersData = r.users;
    renderTable(r.users);
    document.getElementById('totalUsers').textContent = r.total;
    document.getElementById('activeSubs').textContent = r.users.filter(u => u.subscription?.active).length;
    document.getElementById('totalRevenue').textContent = r.users.reduce((sum, u) => sum + u.transactionsCount, 0) + ' тx';
  }
}

function renderTable(users) {
  const tbody = document.getElementById('usersBody');
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#666;padding:30px;">Нет пользователей</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => {
    const sub = u.subscription;
    let badge = '<span class="badge badge-none">Нет</span>';
    if (sub && sub.active) badge = '<span class="badge badge-active">Активна до ' + formatDate(sub.endDate).split(' ')[0] + '</span>';
    else if (sub && sub.status === 'expired') badge = '<span class="badge badge-expired">Истекла</span>';
    else if (sub && sub.status === 'cancelled') badge = '<span class="badge badge-expired">Отозвана</span>';

    return '<tr>' +
      '<td><div class="device-id" title="' + u.deviceId + '">' + u.deviceId.substring(0, 16) + '...</div></td>' +
      '<td>' + formatDate(u.createdAt) + '</td>' +
      '<td>' + (u.lastActive ? formatDate(u.lastActive) : '—') + '</td>' +
      '<td>' + badge + '</td>' +
      '<td>' + (sub && sub.active ? daysLeft(sub.endDate) + ' дн.' : '—') + '</td>' +
      '<td><div class="actions">' +
        '<button class="grant" onclick="grantSub(\\'' + u.deviceId + '\\')">Выдать</button>' +
        '<button class="extend" onclick="extendSub(\\'' + u.deviceId + '\\')">Продлить</button>' +
        '<button class="revoke" onclick="revokeSub(\\'' + u.deviceId + '\\')">Отозвать</button>' +
      '</div></td>' +
    '</tr>';
  }).join('');
}

function filterUsers() {
  const q = document.getElementById('filterInput').value.toLowerCase();
  const filtered = usersData.filter(u => u.deviceId.toLowerCase().includes(q));
  renderTable(filtered);
}

async function login() {
  const password = document.getElementById('passwordInput').value;
  const r = await api('POST', '/api/admin/login', { password });
  if (r.success) {
    token = r.token;
    localStorage.setItem('adminToken', token);
    document.getElementById('error').textContent = '';
    render();
  } else {
    document.getElementById('error').textContent = r.error || 'Неверный пароль';
  }
}

function logout() {
  token = null;
  localStorage.removeItem('adminToken');
  render();
}

function render() {
  if (!token) {
    document.getElementById('app').innerHTML = '<div class="login-box">' +
      '<h1 style="font-size:32px;">👑</h1>' +
      '<h1>FlowMusic Admin</h1>' +
      '<p style="color:#888;margin-top:8px;">Введите пароль для входа</p>' +
      '<input type="password" id="passwordInput" placeholder="Пароль" onkeydown="if(event.key===\\'Enter\\')login()" />' +
      '<button onclick="login()">Войти</button>' +
      '<div id="error"></div>' +
    '</div>';
    return;
  }

  document.getElementById('app').innerHTML = '<div class="container">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<div><h1>👑 FlowMusic Admin</h1><p class="subtitle">Панель управления подписками</p></div>' +
      '<div style="display:flex;gap:8px;">' +
        '<button onclick="showCodes()" style="padding:8px 16px;background:transparent;border:1px solid #ffd700;border-radius:8px;color:#ffd700;cursor:pointer;">🎟 Коды</button>' +
        '<button onclick="logout()" style="padding:8px 16px;background:transparent;border:1px solid #444;border-radius:8px;color:#ccc;cursor:pointer;">Выйти</button>' +
      '</div>' +
    '</div>' +

    '<div class="stats-row">' +
      '<div class="stat-box"><div class="num" id="totalUsers">0</div><div class="label">Пользователей</div></div>' +
      '<div class="stat-box"><div class="num" id="activeSubs">0</div><div class="label">Активных подписок</div></div>' +
      '<div class="stat-box"><div class="num" id="totalRevenue">0</div><div class="label">Транзакций</div></div>' +
    '</div>' +

    '<div class="card">' +
      '<input type="text" id="filterInput" class="filter-input" placeholder="🔍 Поиск по device ID..." oninput="filterUsers()" />' +
      '<table><thead><tr>' +
        '<th>Device ID</th><th>Зарегистрирован</th><th>Активность</th><th>Подписка</th><th>Осталось</th><th>Действия</th>' +
      '</tr></thead><tbody id="usersBody"><tr><td colspan="6" class="loading">Загрузка...</td></tr></tbody></table>' +
    '</div>' +
  '</div>';

  loadUsers();
}

render();
</script>
</body>
</html>`);
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`FlowMusic Server running on ${BASE_URL}`);
    console.log(`Price: ${SUBSCRIPTION_PRICE} ${SUBSCRIPTION_CURRENCY} / ${SUBSCRIPTION_DAYS} days`);

    if (!MERCHANT_LOGIN || !PASSWORD_1 || !PASSWORD_2) {
      console.warn('⚠ Robokassa not configured. Set ROBOKASSA_* env vars.');
    } else {
      console.log('✅ Robokassa configured');
    }
  });
}).catch(err => {
  console.error('Failed to connect to MySQL:', err);
  process.exit(1);
});