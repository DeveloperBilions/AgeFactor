#!/bin/bash

set -e

echo "🚀 Long Health Development Setup"
echo "================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker to continue."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose to continue."
    exit 1
fi

# Start docker-compose
echo -e "\n📦 Starting PostgreSQL and Redis containers..."
cd "$(dirname "$0")/../.."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo -e "\n⏳ Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if pg_isready -h localhost -p 5432 -U longhealth &> /dev/null; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    echo "   Attempt $attempt/$max_attempts..."
    sleep 1
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ PostgreSQL failed to start within 30 seconds"
    exit 1
fi

# Wait for Redis to be ready
echo -e "\n⏳ Waiting for Redis to be ready..."
max_attempts=10
attempt=1
while [ $attempt -le $max_attempts ]; do
    if redis-cli -h localhost -p 6379 ping &> /dev/null; then
        echo "✅ Redis is ready"
        break
    fi
    echo "   Attempt $attempt/$max_attempts..."
    sleep 1
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Redis failed to start within 10 seconds"
    exit 1
fi

# Run database migrations
echo -e "\n🗄️  Running database migrations..."
cd packages/backend
if [ -d "node_modules" ]; then
    npx node-pg-migrate up
else
    echo "⚠️  Dependencies not installed. Run 'npm install' before running migrations."
fi

# Run seed data
echo -e "\n🌱 Seeding database with biomarker data..."
if [ -f "src/db/seeds/run.ts" ]; then
    npx tsx src/db/seeds/run.ts
else
    echo "⚠️  Seed file not found at src/db/seeds/run.ts. Skipping seed."
fi

echo -e "\n✅ Development setup complete!"
echo -e "\n📋 Connection Info:"
echo "   Database: postgres://longhealth:longhealth_dev@localhost:5432/longhealth_dev"
echo "   Redis:    redis://localhost:6379"
echo -e "\n🚀 To start the backend server, run:"
echo "   cd packages/backend && npm run dev"
echo -e "\n✔️  Ready to develop!"
