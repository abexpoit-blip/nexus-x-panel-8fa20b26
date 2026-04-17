# Nexus X — Premium SMS Operations Panel

Real-time SMS operations, OTP analytics, agent performance and provider health monitoring.

## Stack
- React 18 + Vite + TypeScript + Tailwind
- Node.js + Express backend (`/backend`)
- SQLite (better-sqlite3) for storage
- Puppeteer-based IMS bot worker

## Local development
```bash
# Frontend
npm install
npm run dev

# Backend (separate terminal)
cd backend
cp .env.example .env   # fill in real values
npm install
npm start
```

## Deployment
See `DEPLOY_BN.md` and `DEPLOY_CHECKLIST_BN.md` for VPS setup, Nginx, SSL,
daily DB backup cron, and the production go-live checklist.

## License
Private — © Shovon. All rights reserved.
