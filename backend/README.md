# NexusX Backend

Self-contained Node.js + Express + SQLite backend for the NexusX SMS/OTP platform.
**No external services required** — runs on any VPS with Node.js 18+.

---

## 🚀 Quick start (local development)

```bash
cd backend
cp .env.example .env
# Edit .env: set ADMIN_PASSWORD, JWT_SECRET, ACCHUB_API_KEY
npm install
npm start
```

Server will start on `http://localhost:4000`. Default admin: `admin / admin123` (change in `.env`!).

---

## 📦 Deploy to VPS (Ubuntu 22.04)

### 1. Install Node.js 20 + pm2 + Chromium dependencies (for IMS bot)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs chromium-browser
sudo npm install -g pm2

# Puppeteer needs these libs on a fresh server:
sudo apt install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
  libcairo2 libasound2 libpangocairo-1.0-0 fonts-liberation
```

### 2. Upload backend folder

```bash
scp -r backend/ user@YOUR_VPS_IP:/var/www/nexus-backend/
ssh user@YOUR_VPS_IP
cd /var/www/nexus-backend
```

### 3. Configure & install

```bash
cp .env.example .env
nano .env                       # set ALL real values: passwords, JWT_SECRET, AccHub & IMS creds
npm install --production        # also downloads Puppeteer's bundled Chromium (~170MB)
mkdir -p data
```

### 4. Start with pm2

```bash
pm2 start server.js --name nexus-api
pm2 save
pm2 startup                     # follow the printed command
```

Backend now runs on `localhost:4000` permanently. Logs: `pm2 logs nexus-api`.

### 5. nginx reverse proxy + SSL

```nginx
# /etc/nginx/sites-available/api.yourdomain.com
server {
  listen 80;
  server_name api.yourdomain.com;
  location / {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
```

### 6. Frontend env

In your frontend repo, set:
```
VITE_API_URL=https://api.yourdomain.com/api
```
Then `npm run build` and serve `dist/` via nginx on `yourdomain.com`.

---

## 🗂 Folder layout

```
backend/
├── server.js              # entry point
├── db/
│   ├── schema.sql         # all tables
│   └── init.js            # auto-runs on boot
├── data/nexus.db          # SQLite file (auto-created)
├── lib/
│   ├── db.js              # singleton connection
│   ├── audit.js           # audit logger
│   └── commission.js      # agent payout calc
├── middleware/auth.js     # JWT verify + role check
├── routes/                # all API endpoints
├── providers/             # AccHub + IMS clients
└── workers/otpPoller.js   # background OTP sync (every 5s)
```

---

## 🔌 Provider integration

### AccHub (auto, fully wired)
Reverse-engineered from `sms.acchub.io`. The provider client logs in with your account
credentials, caches the JWT, and:
- Lists countries: `GET /api/freelancer/get-page/available-countries`
- Lists operators: `GET /api/freelancer/get-page/available-operators?country_id=X`
- Allocates numbers: `POST /api/freelancer/get-page/get-number`
- Polls OTPs: `GET /api/freelancer/get-page/otp-history` (every 5s) and matches by phone number

Set in `.env`:
```
ACCHUB_USERNAME=ShovonYE
ACCHUB_PASSWORD=your_acchub_password
```

### IMS (Puppeteer browser bot)
The manager's IMS account has no API, so we run a headless Chromium that stays logged
into `imssms.org` and scrapes:
1. **Numbers page** → when manager adds a new number, bot inserts it into the local pool. Agents claim it via `POST /api/numbers/get` with `provider:"ims"`.
2. **Inbox page** → when an OTP arrives, bot matches it to the active allocation by phone number and auto-credits the agent.

Set in `.env`:
```
IMS_ENABLED=true
IMS_USERNAME=Shovonkhan7
IMS_PASSWORD=your_ims_password
IMS_CHROME_PATH=/usr/bin/chromium-browser   # or leave blank to use puppeteer's bundled chrome
```

**⚠ One-time selector tuning required.** The IMS panel URLs (`/login`, `/numbers`, `/inbox`)
and table heuristics in `workers/imsBot.js` are best-guess defaults. After first deploy,
run inspector mode to dump the real HTML and tune them:

```bash
IMS_HEADLESS=false node workers/imsBot.js --inspect
# Manually open the numbers + inbox pages, then Ctrl+C → saves ims-page.html
```

Live bot logs: `pm2 logs nexus-api | grep ims-bot`

The legacy manual endpoints (`POST /api/numbers/ims/pool` and `POST /api/numbers/ims/otp`)
remain available as a fallback if the bot is disabled.

---

## 💰 Agent payout flow

1. Admin sets a Rate in Rate Card: `provider`, `country_code`, `operator`, `price_bdt` (your cost), `agent_commission_percent`.
2. When an OTP arrives (auto via poller, or manual via `/ims/otp`):
   - CDR row inserted (status `billed`, amount = `price_bdt * commission% / 100`)
   - Agent's `balance` increased by that amount
   - `payments` row written (`type: credit`, `method: auto`)
   - Notification sent to agent

---

## 💾 Backup

```bash
# Daily backup cron
0 3 * * * cp /var/www/nexus-backend/data/nexus.db /var/backups/nexus-$(date +\%F).db
```

---

## 🛠 Useful commands

```bash
pm2 logs nexus-api              # live logs
pm2 restart nexus-api           # restart after .env change
pm2 monit                       # CPU / memory
sqlite3 data/nexus.db           # interactive DB shell
```
