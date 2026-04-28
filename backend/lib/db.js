// Singleton DB connection used by all routes
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { waitForSqliteInitLock, withSqliteBusyRetry } = require('./sqliteRetry');

const DB_PATH = process.env.DB_PATH || './data/nexus.db';
const SQLITE_BUSY_TIMEOUT_MS = Number.parseInt(process.env.SQLITE_BUSY_TIMEOUT_MS || '60000', 10);

// Auto-create data dir
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const withBusyRetry = (label, fn, options) => withSqliteBusyRetry(`db ${label}`, fn, { attempts: 8, maxDelayMs: 10000, ...options });
waitForSqliteInitLock(DB_PATH);
const db = withBusyRetry('open database', () => new Database(DB_PATH, { timeout: SQLITE_BUSY_TIMEOUT_MS }));
withBusyRetry('configure pragmas', () => {
  db.pragma(`busy_timeout = ${SQLITE_BUSY_TIMEOUT_MS}`);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  // Aggressive WAL checkpoint so the -wal file doesn't bloat under heavy
  // worker write load — keeps reads fast and shrinks lock contention.
  db.pragma('wal_autocheckpoint = 1000');
  // Memory-mapped IO speeds up large scans (status counts, CDR pages).
  try { db.pragma('mmap_size = 268435456'); } catch (_) {}
  db.pragma('temp_store = MEMORY');
  db.pragma('cache_size = -64000'); // ~64 MB page cache
});

function _tableExists(table) {
  return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
}

// --- Self-healing migrations (run by EVERY process that opens the DB,
//     so the tgbot worker doesn't crash if it starts before init.js) ---
function _ensureCol(table, col, ddl) {
  try {
    if (!_tableExists(table)) return;
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some((c) => c.name === col)) {
      withBusyRetry(`auto-migrate ${table}.${col}`, () => db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`));
      console.log(`[db] auto-migrated ${table}.${col}`);
    }
  } catch (e) {
    console.error(`[db] auto-migrate ${table}.${col} failed:`, e.message);
  }
}

function _ensureIndex(table, name, sql) {
  try {
    if (!_tableExists(table)) return;
    withBusyRetry(`ensure index ${name}`, () => db.exec(sql));
  } catch (e) {
    console.error(`[db] ensure index ${name} failed:`, e.message);
  }
}
_ensureCol('tg_assignments', 'batch_id', 'TEXT');
_ensureCol('tg_assignments', 'tg_message_id', 'INTEGER');
_ensureCol('tg_assignments', 'tg_chat_id', 'INTEGER');
_ensureCol('cdr', 'note', 'TEXT');
_ensureCol('cdr', 'cli', 'TEXT');
_ensureCol('allocations', 'cli', 'TEXT');
_ensureIndex('allocations', 'idx_allocations_provider_phone_status_allocated', 'CREATE INDEX IF NOT EXISTS idx_allocations_provider_phone_status_allocated ON allocations(provider, phone_number, status, allocated_at DESC)');
_ensureIndex('allocations', 'idx_allocations_status_provider_ref_allocated', 'CREATE INDEX IF NOT EXISTS idx_allocations_status_provider_ref_allocated ON allocations(status, provider_ref, allocated_at DESC)');
_ensureIndex('allocations', 'idx_allocations_user_allocated', 'CREATE INDEX IF NOT EXISTS idx_allocations_user_allocated ON allocations(user_id, allocated_at DESC)');
_ensureIndex('notifications', 'idx_notifications_user_read_created', 'CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC)');
_ensureIndex('otp_audit_log', 'idx_otp_audit_provider_phone_otp_event_ts', 'CREATE INDEX IF NOT EXISTS idx_otp_audit_provider_phone_otp_event_ts ON otp_audit_log(provider, phone_number, otp_code, event, ts DESC)');
_ensureIndex('sessions', 'idx_sessions_token_hash', 'CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)');
_ensureIndex('sessions', 'idx_sessions_user_expires', 'CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id, expires_at DESC)');

db.bestEffortWrite = function bestEffortWrite(label, fn, timeoutMs = Number.parseInt(process.env.SQLITE_BEST_EFFORT_WRITE_TIMEOUT_MS || '750', 10)) {
  const safeTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 750;
  let previousTimeout = SQLITE_BUSY_TIMEOUT_MS;
  try {
    previousTimeout = Number(db.pragma('busy_timeout', { simple: true })) || SQLITE_BUSY_TIMEOUT_MS;
    db.pragma(`busy_timeout = ${safeTimeoutMs}`);
    return fn();
  } catch (e) {
    console.warn(`[db] best-effort write skipped (${label}):`, e.message);
    return undefined;
  } finally {
    try { db.pragma(`busy_timeout = ${previousTimeout}`); } catch (_) {}
  }
};

db.bestEffortRead = function bestEffortRead(label, fn, fallback, timeoutMs = Number.parseInt(process.env.SQLITE_BEST_EFFORT_READ_TIMEOUT_MS || '150', 10)) {
  const safeTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs >= 0 ? timeoutMs : 150;
  let previousTimeout = SQLITE_BUSY_TIMEOUT_MS;
  try {
    previousTimeout = Number(db.pragma('busy_timeout', { simple: true })) || SQLITE_BUSY_TIMEOUT_MS;
    db.pragma(`busy_timeout = ${safeTimeoutMs}`);
    return fn();
  } catch (e) {
    if (!/database is (locked|busy)/i.test(e.message || '')) {
      console.warn(`[db] best-effort read failed (${label}):`, e.message);
    }
    return fallback;
  } finally {
    try { db.pragma(`busy_timeout = ${previousTimeout}`); } catch (_) {}
  }
};

/**
 * db.write(label, fn) — wrap a write in an IMMEDIATE transaction.
 * Acquires the writer lock UP FRONT (no upgrade-deadlocks) and retries on BUSY.
 * Use this for any single-statement INSERT/UPDATE/DELETE that matters.
 */
db.write = function write(label, fn) {
  const tx = db.transaction(fn);
  return withSqliteBusyRetry(`db.write ${label}`, () => tx.immediate(), { attempts: 6, maxDelayMs: 4000 });
};

/**
 * db.batch(label, items, perItem) — execute many writes in ONE transaction.
 * This is the critical fix for worker scrape cycles: instead of 200 individual
 * INSERTs each grabbing the writer lock (and starving login/health), we take
 * the lock ONCE, write everything, release. ~50–200x throughput, zero BUSY.
 */
db.batch = function batch(label, items, perItem) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const tx = db.transaction((rows) => {
    let n = 0;
    for (const row of rows) {
      try { perItem(row); n++; } catch (e) {
        // Don't abort the whole batch on a single bad row — log + continue.
        console.warn(`[db.batch ${label}] row failed:`, e.message);
      }
    }
    return n;
  });
  return withSqliteBusyRetry(`db.batch ${label}`, () => tx.immediate(items), { attempts: 6, maxDelayMs: 4000 });
};

// Periodic WAL checkpoint — keeps the -wal file from growing unbounded under
// continuous worker writes, which is a frequent cause of "database is locked"
// once the WAL exceeds the autocheckpoint threshold.
const CHECKPOINT_INTERVAL_MS = Number.parseInt(process.env.SQLITE_CHECKPOINT_INTERVAL_MS || '60000', 10);
if (CHECKPOINT_INTERVAL_MS > 0) {
  setInterval(() => {
    try { db.pragma('wal_checkpoint(PASSIVE)'); }
    catch (e) { /* contention is fine — next tick */ }
  }, CHECKPOINT_INTERVAL_MS).unref();
}

module.exports = db;
