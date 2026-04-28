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

module.exports = { isSqliteBusy, withSqliteBusyRetry };