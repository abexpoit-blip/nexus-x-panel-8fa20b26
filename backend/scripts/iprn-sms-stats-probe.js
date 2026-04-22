#!/usr/bin/env node
/**
 * Probe iprn-sms stats endpoint to find the OTP/Message feed.
 *
 * Run on VPS:
 *   cd /opt/nexus/nexus-x-panel/backend
 *   node scripts/iprn-sms-stats-probe.js
 *
 * What it does:
 *   1. Logs in via existing iprnSmsBot session (re-uses saved cookies if present)
 *   2. Probes a list of likely DataTables AJAX endpoints for the
 *      /premium_number/stats/sms page with currency=USD
 *   3. Prints which one returns valid JSON containing Message/OTP rows
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
const path = require('path');
process.chdir(path.join(__dirname, '..'));

(async () => {
  // Use the bot's internal http + login machinery by requiring it,
  // calling start(), and reading its private session via a thin wrapper.
  const axios = require('axios');
  const db = require('../lib/db');

  function readSetting(key) {
    try { return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || null; }
    catch (_) { return null; }
  }

  const BASE = (readSetting('iprn_sms_base_url') || process.env.IPRN_SMS_BASE_URL || 'https://panel.iprn-sms.com').replace(/\/+$/, '');
  const USER = readSetting('iprn_sms_username') || process.env.IPRN_SMS_USERNAME || '';
  const PASS = readSetting('iprn_sms_password') || process.env.IPRN_SMS_PASSWORD || '';

  const cookies = new Map();
  const cookieRaw = readSetting('iprn_sms_cookies');
  if (cookieRaw) {
    try {
      for (const [k, v] of JSON.parse(cookieRaw)) cookies.set(k, v);
      console.log(`Loaded ${cookies.size} saved cookies for ${USER}`);
    } catch (_) {}
  }

  const cookieHeader = () => [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  const absorb = (h) => {
    const sc = h && h['set-cookie'];
    if (!sc) return;
    for (const line of sc) {
      const [pair] = line.split(';');
      const eq = pair.indexOf('=');
      if (eq < 0) continue;
      cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  };

  const http = axios.create({
    baseURL: BASE,
    timeout: 20_000,
    maxRedirects: 0,
    validateStatus: (s) => s < 600,
    headers: {
      'User-Agent': 'Mozilla/5.0 probe',
      Accept: 'application/json,text/html,*/*',
    },
  });
  http.interceptors.request.use((cfg) => {
    const c = cookieHeader();
    if (c) cfg.headers.Cookie = c;
    return cfg;
  });
  http.interceptors.response.use(
    (res) => { absorb(res.headers); return res; },
    (err) => { if (err.response) absorb(err.response.headers); return Promise.reject(err); },
  );

  // Step 1: load the stats UI page and extract any AJAX URL it references
  console.log('\n▶ GET /premium_number/stats/sms (HTML)');
  let res = await http.get('/premium_number/stats/sms');
  console.log(`  status=${res.status} bytes=${(res.data || '').length}`);
  if (res.status === 302 || /<form[^>]+action="[^"]*login/i.test(String(res.data || ''))) {
    console.error('✗ Session expired — restart the bot first to refresh cookies');
    process.exit(1);
  }
  const html = String(res.data || '');
  // Look for any URL pattern referencing "stats" inside JS / data-url
  const urlMatches = [...new Set(
    [...html.matchAll(/["'`](\/[^"'`\s]*stats[^"'`\s]*)["'`]/g)].map((m) => m[1])
  )];
  console.log(`  candidate URLs from HTML: ${urlMatches.length}`);
  urlMatches.slice(0, 20).forEach((u) => console.log('   •', u));

  const today = new Date();
  const ddmm = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  const todayStr = ddmm(today);

  // Step 2: try a list of probable DataTables endpoints
  const candidates = [
    `/api/helper/premium-number/stats/sms?draw=1&start=0&length=10&currency=USD`,
    `/api/helper/premium-number/stats-data/sms?draw=1&start=0&length=10&currency=USD`,
    `/api/helper/premium-number/sms-stats/sms?draw=1&start=0&length=10&currency=USD`,
    `/api/helper/premium-number/stats/sms?draw=1&start=0&length=10&currency=USD&date_from=${todayStr}+00&date_to=${todayStr}+23`,
    `/premium_number/stats_data/sms?draw=1&start=0&length=10&currency=USD`,
    `/premium-number/stats/sms?draw=1&start=0&length=10&currency=USD`,
    ...urlMatches.filter((u) => /stats/i.test(u)).map((u) =>
      u + (u.includes('?') ? '&' : '?') + `draw=1&start=0&length=10&currency=USD`
    ),
  ];

  for (const url of candidates) {
    try {
      const r = await http.get(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
      });
      const ct = String(r.headers['content-type'] || '');
      const isJson = ct.includes('application/json');
      const body = isJson ? r.data : String(r.data || '').slice(0, 200);
      console.log(`\n→ ${url}`);
      console.log(`  status=${r.status} ct=${ct}`);
      if (isJson) {
        const sample = JSON.stringify(body).slice(0, 400);
        console.log(`  json sample: ${sample}…`);
        if (body && (Array.isArray(body.aaData) || Array.isArray(body.data))) {
          console.log(`  ✓ DATATABLE SHAPE — rows=${(body.aaData || body.data).length}`);
        }
      } else {
        console.log(`  body: ${body.slice(0, 160).replace(/\s+/g, ' ')}…`);
      }
    } catch (e) {
      console.log(`\n→ ${url}\n  ERROR ${e.message}`);
    }
  }

  console.log('\n━━━ done ━━━');
  process.exit(0);
})().catch((e) => {
  console.error('\n✗ probe failed:', e.message);
  process.exit(1);
});