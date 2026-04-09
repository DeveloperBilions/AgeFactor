# Long Health

AI-powered blood report analysis platform that uses Claude AI to interpret health metrics and provide personalized health insights.

## Prerequisites

Before you begin, ensure you have installed:
- **Node.js** >= 18 (download from [nodejs.org](https://nodejs.org/))
- **Docker & Docker Compose** (download from [docker.com](https://www.docker.com/products/docker-desktop))
- **npm** >= 9 (comes with Node.js)

Verify installation:
```bash
node --version   # Should be >= 18
npm --version    # Should be >= 9
docker --version
docker-compose --version
```

## Quick Start (5 Steps)

### 1. Navigate to project directory
```bash
cd /path/to/Long\ Health/app
```

### 2. Start PostgreSQL and Redis
```bash
docker-compose up -d
```

This starts two containers:
- **PostgreSQL** (port 5432) - for storing users, reports, and analysis
- **Redis** (port 6379) - for caching and job queue

### 3. Install backend dependencies
```bash
cd packages/backend
npm install
```

### 4. Run database setup
```bash
chmod +x scripts/*.sh
./scripts/dev-setup.sh
```

This script:
- Waits for PostgreSQL and Redis to be ready
- Runs database migrations
- Seeds biomarker reference data
- Prints connection info

### 5. Start the development server
```bash
npm run dev
```

The backend API is now running at **http://localhost:3001**

## Verify Setup Works

### Health Check
```bash
curl http://localhost:3001/health
# Response: { "status": "ok" }
```

### Run API Test Suite
```bash
bash scripts/test-api.sh
```

This shows example curl commands for all major endpoints.

## Project Structure

```
Long Health/app/
├── docker-compose.yml              # PostgreSQL + Redis containers
├── packages/
│   ├── backend/                    # Express + TypeScript API server
│   │   ├── src/
│   │   │   ├── config/             # Environment, database, Redis, S3 config
│   │   │   ├── middleware/         # Authentication, validation, error handling
│   │   │   ├── modules/
│   │   │   │   ├── auth/           # Phone OTP + JWT token auth
│   │   │   │   ├── reports/        # PDF upload, OCR extraction, storage
│   │   │   │   ├── analysis/       # Claude AI analysis engine, cached results
│   │   │   │   └── dashboard/      # Health summary API, trend calculations
│   │   │   ├── db/
│   │   │   │   ├── migrations/     # Database schema versions
│   │   │   │   └── seeds/          # Biomarker reference data
│   │   │   └── jobs/               # BullMQ report processor queue
│   │   ├── scripts/
│   │   │   ├── dev-setup.sh        # One-time dev setup (migrations + seeds)
│   │   │   ├── dev-reset.sh        # Reset database for testing
│   │   │   └── test-api.sh         # API test examples
│   │   ├── .env                    # Development configuration
│   │   └── package.json
│   ├── shared/                     # TypeScript types & constants
│   │   ├── types/                  # Shared types (User, Report, Biomarker, etc)
│   │   └── constants/              # App-wide constants
│   ├── web/                        # Next.js frontend (coming soon)
│   └── mobile/                     # React Native app (coming soon)
└── docs/                           # Architecture documentation
    ├── ARCHITECTURE.md             # System design & data flow
    ├── DATABASE.md                 # Schema and relationships
    ├── API.md                      # API endpoint reference
    └── DEPLOYMENT.md               # Production deployment guide
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| **POST** | `/api/v1/auth/send-otp` | Send OTP to phone | No |
| **POST** | `/api/v1/auth/verify-otp` | Verify OTP & get JWT token | No |
| **GET** | `/api/v1/auth/me` | Get current user profile | Yes |
| **PUT** | `/api/v1/auth/profile` | Update user profile | Yes |
| **POST** | `/api/v1/reports/upload` | Upload blood report PDF | Yes |
| **GET** | `/api/v1/reports` | List user's reports (paginated) | Yes |
| **GET** | `/api/v1/reports/:id` | Get report details | Yes |
| **GET** | `/api/v1/reports/:id/analysis` | Get Claude AI analysis | Yes |
| **GET** | `/api/v1/dashboard` | Get health dashboard summary | Yes |

See **docs/API.md** for detailed endpoint documentation.

## Environment Variables

The `.env` file contains all configuration:

```bash
# Application
NODE_ENV=development              # development, staging, production
PORT=3001                         # API port
API_PREFIX=/api/v1               # API route prefix

# Database
DATABASE_URL=postgres://...       # PostgreSQL connection string

# Cache & Jobs
REDIS_URL=redis://...            # Redis connection string

# Authentication
JWT_SECRET=...                   # Secret for signing tokens
JWT_EXPIRES_IN=7d                # Token validity period
REFRESH_TOKEN_EXPIRES_IN=30d

# OTP
OTP_EXPIRY_SECONDS=300           # 5 minutes
OTP_MAX_ATTEMPTS=3               # Failed verify attempts before lockout
OTP_RATE_LIMIT_PER_HOUR=10       # Max OTPs per phone per hour

# Claude API (required)
ANTHROPIC_API_KEY=...            # Your API key
CLAUDE_MODEL=claude-sonnet-4-20250514

# AWS S3 (optional, dev uses local storage)
AWS_REGION=ap-south-1
AWS_S3_BUCKET=longhealth-dev
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# SMS (optional, dev logs OTP to console)
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=

# Monitoring
SENTRY_DSN=                      # Error tracking (optional)
LOG_LEVEL=debug                  # debug, info, warn, error
CORS_ORIGIN=*                    # CORS allowed origins
```

## Development Commands

### Server
```bash
npm run dev              # Start with hot-reload (uses tsx)
npm run build           # Compile TypeScript to JavaScript
npm start               # Run compiled server
```

### Database
```bash
npm run migrate:up      # Run pending migrations
npm run migrate:down    # Rollback last migration
npm run seed            # Seed biomarker reference data
```

### Testing
```bash
npm test                # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
```

### Code Quality
```bash
npm run lint            # Check for linting errors
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
```

## Database Management

### Reset Development Database
Useful when you need a clean slate:
```bash
./scripts/dev-reset.sh
```

This will:
1. Drop the existing database
2. Create a fresh database
3. Run all migrations
4. Seed reference data

### View Database
Connect with any PostgreSQL client:
```bash
# Using psql command line
psql postgres://longhealth:longhealth_dev@localhost:5432/longhealth_dev

# Or use a GUI like DBeaver, pgAdmin
```

### Redis Operations
```bash
# Connect to Redis
redis-cli -h localhost -p 6379

# Check connection
redis-cli ping

# View keys
redis-cli KEYS '*'

# Clear cache
redis-cli FLUSHDB
```

## Adding Your Anthropic API Key

The Claude API integration requires your own API key for development:

### 1. Get Your API Key
- Go to [console.anthropic.com](https://console.anthropic.com/)
- Sign in or create an account
- Navigate to API Keys section
- Create a new API key
- Copy the key

### 2. Set the Key
Edit `.env` in `packages/backend/`:
```bash
ANTHROPIC_API_KEY=sk-ant-xxxxx...  # Paste your actual key here
```

### 3. Verify It Works
```bash
# After starting the server, test AI analysis
curl -X GET http://localhost:3001/api/v1/reports/:reportId/analysis \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Docker Commands

### View Running Containers
```bash
docker ps
```

### View Logs
```bash
# PostgreSQL logs
docker logs longhealth-postgres

# Redis logs
docker logs longhealth-redis
```

### Stop Containers
```bash
docker-compose down
```

### Stop & Remove All Data
```bash
docker-compose down -v
```

## Troubleshooting

### Port Already in Use
If port 3001, 5432, or 6379 is already in use:

```bash
# Find process using port
lsof -i :3001

# Kill process (macOS/Linux)
kill -9 <PID>

# Or change port in .env
PORT=3002
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
docker ps | grep longhealth-postgres

# Check logs
docker logs longhealth-postgres

# Reset everything
docker-compose down -v
docker-compose up -d
./scripts/dev-setup.sh
```

### Redis Connection Failed
```bash
# Check Redis is running
docker ps | grep longhealth-redis

# Test connection
redis-cli -h localhost -p 6379 ping

# Restart Redis
docker-compose restart redis
```

### Migrations Failed
```bash
# Check migration files
ls packages/backend/src/db/migrations/

# Run migrations with details
npx node-pg-migrate up --verbose

# Reset and retry
./scripts/dev-reset.sh
```

## Architecture Overview

**Long Health** uses a modular architecture:

- **Auth Module**: Phone OTP verification with JWT tokens
- **Reports Module**: PDF upload with OCR text extraction
- **Analysis Module**: Claude AI integration for health insights
- **Dashboard Module**: Aggregated health metrics and trends

See **docs/ARCHITECTURE.md** for detailed design documentation.

## Tech Stack

**Backend:**
- **Express.js** - Web framework
- **TypeScript** - Type-safe JavaScript
- **PostgreSQL** - Primary database
- **Redis** - Caching & job queue
- **BullMQ** - Job processing
- **Anthropic Claude API** - AI analysis

**Development:**
- **tsx** - TypeScript execution
- **node-pg-migrate** - Database migrations
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Deployment

For production deployment, see **docs/DEPLOYMENT.md** for:
- Environment configuration
- Database setup
- Cloud storage (AWS S3)
- SMS gateway integration
- Error tracking (Sentry)
- Monitoring & logging

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Commit with clear messages: `git commit -m "feat: add feature"`
4. Push to remote: `git push origin feature/your-feature`
5. Create a pull request

## Support

For issues or questions:
1. Check existing documentation in `docs/`
2. Review API examples in `scripts/test-api.sh`
3. Check server logs: `docker logs longhealth-postgres`
4. Open an issue with detailed error messages

## License

Proprietary - Long Health Platform
