// Centralized audit logging
const db = require('./db');

const stmt = db.prepare(`
  INSERT INTO audit_logs (user_id, action, target_type, target_id, ip, user_agent, meta)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

function log({ userId = null, action, targetType = null, targetId = null, ip = null, userAgent = null, meta = null }) {
  db.bestEffortWrite(`audit:${action}`, () => {
    stmt.run(
      userId,
      action,
      targetType,
      targetId,
      ip,
      userAgent,
      meta ? (typeof meta === 'string' ? meta : JSON.stringify(meta)) : null
    );
  }, 250);
}

function logFromReq(req, action, extra = {}) {
  log({
    userId: req.user?.id || null,
    action,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    ...extra,
  });
}

module.exports = { log, logFromReq };
