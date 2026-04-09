#!/bin/bash
set -e

echo "=== Long Health Backend Build ==="

# Navigate to monorepo root for workspace resolution
cd ../..

echo "Installing dependencies..."
npm install --workspace=packages/backend --workspace=packages/shared

echo "Building TypeScript..."
cd packages/backend
npm run build

echo "Running database migrations..."
npm run migrate:up

echo "Seeding reference data..."
npm run seed

echo "=== Backend build complete ==="
