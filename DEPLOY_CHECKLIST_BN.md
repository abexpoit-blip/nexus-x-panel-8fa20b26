# ✅ NexusX — Production Deploy Final Checklist (বাংলা)

প্রতিটা box check করতে করতে এগিয়ে যান। সব tick হলে production-ready।

---

## 🔧 1. Server prerequisites

- [ ] Ubuntu 22.04 LTS VPS (2GB+ RAM)
- [ ] Domain DNS configured: `nexus-x.site`, `www`, `api` → server IP
- [ ] `node -v` shows v20+
- [ ] `pm2 -v` works
- [ ] `chromium-browser --version` works (IMS bot এর জন্য)
- [ ] `nginx -v` + `certbot --version` works

---

## 🔐 2. Environment variables (`backend/.env`)

```bash
nano /opt/nexus/nexus-x-panel/backend/.env
```

- [ ] `JWT_SECRET` — 64+ char random (generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- [ ] `ADMIN_USERNAME` — set (default: `admin`)
- [ ] `ADMIN_PASSWORD` — শক্ত 12+ char (first-time DB init এর সময় এটাই admin password হবে)
- [ ] `CORS_ORIGIN=https://nexus-x.site,https://www.nexus-x.site` (exact, https সহ, no wildcard)
- [ ] `NODE_ENV=production`
- [ ] `ACCHUB_USERNAME` + `ACCHUB_PASSWORD` সঠিক
- [ ] `IMS_USERNAME` + `IMS_PASSWORD` সঠিক
- [ ] `IMS_CHROME_PATH=/usr/bin/chromium-browser`
- [ ] `IMS_HEADLESS=true`
- [ ] `IMS_SCRAPE_INTERVAL=60` (heavy scrape every 60s)
- [ ] `IMS_OTP_INTERVAL=10` (fast OTP poll — admin UI থেকেও 5/10/30 toggle করা যাবে)

---

## 🚀 3. First-time deploy

```bash
cd /opt/nexus/nexus-x-panel
git pull
cd backend && npm install --production=false
cd .. && npm install && npm run build
```

- [ ] Backend build error-free
- [ ] Frontend `dist/` folder created
- [ ] `pm2 start backend/server.js --name nexus-api`
- [ ] `pm2 save && pm2 startup` (auto-start on reboot)
- [ ] `pm2 logs nexus-api --lines 50` shows `🚀 NexusX backend listening...`

---

## 🌐 4. Nginx + SSL

- [ ] `/etc/nginx/sites-enabled/nexus-x.site` (frontend, serves `dist/`)
- [ ] `/etc/nginx/sites-enabled/api.nexus-x.site` (proxy to `127.0.0.1:4000`)
- [ ] `sudo nginx -t` passes
- [ ] `sudo certbot --nginx -d nexus-x.site -d www.nexus-x.site -d api.nexus-x.site`
- [ ] `https://nexus-x.site` opens
- [ ] `https://api.nexus-x.site/api/health` returns `{"ok":true,...}`
- [ ] `sudo certbot renew --dry-run` succeeds

---

## 🔑 5. Admin password change (CRITICAL)

`.env`-এর default password শুধু **প্রথম DB init**-এ set হয় — production-এ অবশ্যই UI থেকে change করুন:

- [ ] Login as admin → `/sys/control-panel/security` → **Password** tab
- [ ] পুরনো password → নতুন শক্ত password (12+ char, mixed case, digit, symbol)
- [ ] Save করার পর auto-logout হবে → নতুন password দিয়ে relogin
- [ ] Other sessions revoked confirm করুন

---

## 💾 6. Daily DB backup (cron)

```bash
chmod +x /opt/nexus/nexus-x-panel/backend/scripts/backup-db.sh
sudo crontab -e
# নিচের লাইন paste করুন:
0 4 * * * /opt/nexus/nexus-x-panel/backend/scripts/backup-db.sh >> /var/log/nexus-backup.log 2>&1
```

- [ ] Manual test: `bash backend/scripts/backup-db.sh` → `/opt/nexus/backups/nexus-*.db.gz` তৈরি হলো?
- [ ] `crontab -l` শিউর হোন entry আছে
- [ ] Cron দ্বিতীয় দিন verify: `ls -lh /opt/nexus/backups/`
- [ ] 14-day retention কাজ করছে (older `.gz` auto-delete)

---

## 🤖 7. IMS bot setup (UI থেকে)

- [ ] Admin → **IMS Status** page → **Credentials** save (DB-backed override)
- [ ] **Start** button → bot login হলো? `Logged in` pill green?
- [ ] **Scrape Now** → numbers add হলো?
- [ ] **OTP Poll Interval** → আপনার preference: 10s (default) recommended
- [ ] Pool size 100+ থাকা পর্যন্ত wait
- [ ] **Sync Live** test — pool reconcile করছে কিনা

---

## 💰 8. Rate Card + business config

- [ ] Admin → **Rate Card** → প্রতিটা service-এর rate verify
- [ ] Commission % সঠিক (agent payout = rate × commission%)
- [ ] Test agent বানিয়ে ৳50+ balance দিন
- [ ] Agent login → IMS থেকে number নিয়ে OTP আসছে কিনা end-to-end test

---

## 🔔 9. Monitoring

- [ ] `pm2 logs nexus-api` clean (no recurring errors)
- [ ] `pm2 monit` — memory under 500MB stable
- [ ] Admin → **Notifications** — low pool / IMS down alerts আসছে
- [ ] Admin → **Security** → **Audit Logs** filter কাজ করছে
- [ ] `disk usage`: `df -h` — root partition < 80%

### Optional: pm2 auto-restart on crash
```bash
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🛡️ 10. Security hardening

- [ ] `sudo ufw status` → only `OpenSSH` + `Nginx Full` allowed
- [ ] SSH password login disabled (key-only): `/etc/ssh/sshd_config` → `PasswordAuthentication no`
- [ ] `fail2ban` install (optional but recommended): `sudo apt install fail2ban`
- [ ] Default admin password changed (Step 5)
- [ ] `JWT_SECRET` 64+ char (Step 2)
- [ ] HTTPS active everywhere (Step 4)
- [ ] CORS exact origin, no `*`

---

## 🔄 11. Future updates

```bash
cd /opt/nexus/nexus-x-panel
git pull
cd backend && npm install && pm2 restart nexus-api
cd .. && npm install && npm run build
# nginx already serves dist/ — কিছু করতে হবে না
```

---

## 🆘 Quick troubleshooting

| সমস্যা | চেক করুন |
|--------|----------|
| 502 Bad Gateway | `pm2 status` → backend running? `pm2 logs nexus-api` |
| CORS error | `.env`-এর `CORS_ORIGIN` exact match? `pm2 restart nexus-api` |
| Login হয় কিন্তু পরে logout | HTTPS active? Cookie শুধু https-এ যায় |
| OTP দেরিতে আসছে | UI → IMS Status → OTP Poll Interval `5s` করুন |
| IMS bot login fail | Credentials UI থেকে re-save → bot auto-restart হবে |
| Pool empty | **Sync Live** + **Scrape Now** button click |
| Backup ফাঁকা | `ls -lh /opt/nexus/backups/`; cron log: `tail /var/log/nexus-backup.log` |

---

## ✅ Final go-live confirmation

সব check হলে:
- [ ] Test agent দিয়ে full flow: register → balance → get number → OTP receive → commission credited
- [ ] Admin impersonation silent (agent inbox-এ notification আসে না)
- [ ] Mobile-এ frontend responsive
- [ ] `https://api.nexus-x.site/api/health` 24h পর-ও green

🎉 **Production live!**
