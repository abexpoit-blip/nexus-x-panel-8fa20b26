const express = require('express');
const db = require('../lib/db');
const { authRequired, adminOnly } = require('../middleware/auth');
const { logFromReq } = require('../lib/audit');

const router = express.Router();

// GET /api/notifications — current user's notifications (broadcasts + targeted)
router.get('/', authRequired, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id IS NULL OR user_id = ?
    ORDER BY created_at DESC LIMIT 100
  `).all(req.user.id);
  const unread = notifications.filter(n => !n.is_read).length;
  res.json({ notifications, unread });
});

// POST /api/notifications/:id/read
router.post('/:id/read', authRequired, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)')
    .run(+req.params.id, req.user.id);
  res.json({ ok: true });
});

// POST /api/notifications/read-all
router.post('/read-all', authRequired, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id IS NULL').run(req.user.id);
  res.json({ ok: true });
});

// POST /api/notifications/broadcast — admin
router.post('/broadcast', authRequired, adminOnly, (req, res) => {
  const { title, message, type = 'info', user_id = null } = req.body || {};
  if (!title || !message) return res.status(400).json({ error: 'title and message required' });
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, ?, ?, ?)
  `).run(user_id, title, message, type);
  logFromReq(req, 'notification_sent', { meta: { title, target: user_id || 'all' } });
  res.json({ ok: true });
});

module.exports = router;
