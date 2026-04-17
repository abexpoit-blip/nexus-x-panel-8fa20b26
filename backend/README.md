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

### 1. Install Node.js 20 + pm2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2. Upload backend folder

```bash
# from your local machine
scp -r backend/ user@YOUR_VPS_IP:/var/www/nexus-backend/
ssh user@YOUR_VPS_IP
cd /var/www/nexus-backend
```

### 3. Configure & install

```bash
cp .env.example .env
nano .env                       # set real values, IMPORTANT!
npm install --production
mkdir -p data                   # SQLite file lives here
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

### AccHub (auto)
Edit `providers/acchub.js` → endpoints are placeholders. Verify against AccHub API docs and update.
Set `ACCHUB_API_KEY` in `.env`.

### IMS (manual mode)
Since you don't have an IMS API account, IMS works via **manual pool**:

1. Manager gives you a number → you POST it to `/api/numbers/ims/pool`:
   ```json
   { "numbers": ["+88017xxxxxxx"], "country_code": "BD", "operator": "Grameen" }
   ```
2. Agent calls `/api/numbers/get` with `provider: "ims"` → number is assigned from pool.
3. When OTP arrives, you POST to `/api/numbers/ims/otp`:
   ```json
   { "phone_number": "+88017xxxxxxx", "otp": "1234" }
   ```
4. Backend auto-credits the agent based on Rate Card commission %.

(You can build admin UI pages in the frontend that call these endpoints — easier than curl.)

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
