const fs = require('fs');
const path = require('path');

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isSqliteBusy(error) {
  return !!error && (
    error.code === 'SQLITE_BUSY' ||
    /database is (locked|busy)/i.test(error.message || '')
  );
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function withSqliteBusyRetry(label, fn, options = {}) {
  const attempts = toInt(options.attempts ?? process.env.SQLITE_BUSY_RETRY_ATTEMPTS, 6);
  const maxDelayMs = toInt(options.maxDelayMs ?? process.env.SQLITE_BUSY_RETRY_MAX_DELAY_MS, 5000);
  let delayMs = toInt(options.initialDelayMs ?? process.env.SQLITE_BUSY_RETRY_DELAY_MS, 500);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return fn();
    } catch (error) {
      if (!isSqliteBusy(error) || attempt === attempts) throw error;
      if (options.log !== false) {
        const logger = options.logger || console.warn;
        logger(`[sqlite] ${label} hit SQLITE_BUSY; retrying in ${delayMs}ms (${attempt}/${attempts})`);
      }
      sleepSync(delayMs);
      delayMs = Math.min(maxDelayMs, delayMs * 2);
    }
  }
}

function sqliteInitLockPath(dbPath) {
  return `${path.resolve(dbPath)}.init.lock`;
}

function removeLockDir(lockPath) {
  fs.rmSync(lockPath, { recursive: true, force: true });
}

function waitForSqliteInitLock(dbPath, options = {}) {
  const lockPath = sqliteInitLockPath(dbPath);
  const timeoutMs = toInt(options.timeoutMs ?? process.env.SQLITE_INIT_LOCK_TIMEOUT_MS, 120000);
  const staleMs = toInt(options.staleMs ?? process.env.SQLITE_INIT_LOCK_STALE_MS, 300000);
  const startedAt = Date.now();
  let warned = false;

  while (fs.existsSync(lockPath)) {
    try {
      const ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
      if (ageMs > staleMs) {
        console.warn(`[sqlite] removing stale init lock: ${lockPath}`);
        removeLockDir(lockPath);
        return;
      }
    } catch (_) { /* retry below */ }

    if (!warned && options.log !== false) {
      console.warn(`[sqlite] waiting for database init lock: ${lockPath}`);
      warned = true;
    }
    if (Date.now() - startedAt > timeoutMs) throw new Error(`Timed out waiting for SQLite init lock: ${lockPath}`);
    sleepSync(500);
  }
}

function acquireSqliteInitLock(dbPath, options = {}) {
  const lockPath = sqliteInitLockPath(dbPath);
  const timeoutMs = toInt(options.timeoutMs ?? process.env.SQLITE_INIT_LOCK_TIMEOUT_MS, 120000);
  const staleMs = toInt(options.staleMs ?? process.env.SQLITE_INIT_LOCK_STALE_MS, 300000);
  const startedAt = Date.now();
  let released = false;
  let warned = false;

  while (true) {
    try {
      fs.mkdirSync(lockPath);
      fs.writeFileSync(path.join(lockPath, 'owner'), `${process.pid}\n${new Date().toISOString()}\n`);
      return () => {
        if (released) return;
        released = true;
        removeLockDir(lockPath);
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        const ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
        if (ageMs > staleMs) {
          console.warn(`[sqlite] removing stale init lock: ${lockPath}`);
          removeLockDir(lockPath);
          continue;
        }
      } catch (_) { /* retry below */ }
      if (!warned && options.log !== false) {
        console.warn(`[sqlite] waiting to acquire database init lock: ${lockPath}`);
        warned = true;
      }
      if (Date.now() - startedAt > timeoutMs) throw new Error(`Timed out acquiring SQLite init lock: ${lockPath}`);
      sleepSync(500);
    }
  }
}

module.exports = { isSqliteBusy, withSqliteBusyRetry, waitForSqliteInitLock, acquireSqliteInitLock };