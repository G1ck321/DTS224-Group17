# VIRTS — Vercel Deployment Guide & Frontend Review
**DTS224 Group 17**

---

## Frontend Code Review

### Files Checked

| File | API Calls? | Status |
|---|---|---|
| `signin.js` | ✅ Yes — `/api/v1/auth/login` | ✅ Fixed (dynamic `API_BASE`) |
| `staff_dashboard.js` | ✅ Yes — `/api/v1/payments/log` | ✅ Fixed (dynamic `API_BASE`) |
| `admin_dashboard.js` | ❌ No API calls | ✅ No changes needed |
| `dashboard.js` | ❌ No API calls | ✅ No changes needed |
| `home.js` | ❌ No API calls | ✅ No changes needed |

### What the `API_BASE` Fix Does

```js
// This line detects whether the page is being opened locally or on Vercel
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api/v1'  // Local dev: call backend on port 5000 directly
  : '/api/v1';                       // Vercel: same domain, Vercel rewrites handle routing
```

On **Vercel**, `/api/v1` hits the same domain as the frontend — Vercel routes it to your Express backend. On **localhost**, it explicitly targets `http://localhost:5000`.

---

## Vercel Deployment: How It Works for This Project

### The Challenge
Your project has **two parts**:
1. **Frontend** — static HTML/CSS/JS files (easy to host anywhere)
2. **Backend** — a running Node.js Express server that needs a database connection

Vercel is primarily a **static hosting** platform, but it supports **Serverless Functions** which lets it run Node.js code too.

### Architecture on Vercel

```
User's Browser
    │
    ▼
Vercel CDN
    ├── GET /index.html, /css/*, /js/*  ──► Serves static Frontend files
    └── POST /api/v1/auth/login          ──► Routes to Express backend (serverless)
                                               └── Connects to Remote MySQL DB
```

The `vercel.json` file created at the project root sets this up automatically.

---

## Step-by-Step: Deploying to Vercel

### Step 1: Push Your Code to GitHub
Make sure your full project (including the new `vercel.json`) is committed and pushed:

```bash
git add .
git commit -m "Add vercel.json deployment config and fix CORS"
git push origin main
```

### Step 2: Set Up a Remote MySQL Database

> [!IMPORTANT]
> This is the **hardest part**. Vercel's serverless functions cannot connect to a MySQL database running on your laptop. You need a cloud MySQL host.

**Free options for a student project:**

| Service | Free Tier | Notes |
|---|---|---|
| **PlanetScale** (recommended) | 5 GB free | MySQL-compatible, has a Vercel integration, very easy |
| **Railway** | $5 credit/month | Full MySQL, simple setup |
| **Clever Cloud** | 256 MB free | Old-school MySQL, slightly complex |
| **Aiven** | 1 free service | Good for learning |

**What to do with PlanetScale (simplest):**
1. Sign up at [planetscale.com](https://planetscale.com)
2. Create a new database called `virs_db`
3. Go to **Connect** → choose **Node.js** → copy the connection string
4. Run your `Database.sql` and `SampleData.sql` scripts against it (use PlanetScale's web console or a local MySQL client pointed at it)

### Step 3: Set Environment Variables in Vercel

> [!CAUTION]
> **Never commit your `.env` file to GitHub.** The `.gitignore` should already block it, but double-check.

In your Vercel project, go to **Settings → Environment Variables** and add:

| Variable Name | Value | Example |
|---|---|---|
| `DB_HOST` | Your cloud MySQL host | `aws.connect.psdb.cloud` |
| `DB_USER` | Your DB username | `your-username` |
| `DB_PASSWORD` | Your DB password | `pscale_pw_abc123...` |
| `DB_NAME` | Database name | `virs_db` |
| `DB_PORT` | MySQL port | `3306` |
| `JWT_SECRET` | A long random string | `a$very$long$random$secret$string$123` |
| `CORS_ORIGIN` | Your Vercel frontend URL | `https://virts-dts224.vercel.app` |
| `NODE_ENV` | `production` | `production` |

**To generate a strong JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Connect Vercel to Your GitHub Repo

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Vercel will auto-detect the `vercel.json` config
4. Click **Deploy**

### Step 5: Verify the Deployment

Once deployed, test these URLs (replace with your actual Vercel URL):

```
GET  https://your-app.vercel.app/                    → index.html (home page)
GET  https://your-app.vercel.app/HTML/sign_in.html   → Sign-in page
GET  https://your-app.vercel.app/api/health          → { "status": "ok" }
POST https://your-app.vercel.app/api/v1/auth/login   → Login endpoint
```

---

## Common Deployment Errors & Fixes

| Error | Likely Cause | Fix |
|---|---|---|
| `502 Bad Gateway` on `/api/*` | Backend crashed on startup | Check Vercel **Function Logs** tab for the error |
| `ECONNREFUSED` in logs | DB connection failed | Verify all DB env vars are set correctly in Vercel |
| CORS error in browser console | `CORS_ORIGIN` doesn't match your Vercel URL | Update `CORS_ORIGIN` env var to exact Vercel domain |
| `Cannot find module` | `node_modules` not installed by Vercel | Ensure `package.json` is in `Backend/` with all deps listed |
| HTML page loads but sign-in fails | `API_BASE` still hardcoded | Make sure `signin.js` has the dynamic `API_BASE` check |
| Sign-in works but redirects to 404 | HTML files not routed correctly | Check `vercel.json` routes — may need path adjustments |

---

## Local Development (Unchanged)

Nothing changes for running locally:

```bash
# Terminal 1 — Backend
cd Backend
npm run dev

# Open Frontend in browser
# Open Frontend/HTML/sign_in.html directly in your browser
# OR use VS Code Live Server extension
```

The dynamic `API_BASE` in `signin.js` and `staff_dashboard.js` will automatically use `http://localhost:5000` when opened locally.

---

## Summary of All Changes Made This Session

| File | What Changed |
|---|---|
| `Backend/src/controllers/paymentController.js` | Row-level locking, overpayment guard, auto-Completed status, 409 for duplicate refs |
| `Backend/src/app.js` | Explicit CORS config + `/api/health` endpoint |
| `Frontend/js/signin.js` | Dynamic `API_BASE` (localhost vs production) |
| `Frontend/js/staff_dashboard.js` | Dynamic `API_BASE` + maps payment method values to DB CHECK constraint values |
| `vercel.json` | **New** — Vercel routing for static frontend + Node backend |
