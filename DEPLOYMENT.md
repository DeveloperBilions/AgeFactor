# Deployment Guide — Render + Neon + Upstash (Free Tier)

## Overview

| Service | Provider | Tier | Purpose |
|---------|----------|------|---------|
| Backend API | Render | Free | Express + TypeScript API |
| Web Frontend | Render | Free | Next.js app |
| PostgreSQL | Neon | Free (0.5GB) | Primary database |
| Redis | Upstash | Free (10K cmd/day) | Cache + job queue |
| File Storage | AWS S3 | Pay-as-you-go | PDF storage (optional for staging) |

**Total cost: $0/month** on free tiers.

> **Note:** Render free services spin down after 15 minutes of inactivity. First request after idle takes ~30-50 seconds. This is fine for staging/prototyping.

---

## Step 1: Create Neon PostgreSQL Database

1. Go to [console.neon.tech](https://console.neon.tech) and sign up
2. Create a new project:
   - **Name:** `longhealth`
   - **Region:** `Asia Pacific (Singapore)` (closest to India)
   - **Postgres version:** 16
3. Create a database named `longhealth`
4. Copy the **connection string** from the dashboard. It looks like:
   ```
   postgresql://user:pass@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/longhealth?sslmode=require
   ```
5. Save this — you'll need it as `DATABASE_URL`

## Step 2: Create Upstash Redis

1. Go to [console.upstash.com](https://console.upstash.com) and sign up
2. Create a new Redis database:
   - **Name:** `longhealth`
   - **Region:** `AP-South-1 (Mumbai)` if available, else Singapore
   - **TLS:** Enabled (default)
3. Copy the **Redis URL** from the dashboard. It looks like:
   ```
   rediss://default:AbCdEf123@apn1-example.upstash.io:6379
   ```
   > Note the `rediss://` (double s) — this enables TLS, which is required.
4. Save this — you'll need it as `REDIS_URL`

## Step 3: Get Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to API Keys → Create key
3. Copy the key (starts with `sk-ant-`)
4. Save this — you'll need it as `ANTHROPIC_API_KEY`

## Step 4: Deploy to Render

### Option A: Blueprint (Recommended)

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New** → **Blueprint**
3. Connect your GitHub repo (`DeveloperBilions/AgeFactor`)
4. Render auto-detects `render.yaml` and shows 2 services:
   - `longhealth-api` (backend)
   - `longhealth-web` (frontend)
5. Click **Apply**
6. Set the environment variables that show as `sync: false`:

**For longhealth-api:**
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `REDIS_URL` | Your Upstash Redis URL |
| `ANTHROPIC_API_KEY` | Your Claude API key |
| `CORS_ORIGIN` | `https://longhealth-web.onrender.com` |
| `AWS_ACCESS_KEY_ID` | Leave empty for staging |
| `AWS_SECRET_ACCESS_KEY` | Leave empty for staging |
| `S3_BUCKET` | Leave empty for staging |

**For longhealth-web:**
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://longhealth-api.onrender.com/api/v1` |

7. Click **Deploy** — Render will build and deploy both services

### Option B: Manual Setup

If Blueprint doesn't work, create each service manually:

**Backend:**
1. New → Web Service → Connect repo
2. **Root Directory:** `app`
3. **Build Command:** `cd packages/backend && chmod +x render-build.sh && ./render-build.sh`
4. **Start Command:** `cd packages/backend && npm start`
5. **Plan:** Free
6. **Region:** Singapore
7. Add all env vars listed above

**Frontend:**
1. New → Web Service → Connect repo
2. **Root Directory:** `app`
3. **Build Command:** `cd packages/web && chmod +x render-build.sh && ./render-build.sh`
4. **Start Command:** `cd packages/web && npm start`
5. **Plan:** Free
6. **Region:** Singapore
7. Add `NEXT_PUBLIC_API_URL` env var

## Step 5: Verify Deployment

### Backend Health Check
```bash
curl https://longhealth-api.onrender.com/health
```
Expected response:
```json
{"status":"ok","timestamp":"...","uptime":...,"environment":"production"}
```

### Frontend
Open `https://longhealth-web.onrender.com` in your browser. You should see the Long Health landing page.

### Test Auth Flow
```bash
# Send OTP (in production mode without MSG91, check Render logs for the OTP)
curl -X POST https://longhealth-api.onrender.com/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999"}'
```

---

## Troubleshooting

### Build Fails on Render

**Check Render build logs** — common issues:

1. **"Cannot find module '@long-health/shared'"**
   - The build script must install from monorepo root. Ensure `render-build.sh` does `cd ../..` before `npm install`.

2. **"DATABASE_URL must be a valid URL"**
   - Ensure `DATABASE_URL` env var is set in Render dashboard before deploying.

3. **Migration fails**
   - Check your Neon database is active (free tier auto-suspends after 5min idle)
   - Verify the connection string includes `?sslmode=require`

### App Starts But API Returns 500

- Check Render logs: Dashboard → Service → Logs
- Common cause: Redis connection failed — verify Upstash URL uses `rediss://` (double s)

### Cold Start Takes Too Long

Free tier limitation. First request after 15min idle takes 30-50 seconds. Options:
- Use a free cron service (like cron-job.org) to ping `/health` every 14 minutes
- Upgrade to Render Starter plan ($7/month) for always-on

### CORS Errors in Browser

- Ensure `CORS_ORIGIN` on the backend matches the exact frontend URL
- Include the protocol: `https://longhealth-web.onrender.com` (no trailing slash)

---

## Adding S3 Later (For PDF Upload)

When ready to enable PDF upload:

1. Create an S3 bucket in AWS (`ap-south-1` region)
2. Create an IAM user with S3 access to that bucket only
3. Set these env vars in Render:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `S3_BUCKET`
4. Redeploy the backend

---

## Upgrading from Free Tier

When the app outgrows free tier:

| Upgrade | When | Cost |
|---------|------|------|
| Render Starter | Need always-on (no cold starts) | $7/month per service |
| Neon Launch | Need >0.5GB storage | $19/month |
| Upstash Pro | Need >10K commands/day | $10/month |
| **AWS Lightsail** | Need full control, single instance | $10/month total |

See the Lightsail deployment plan for the next step up.
