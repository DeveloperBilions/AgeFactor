# Deployment Guide — Long Health

## Current Live Deployment

| Service | Provider | URL |
|---------|----------|-----|
| **Backend API** | AWS App Runner (us-east-2) | https://99gjfqgwtg.us-east-2.awsapprunner.com |
| **Frontend** | AWS App Runner (us-east-2) | https://mmbikziqz9.us-east-2.awsapprunner.com |
| **PostgreSQL** | Neon (us-east-1) | `ep-flat-violet-amtubivq.c-5.us-east-1.aws.neon.tech` |
| **Redis** | Upstash | `resolved-porpoise-81645.upstash.io` |

**Estimated cost: ~$2-7/month** (App Runner auto-pauses when idle)

### Quick Verification

```bash
# Backend health check
curl https://99gjfqgwtg.us-east-2.awsapprunner.com/health

# Frontend
open https://mmbikziqz9.us-east-2.awsapprunner.com
```

### Get OTP from Logs

SMS is not yet integrated. OTPs are logged to CloudWatch. To retrieve the latest OTP:

```bash
aws logs filter-log-events \
  --log-group-name "/aws/apprunner/longhealth-api/8c95d2507c7d424d953a7b800860ca73/application" \
  --region us-east-2 --filter-pattern "OTP" \
  --query 'events[-1].message' --output text
```

---

## Architecture

```
Internet
   │
   ├── https://mmbikziqz9.us-east-2.awsapprunner.com
   │       App Runner: longhealth-web (Next.js)
   │       NEXT_PUBLIC_API_URL → backend
   │
   └── https://99gjfqgwtg.us-east-2.awsapprunner.com
           App Runner: longhealth-api (Express)
            │           │
       Neon PostgreSQL   Upstash Redis (TLS)
       (us-east-1)      (rediss://)
```

### AWS Resources

| Resource | ID / ARN |
|----------|----------|
| Backend App Runner | `arn:aws:apprunner:us-east-2:309524473584:service/longhealth-api/8c95d2507c7d424d953a7b800860ca73` |
| Web App Runner | `arn:aws:apprunner:us-east-2:309524473584:service/longhealth-web/598800184c404f978aa3037e3d7ed9c0` |
| Backend ECR | `309524473584.dkr.ecr.us-east-2.amazonaws.com/longhealth-api` |
| Web ECR | `309524473584.dkr.ecr.us-east-2.amazonaws.com/longhealth-web` |
| IAM Role (ECR access) | `mongodb-mcp-apprunner-ecr-role` |
| AWS Account | `309524473584` |
| Region | `us-east-2` (Ohio) |

---

## Redeployment Guide

### Prerequisites

- AWS CLI configured (`aws sts get-caller-identity` works)
- Docker Desktop running
- On Apple Silicon Mac, always build with `--platform linux/amd64`

### Deploy Backend Changes

```bash
cd app

# 1. Login to ECR
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 309524473584.dkr.ecr.us-east-2.amazonaws.com

# 2. Build amd64 image
docker build --platform linux/amd64 -t 309524473584.dkr.ecr.us-east-2.amazonaws.com/longhealth-api:latest -f packages/backend/Dockerfile .

# 3. Push to ECR
docker push 309524473584.dkr.ecr.us-east-2.amazonaws.com/longhealth-api:latest

# 4. Trigger redeployment
aws apprunner start-deployment \
  --service-arn "arn:aws:apprunner:us-east-2:309524473584:service/longhealth-api/8c95d2507c7d424d953a7b800860ca73" \
  --region us-east-2

# 5. Check status (wait for RUNNING)
aws apprunner describe-service \
  --service-arn "arn:aws:apprunner:us-east-2:309524473584:service/longhealth-api/8c95d2507c7d424d953a7b800860ca73" \
  --region us-east-2 --query 'Service.Status' --output text
```

### Deploy Frontend Changes

