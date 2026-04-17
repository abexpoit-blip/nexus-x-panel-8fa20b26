// NexusX Backend — Express + SQLite
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Ensure DB exists & schema applied + admin seeded
require('./db/init');

const app = express();

// Trust proxy (nginx) so req.ip is the real client IP
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiter on all /api routes
app.use('/api', rateLimit({
  windowMs: +(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  max: +(process.env.RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/numbers', require('./routes/numbers'));
app.use('/api/rates', require('./routes/rates'));
app.use('/api/cdr', require('./routes/cdr'));
app.use('/api', require('./routes/payments'));            // /payments + /withdrawals
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api', require('./routes/security'));            // /audit + /sessions + /settings

// Health
app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// 404
app.use('/api', (_, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = +(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`\n🚀 NexusX backend listening on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   CORS origin: ${process.env.CORS_ORIGIN || '(allow all)'}\n`);

  // Start OTP poller (AccHub auto polling) after server is up
  require('./workers/otpPoller').start();

  // Start IMS browser bot (no-op if IMS_ENABLED=false)
  require('./workers/imsBot').start();
});
