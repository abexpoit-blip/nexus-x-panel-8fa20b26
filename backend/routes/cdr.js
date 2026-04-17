const express = require('express');
const db = require('../lib/db');
const { authRequired, adminOnly } = require('../middleware/auth');
const { logFromReq } = require('../lib/audit');

const router = express.Router();

// GET /api/cdr — admin sees all
router.get('/', authRequired, adminOnly, (req, res) => {
  const cdr = db.prepare(`
    SELECT c.*, u.username FROM cdr c
    LEFT JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC LIMIT 1000
  `).all();
  res.json({ cdr });
});

// GET /api/cdr/mine — agent sees own
router.get('/mine', authRequired, (req, res) => {
  const cdr = db.prepare(`
    SELECT * FROM cdr WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 500
  `).all(req.user.id);
  res.json({ cdr });
});

// POST /api/cdr/refund/:id — admin reverses a billed CDR
router.post('/refund/:id', authRequired, adminOnly, (req, res) => {
  const id = +req.params.id;
  const { note } = req.body || {};
  const c = db.prepare("SELECT * FROM cdr WHERE id = ? AND status = 'billed'").get(id);
  if (!c) return res.status(404).json({ error: 'CDR not found or already processed' });

  const tx = db.transaction(() => {
    db.prepare("UPDATE cdr SET status = 'refunded', note = ? WHERE id = ?").run(note || null, id);
    db.prepare("UPDATE users SET balance = balance - ?, otp_count = MAX(0, otp_count - 1) WHERE id = ?")
      .run(c.price_bdt, c.user_id);
    db.prepare(`
      INSERT INTO payments (user_id, amount_bdt, type, method, reference, note)
      VALUES (?, ?, 'debit', 'admin', ?, ?)
    `).run(c.user_id, c.price_bdt, `refund:${id}`, note || 'OTP refund');
  });
  tx();

  logFromReq(req, 'cdr_refunded', { targetType: 'cdr', targetId: id });
  res.json({ ok: true });
});

module.exports = router;
