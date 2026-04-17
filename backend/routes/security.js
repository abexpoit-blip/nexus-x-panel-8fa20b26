const express = require('express');
const db = require('../lib/db');
const { authRequired, adminOnly } = require('../middleware/auth');
const { logFromReq } = require('../lib/audit');

const router = express.Router();
router.use(authRequired, adminOnly);

// GET /api/audit?limit=200
router.get('/audit', (req, res) => {
  const limit = Math.min(+req.query.limit || 200, 1000);
  const logs = db.prepare(`
    SELECT a.*, u.username FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at DESC LIMIT ?
  `).all(limit);
  res.json({ logs });
});

// GET /api/sessions — all active
router.get('/sessions', (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const sessions = db.prepare(`
    SELECT s.*, u.username FROM sessions s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.expires_at > ?
    ORDER BY s.last_seen_at DESC LIMIT 200
  `).all(now);
  res.json({ sessions });
});

// DELETE /api/sessions/:id — revoke
router.delete('/sessions/:id', (req, res) => {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(+req.params.id);
  logFromReq(req, 'session_revoked', { targetType: 'session', targetId: +req.params.id });
  res.json({ ok: true });
});

// GET /api/settings
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json({ settings });
});

// PUT /api/settings/:key
router.put('/settings/:key', (req, res) => {
  const { value } = req.body || {};
  if (value === undefined) return res.status(400).json({ error: 'value required' });
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, strftime('%s','now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%s','now')
  `).run(req.params.key, String(value));
  logFromReq(req, 'setting_updated', { meta: { key: req.params.key, value } });
  res.json({ ok: true });
});

module.exports = router;
