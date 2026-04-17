# NexusX — Daily DB Backup

Backups go to `/opt/nexus/backups/` as compressed SQLite snapshots.
Runs daily at **4:00 AM** server time. Keeps last **14 days**.

---

## 🚀 One-time setup (run on VPS as root)

```bash
# 1. Make script executable
chmod +x /opt/nexus/nexus-x-panel/backend/scripts/backup-db.sh

# 2. Create backup directory
mkdir -p /opt/nexus/backups

# 3. Install sqlite3 CLI (for atomic .backup — safer than cp)
apt-get update && apt-get install -y sqlite3

# 4. Test it once manually
/opt/nexus/nexus-x-panel/backend/scripts/backup-db.sh

# 5. Add cron job (runs every day at 4:00 AM)
( crontab -l 2>/dev/null; echo "0 4 * * * /opt/nexus/nexus-x-panel/backend/scripts/backup-db.sh >> /var/log/nexus-backup.log 2>&1" ) | crontab -

# 6. Verify cron is set
crontab -l | grep nexus
```

---

## 📂 Where backups live

```
/opt/nexus/backups/
├── nexus-2026-04-17-0400.db.gz
├── nexus-2026-04-18-0400.db.gz
├── nexus-2026-04-19-0400.db.gz
└── ... (14 days)
```

Anything older than 14 days is auto-deleted.

---

## ♻️ Restore from a backup

```bash
# 1. Stop backend
pm2 stop nexus-backend

# 2. Decompress and replace DB
cd /opt/nexus/nexus-x-panel/backend/data
mv nexus.db nexus.db.broken
gunzip -c /opt/nexus/backups/nexus-2026-04-17-0400.db.gz > nexus.db

# 3. Restart backend
pm2 start nexus-backend
pm2 logs nexus-backend --lines 30 --nostream
```

---

## ✅ Check it's working

```bash
# View backup log
tail -50 /var/log/nexus-backup.log

# List backups by date
ls -lh /opt/nexus/backups/

# Trigger manual run anytime
/opt/nexus/nexus-x-panel/backend/scripts/backup-db.sh
```

---

## 🔧 Configuration (optional)

Override defaults via env vars:

```bash
APP_DIR=/custom/path \
DB_PATH=/custom/db.sqlite \
BACKUP_DIR=/mnt/backups \
RETAIN_DAYS=30 \
  /opt/nexus/nexus-x-panel/backend/scripts/backup-db.sh
```
