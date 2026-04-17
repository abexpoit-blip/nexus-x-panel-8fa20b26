// IMS provider — MANUAL MODE (admin pastes numbers from manager)
// Numbers added via admin UI go into a "pool" that agents can claim.
const db = require('../lib/db');

module.exports = {
  id: 'ims',
  name: 'IMS SMS',
  mode: 'manual',

  async listCountries() {
    // Distinct countries from existing rates for IMS
    return db.prepare(`
      SELECT DISTINCT country_code as code, COALESCE(country_name, country_code) as name
      FROM rates WHERE provider = 'ims' AND country_code IS NOT NULL
    `).all();
  },

  async listOperators() {
    return db.prepare(`
      SELECT DISTINCT operator as name FROM rates
      WHERE provider = 'ims' AND operator IS NOT NULL
    `).all();
  },

  // Pull next available number from manual IMS pool (FIFO)
  async getNumber({ countryCode, operator } = {}) {
    let q = "SELECT * FROM allocations WHERE provider = 'ims' AND status = 'pool'";
    const params = [];
    if (countryCode) { q += ' AND country_code = ?'; params.push(countryCode); }
    if (operator) { q += ' AND operator = ?'; params.push(operator); }
    q += ' ORDER BY allocated_at ASC LIMIT 1';
    const row = db.prepare(q).get(...params);
    if (!row) throw new Error('No IMS numbers available — ask admin to add more');
    return {
      provider_ref: String(row.id),
      phone_number: row.phone_number,
      operator: row.operator,
      country_code: row.country_code,
      __pool_id: row.id,  // used by routes/numbers.js to mark assigned
    };
  },

  async checkOtp() {
    // OTP for manual mode is updated by admin via /numbers/sync endpoint
    return { otp: null, status: 'waiting' };
  },

  async releaseNumber(providerRef) {
    db.prepare("UPDATE allocations SET status = 'released' WHERE id = ?").run(+providerRef);
  },
};
