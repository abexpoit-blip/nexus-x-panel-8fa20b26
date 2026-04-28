const http = require('http');

const BASE = process.env.WORKER_CONTROL_URL || `http://127.0.0.1:${process.env.WORKER_CONTROL_PORT || 4010}`;
const DEFAULT_TIMEOUT_MS = +(process.env.WORKER_CONTROL_TIMEOUT_MS || 15000);
const LONG_TIMEOUT_MS = +(process.env.WORKER_CONTROL_LONG_TIMEOUT_MS || 180000);

function timeoutFor(path) {
  return /-(scrape-now|sync-live|restart|start|stop)$/.test(path) || /\/autopool\/[^/]+\/run$/.test(path)
    ? LONG_TIMEOUT_MS
    : DEFAULT_TIMEOUT_MS;
}

function request(path, { method = 'GET', body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = body === undefined ? null : JSON.stringify(body);
    const timeoutMs = timeoutFor(path);
    const req = http.request(url, {
      method,
      headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {},
      timeout: timeoutMs,
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        const data = raw ? JSON.parse(raw) : {};
        if (res.statusCode >= 400) {
          const err = new Error(data.error || `Worker control failed (${res.statusCode})`);
          err.status = res.statusCode;
          err.data = data;
          reject(err);
        } else resolve(data);
      });
    });
    req.on('timeout', () => req.destroy(new Error(`Worker control timed out after ${timeoutMs}ms`)));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = { request };