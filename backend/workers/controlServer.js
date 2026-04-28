const express = require('express');
const autopool = require('../lib/autopool');

const PORT = +(process.env.WORKER_CONTROL_PORT || 4010);

const BOTS = {
  ims: () => require('./imsBot'),
  msi: () => require('./msiBot'),
  numpanel: () => require('./numpanelBot'),
  seven1tel: () => require('./seven1telBot'),
  'iprn-sms': () => require('./iprnSmsBot'),
  'iprn-sms-v2': () => require('./iprnSmsBotV2'),
};

function sendError(res, e) {
  res.status(500).json({ error: e?.message || String(e) });
}

function start() {
  const app = express();
  app.use(express.json({ limit: '128kb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

  for (const [id, load] of Object.entries(BOTS)) {
    app.get(`/${id}-status`, (_req, res) => {
      try { res.json({ status: load().getStatus?.() || null }); } catch (e) { sendError(res, e); }
    });
    app.post(`/${id}-restart`, async (_req, res) => {
      try { await load().restart?.(); res.json({ ok: true }); } catch (e) { sendError(res, e); }
    });
    app.post(`/${id}-start`, (_req, res) => {
      try { load().start?.(); res.json({ ok: true, status: load().getStatus?.() || null }); } catch (e) { sendError(res, e); }
    });
    app.post(`/${id}-stop`, async (_req, res) => {
      try { await load().stop?.(); res.json({ ok: true }); } catch (e) { sendError(res, e); }
    });
    app.post(`/${id}-scrape-now`, async (_req, res) => {
      try { res.json(await load().scrapeNow?.()); } catch (e) { sendError(res, e); }
    });
    app.post(`/${id}-sync-live`, async (_req, res) => {
      try { res.json(await load().syncLive?.()); } catch (e) { sendError(res, e); }
    });
  }

  app.post('/ims-scrape-numbers', (_req, res) => {
    try { res.json(require('./imsBot').startNumbersScrapeBackground()); } catch (e) { sendError(res, e); }
  });
  app.get('/ims-numbers-job', (_req, res) => {
    try { res.json(require('./imsBot').getNumbersJobStatus()); } catch (e) { sendError(res, e); }
  });

  app.get('/autopool', (_req, res) => res.json({ bots: autopool.listBots() }));
  app.get('/autopool/:botId', (req, res) => {
    const bot = autopool.getBot(req.params.botId);
    if (!bot) return res.status(404).json({ error: 'Unknown bot' });
    res.json({ bot });
  });
  app.put('/autopool/:botId', (req, res) => {
    const bot = autopool.getBot(req.params.botId);
    if (!bot) return res.status(404).json({ error: 'Unknown bot' });
    const config = autopool.saveConfig(req.params.botId, req.body || {});
    res.json({ ok: true, config });
  });
  app.post('/autopool/:botId/run', async (req, res) => {
    try { res.json(await autopool.runOnce(req.params.botId, { force: true })); } catch (e) { sendError(res, e); }
  });

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[worker-control] listening on http://127.0.0.1:${PORT}`);
  });
}

module.exports = { start };