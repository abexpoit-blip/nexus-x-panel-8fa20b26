const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../lib/db');
const { signToken, recordSession, authRequired, hashToken } = require('../middleware/auth');
const { log, logFromReq } = require('../lib/audit');

const router = express.Router();

// Username: 3-32 chars, alphanumeric + underscore
const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (username.length > 64 || password.length > 200) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    log({ action: 'login_failed', ip: req.ip, meta: { username: username.slice(0, 32) } });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    log({ userId: user.id, action: 'login_failed', ip: req.ip });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (user.status !== 'active') return res.status(403).json({ error: 'Account suspended' });

  const token = signToken(user);
  recordSession(user.id, token, req);
  log({ userId: user.id, action: 'login', ip: req.ip, userAgent: req.headers['user-agent'] });

  const { password_hash, ...safe } = user;
  res.json({ token, user: safe });
});

// POST /api/auth/register (agents only — admin enables/disables via settings)
router.post('/register', (req, res) => {
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'signup_enabled'").get();
  if (setting?.value !== 'true') return res.status(403).json({ error: 'Registration disabled' });

  const { username, password, full_name, phone, telegram } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username: 3-32 chars, alphanumeric + underscore only' });
  }
  if (password.length < 8 || password.length > 200) {
    return res.status(400).json({ error: 'Password must be 8-200 characters' });
  }
  if (full_name && (typeof full_name !== 'string' || full_name.length > 120)) {
    return res.status(400).json({ error: 'Invalid full_name' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'Username already taken' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, role, full_name, phone, telegram)
    VALUES (?, ?, 'agent', ?, ?, ?)
  `).run(username, hash, full_name || null, phone || null, telegram || null);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = signToken(user);
  recordSession(user.id, token, req);
  log({ userId: user.id, action: 'register', ip: req.ip });

  const { password_hash, ...safe } = user;
  res.status(201).json({ token, user: safe });
});

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  const { password_hash, ...safe } = req.user;
  res.json({ user: safe });
});

// POST /api/auth/logout
router.post('/logout', authRequired, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(req.token));
  logFromReq(req, 'logout');
  res.json({ ok: true });
});

module.exports = router;
