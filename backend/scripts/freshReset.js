#!/usr/bin/env node
/**
 * NexusX Fresh Reset
 * ==================
 * Wipes all OPERATIONAL data so the platform starts clean — but keeps:
 *   - users (so admin & agents can still log in)
 *   - user TG bot config (tg_users, range_tg_settings)
 *   - rates / range_meta (your pricing & range customizations)
 *   - settings (signup_enabled, maintenance_mode, maintenance_message)
 *
 * Wipes:
 *   - allocations, cdr, payments, withdrawals, notifications
 *   - audit_logs, sessions, otp_audit_log
 *   - tg_wallet_tx, tg_assignments, tg_broadcasts
 *   - all bot-state rows in `settings` (cookies, cursors, pool flags)
 *   - synthetic pool users (__ims_pool__, __msi_pool__, etc.)
 *
 * Run on the VPS:   node backend/scripts/freshReset.js --yes
 */
'use strict';
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, '..', 'data', 'nexus.db');

const CONFIRM = process.argv.includes('--yes') || process.argv.includes('-y');

if (!fs.existsSync(DB_PATH)) {
  console.error(`✗ Database not found at ${DB_PATH}`);
  process.exit(1);
}

if (!CONFIRM) {
  console.log(`This will WIPE operational data from: ${DB_PATH}`);
  console.log(`Users, TG config, rates, range meta and settings flags are kept.`);
  console.log(`Re-run with --yes to actually perform the reset.`);
  process.exit(0);
}

// Backup first.
const backupPath = `${DB_PATH}.bak-${Date.now()}`;
fs.copyFileSync(DB_PATH, backupPath);
console.log(`✓ Backup written: ${backupPath}`);

const db = new Database(DB_PATH, { timeout: 30000 });
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 30000');
db.pragma('foreign_keys = OFF'); // we're truncating multiple FK-linked tables

function tableExists(name) {
  return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(name);
}

function wipe(table, where) {
  if (!tableExists(table)) return 0;
  const sql = where ? `DELETE FROM ${table} WHERE ${where}` : `DELETE FROM ${table}`;
  const r = db.prepare(sql).run();
  console.log(`  - ${table.padEnd(22)} ${String(r.changes).padStart(6)} rows deleted`);
  return r.changes;
}

const OPERATIONAL_TABLES = [
  'tg_assignments',
  'tg_wallet_tx',
  'tg_broadcasts',
  'cdr',
  'allocations',
  'payments',
  'withdrawals',
  'notifications',
  'audit_logs',
  'sessions',
  'otp_audit_log',
];

// Bot state stored as KV in `settings` — anything matching these prefixes is wiped.
const BOT_STATE_KEY_PATTERNS = [
  'ims_cookies', 'ims_session', 'ims_state',
  'msi_cookies', 'msi_session', 'msi_state',
  'numpanel_cookies', 'numpanel_session', 'numpanel_state',
  'seven1tel_cookies', 'seven1tel_session', 'seven1tel_state',
  'iprn_cookies', 'iprn_session', 'iprn_state', 'iprn_sms_cursor', 'iprn_sms_v2_cursor',
  'autopool_', 'pool_', 'worker_',
];

const POOL_USERNAMES = [
  '__ims_pool__', '__msi_pool__', '__numpanel_pool__',
  '__seven1tel_pool__', '__iprn_sms_pool__', '__iprn_sms_v2_pool__',
  '__acchub_pool__',
];

const tx = db.transaction(() => {
  console.log('\n▶ Truncating operational tables…');
  for (const t of OPERATIONAL_TABLES) wipe(t);

  console.log('\n▶ Removing bot runtime state from settings…');
  if (tableExists('settings')) {
    const all = db.prepare(`SELECT key FROM settings`).all();
    const del = db.prepare(`DELETE FROM settings WHERE key = ?`);
    let n = 0;
    for (const { key } of all) {
      if (BOT_STATE_KEY_PATTERNS.some((p) => key.startsWith(p) || key.includes(p))) {
        del.run(key); n++;
      }
    }
    console.log(`  - settings (bot state)    ${String(n).padStart(6)} keys deleted`);
  }

  console.log('\n▶ Removing synthetic pool users…');
  if (tableExists('users')) {
    const del = db.prepare(`DELETE FROM users WHERE username = ?`);
    let n = 0;
    for (const u of POOL_USERNAMES) n += del.run(u).changes;
    console.log(`  - users (pool synthetic)  ${String(n).padStart(6)} rows deleted`);
  }

  console.log('\n▶ Resetting per-user counters (otp_count, balance stays at 0 for safety)…');
  if (tableExists('users')) {
    const r = db.prepare(`UPDATE users SET otp_count = 0`).run();
    console.log(`  - users.otp_count reset   ${String(r.changes).padStart(6)} rows`);
  }

  console.log('\n▶ Reclaiming sequences (autoincrement)…');
  if (tableExists('sqlite_sequence')) {
    const seqs = OPERATIONAL_TABLES.filter(tableExists);
    const del = db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`);
    for (const t of seqs) del.run(t);
  }
});

tx();

console.log('\n▶ VACUUM…');
db.exec('VACUUM');

db.pragma('foreign_keys = ON');
console.log('\n✅ Fresh reset complete.');
console.log(`   Backup at: ${backupPath}`);
db.close();