```bash
cd app

# 1. Build amd64 image (API URL is baked in at build time)
docker build --platform linux/amd64 \
  -t 309524473584.dkr.ecr.us-east-2.amazonaws.com/longhealth-web:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://99gjfqgwtg.us-east-2.awsapprunner.com/api/v1 \
  -f packages/web/Dockerfile .

# 2. Push to ECR
docker push 309524473584.dkr.ecr.us-east-2.amazonaws.com/longhealth-web:latest

# 3. Trigger redeployment
aws apprunner start-deployment \
  --service-arn "arn:aws:apprunner:us-east-2:309524473584:service/longhealth-web/598800184c404f978aa3037e3d7ed9c0" \
  --region us-east-2
```

### Run Database Migrations

Migrations run from your local machine against Neon:

```bash
cd app/packages/backend

DATABASE_URL="postgresql://neondb_owner:npg_0pyXMzKo5RCN@ep-flat-violet-amtubivq.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require" npm run migrate:up

DATABASE_URL="postgresql://neondb_owner:npg_0pyXMzKo5RCN@ep-flat-violet-amtubivq.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require" npm run seed
```

---

## Environment Variables

### Backend (App Runner)

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `3001` | |
| `DATABASE_URL` | `postgresql://neondb_owner:...@ep-flat-violet-amtubivq.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require` | Neon |
| `REDIS_URL` | `rediss://default:...@resolved-porpoise-81645.upstash.io:6379` | Upstash (TLS) |
| `JWT_SECRET` | (generated) | Min 32 chars |
| `JWT_EXPIRY` | `7d` | |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Claude API |
| `AWS_REGION` | `us-east-2` | |
| `CORS_ORIGIN` | `https://mmbikziqz9.us-east-2.awsapprunner.com` | Frontend URL |
| `LOG_LEVEL` | `info` | |

### Frontend (App Runner)

| Variable | Value | Notes |
|----------|-------|-------|
| `PORT` | `3000` | |
| `HOSTNAME` | `0.0.0.0` | Required for App Runner |

### Frontend (Build-time)

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_API_URL` | `https://99gjfqgwtg.us-east-2.awsapprunner.com/api/v1` | Passed as `--build-arg` |

---

## App Runner Service Config

Both services use:
- **CPU:** 0.25 vCPU (256 units)
- **Memory:** 0.5 GB (512 units)
- **Health check:** TCP, 20s interval, 10s timeout, 10 unhealthy threshold
- **Auto-deploy:** Disabled (manual via `start-deployment`)
- **ECR access role:** `mongodb-mcp-apprunner-ecr-role`

---

## Troubleshooting

### Container Fails to Deploy

1. **Check architecture:** Must be `linux/amd64`. On Apple Silicon, always use `--platform linux/amd64`
   ```bash
   docker inspect <image> --format '{{.Architecture}}'
   ```

2. **Check logs:**
   ```bash
   # Event logs
   aws logs get-log-events \
     --log-group-name "/aws/apprunner/longhealth-api/<service-id>/service" \
     --log-stream-name "events" \
     --region us-east-2 --query 'events[].message' --output json
   ```

### Database Connection Issues

- Neon free tier auto-suspends after 5min idle — first connection takes 3-5s to wake
- Connection timeout is set to 10s to accommodate this
- SSL is required: `ssl: { rejectUnauthorized: false }` is configured in `database.ts`

### CORS Errors

Update `CORS_ORIGIN` env var on backend to match the exact frontend URL (include `https://`, no trailing slash). This requires an `update-service` call to App Runner.

### Redis Connection Issues

- Upstash requires TLS — URL must start with `rediss://` (double s)
- BullMQ settings `maxRetriesPerRequest: null` and `enableReadyCheck: false` are already configured

---

## Adding S3 for PDF Upload

When ready to enable file uploads:

1. Create S3 bucket in `us-east-2`
2. Create IAM user with S3 access to that bucket
3. Update backend App Runner env vars:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `S3_BUCKET`
4. Redeploy backend

---

## Scaling Up

When the app outgrows the current setup:

| Change | When | Cost Impact |
|--------|------|-------------|
| App Runner 1 vCPU / 2GB | Need more performance | ~$15-25/month |
| Neon Pro | Need >0.5GB storage | $19/month |
| Upstash Pro | Need >10K commands/day | $10/month |
| Custom domain + CloudFront | Need branded URL | ~$1/month |
| Move to ECS Fargate + RDS | 500+ active users | ~$70+/month |
