// Shared settings helpers — reads from `settings` table with safe fallbacks.
const db = require('./db');

const OTP_EXPIRY_KEY = 'otp_expiry_sec';
const OTP_EXPIRY_DEFAULT = 480;   // 8 minutes (legacy default)
const OTP_EXPIRY_MIN = 300;       // 5 minutes
const OTP_EXPIRY_MAX = 1800;      // 30 minutes

// Returns the configured OTP expiry in seconds. Always within [MIN, MAX].
// Admin UI writes this via PUT /api/admin/otp-expiry.
function getOtpExpirySec() {
  try {
    const v = +(db.prepare('SELECT value FROM settings WHERE key = ?').get(OTP_EXPIRY_KEY)?.value || 0);
    if (!Number.isFinite(v) || v <= 0) return OTP_EXPIRY_DEFAULT;
    return Math.max(OTP_EXPIRY_MIN, Math.min(OTP_EXPIRY_MAX, Math.floor(v)));
  } catch (_) {
    return OTP_EXPIRY_DEFAULT;
  }
}

module.exports = {
  getOtpExpirySec,
  OTP_EXPIRY_KEY,
  OTP_EXPIRY_DEFAULT,
  OTP_EXPIRY_MIN,
  OTP_EXPIRY_MAX,
};
