# Arunya ERP – Deployment Guide

Deploy the app to **Vercel** (frontend + API) with **Turso** as the database.

---

## 1. Prerequisites

- **Node.js 20** installed locally
- **Turso** account – [https://turso.tech](https://turso.tech)
- **GitHub** account
- **Vercel** account – [https://vercel.com](https://vercel.com)

---

## 2. Turso (database)

### Install Turso CLI (if needed)

```bash
# macOS / Linux
curl -sSfL https://get.turso.tech/install.sh | sh

# Or with Homebrew
brew install tursodatabase/tap/turso
```

### Create database and get credentials

```bash
# Login (opens browser)
turso auth login

# Create database (e.g. arunya-erp)
turso db create arunya-erp --region ap-south-1

# Get database URL
turso db show arunya-erp --url

# Create auth token (save this securely)
turso db tokens create arunya-erp
```

Save:

- **TURSO_DATABASE_URL** – from `turso db show ... --url` (e.g. `libsql://xxx.turso.io`)
- **TURSO_AUTH_TOKEN** – from `turso db tokens create ...`

---

## 3. Push code to GitHub

From the project root:

```bash
# Initialize git (if not already)
git init

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/arunya-erp.git

# Add, commit, push
git add .
git commit -m "Prepare for deployment"
git branch -M main
git push -u origin main
```

---

## 4. Deploy on Vercel

### Connect repository

1. Go to [vercel.com](https://vercel.com) and sign in.
2. **Add New** → **Project**.
3. Import your **GitHub** repo (`arunya-erp`).
4. Leave **Root Directory** as `.` (project root).

### Environment variables

In the project **Settings → Environment Variables**, add:

| Name | Value | Notes |
|------|--------|--------|
| `TURSO_DATABASE_URL` | `libsql://xxx.turso.io` | From step 2 |
| `TURSO_AUTH_TOKEN` | Your token | From step 2 |
| `JWT_SECRET` | A long random string | e.g. `openssl rand -base64 32` |

Optional (for invoices/company info):

- `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_GST`, etc. – same as in your local `.env` if you use them.

Apply to **Production** (and Preview if you want).

### Deploy

1. Click **Deploy** (or push to `main` after the repo is connected).
2. Wait for the build. The first deploy runs:
   - Frontend build (`frontend/`)
   - API build (`api/index.ts` + `api/backend/`).

### After first deploy

- **Migrations** run on the first API request that needs the DB (dashboard, products, etc.). That first request can take **10–15 seconds** (cold start + Turso).
- The app calls **`/api/warmup`** on load so the serverless instance is ready sooner; dashboard also retries once if the first load fails.
- Your Turso DB will have empty tables; to copy data from local SQLite, use the push script (see section 6).

**Optional:** After deploy, open once in a browser to warm the API:
`https://your-project.vercel.app/api/warmup`

---

## 5. Your live URLs

- **App (frontend):** `https://your-project.vercel.app`
- **API:** `https://your-project.vercel.app/api`
- **Health (fast):** `https://your-project.vercel.app/api/health`
- **Warmup (runs migrations):** `https://your-project.vercel.app/api/warmup`

The frontend is configured to call `/api`, so it works on the same domain. No extra `REACT_APP_API_URL` is needed for production unless you use a custom API URL.

---

## 6. (Optional) Copy local data to Turso

If you have data in `backend/data/arunya_erp.db` and want it in Turso:

1. In **backend** folder, create `.env` with:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
2. Run:

```bash
cd backend
npm run push-to-turso
```

This clears Turso and fills it from your local SQLite. Run only when you intend to replace Turso data.

---

## 7. Troubleshooting

| Issue | What to check |
|-------|----------------|
| Build fails | Vercel **Deployments** → failed build → **Build Logs**. Fix TypeScript or missing deps. |
| "Failed to load dashboard data" | First load can take 10–15s (migrations). Wait or retry; ensure `TURSO_*` and `JWT_SECRET` are set in Vercel. Check **Functions** logs. |
| Products / Stores very slow | Same cold start. App calls `/api/warmup` on load; open `/api/warmup` once after deploy to warm the instance. |
| 401 on login | `JWT_SECRET` set in Vercel; same secret used for signing. |
| Blank page / wrong route | Vercel **routes** in `vercel.json` – `/api/*` → API, `/*` → frontend. |

---

## Summary checklist

- [ ] Turso DB created; `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` saved
- [ ] Code pushed to GitHub
- [ ] Vercel project created and repo connected
- [ ] `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET` set in Vercel
- [ ] Deploy triggered and build succeeded
- [ ] Opened live URL and tested login + dashboard
- [ ] (Optional) Ran `push-to-turso` from backend if you need local data in Turso
