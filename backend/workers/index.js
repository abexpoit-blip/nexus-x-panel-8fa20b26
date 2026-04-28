function startAll() {
  // Start OTP poller (AccHub auto polling)
  require('./otpPoller').start();

  // Browser/HTTP provider workers. These are intentionally kept out of the
  // Express API process by default so slow scraping or large pool syncs cannot
  // starve login, health checks, or other API requests.
  try { require('./imsBot').start(); }
  catch (e) { console.warn('ims bot start error:', e.message); }

  try { require('./msiBot').start(); }
  catch (e) { console.warn('msi bot start error:', e.message); }

  try { require('./numpanelBot').start(); }
  catch (e) { console.warn('numpanel bot start error:', e.message); }

  try { require('./iprnSmsBot').start(); }
  catch (e) { console.warn('iprn_sms bot start error:', e.message); }

  try { require('./iprnSmsBotV2').start(); }
  catch (e) { console.warn('iprn_sms_v2 bot start error:', e.message); }

  try { require('./seven1telBot').start(); }
  catch (e) { console.warn('seven1tel bot start error:', e.message); }

  // ----- Auto-pool scheduler (refill + prune + cap, per-bot timers) -----
  try {
    const autopool = require('../lib/autopool');
    const safeScrape = (modName) => async () => {
      try {
        const m = require(modName);
        if (typeof m.scrapeNow === 'function') await m.scrapeNow();
      } catch (e) { throw e; }
    };
    autopool.register('msi',         { label: 'MSI',         poolUser: '__msi_pool__',         scrapeNow: safeScrape('./msiBot') });
    autopool.register('numpanel',    { label: 'NumPanel',    poolUser: '__numpanel_pool__',    scrapeNow: safeScrape('./numpanelBot') });
    autopool.register('iprn_sms',    { label: 'IPRN-SMS',    poolUser: '__iprn_sms_pool__',    scrapeNow: safeScrape('./iprnSmsBot') });
    autopool.register('iprn_sms_v2', { label: 'IPRN-SMS V2', poolUser: '__iprn_sms_v2_pool__', scrapeNow: safeScrape('./iprnSmsBotV2') });
    autopool.register('seven1tel',   { label: 'Seven1Tel',   poolUser: '__seven1tel_pool__',   scrapeNow: safeScrape('./seven1telBot') });
    autopool.startScheduler();
  } catch (e) { console.warn('autopool init error:', e.message); }
}

module.exports = { startAll };