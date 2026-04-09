#!/bin/bash
set -e

echo "=== Long Health Web Build ==="

# Navigate to monorepo root for workspace resolution
cd ../..

echo "Installing dependencies..."
npm install --workspace=packages/web

echo "Building Next.js..."
cd packages/web
npm run build

echo "=== Web build complete ==="
