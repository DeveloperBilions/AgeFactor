#!/bin/bash

set -e

echo "🔄 Long Health Database Reset"
echo "============================="

# Check if Docker containers are running
if ! docker ps | grep -q longhealth-postgres; then
    echo "❌ PostgreSQL container is not running. Start it with 'docker-compose up -d'"
    exit 1
fi

echo "⚠️  This will drop and recreate the development database."
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo -e "\n🗑️  Dropping database..."
docker-compose exec -T postgres dropdb -U longhealth longhealth_dev --if-exists

echo "📦 Creating database..."
docker-compose exec -T postgres createdb -U longhealth longhealth_dev

echo -e "\n🚀 Running migrations..."
cd "$(dirname "$0")/../"
npx node-pg-migrate up

echo -e "\n🌱 Seeding database..."
if [ -f "src/db/seeds/run.ts" ]; then
    npx tsx src/db/seeds/run.ts
else
    echo "⚠️  Seed file not found at src/db/seeds/run.ts"
fi

echo -e "\n✅ Database reset complete!"
