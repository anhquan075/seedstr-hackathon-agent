#!/bin/bash
# Run the distributed job leases migration on Railway Postgres
# Usage: ./run-migration-railway.sh

set -e

echo "🚀 Running Distributed Job Leases Migration on Railway"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

echo "1️⃣  Authenticating with Railway..."
railway login --skip-email-prompt 2>/dev/null || true

echo ""
echo "2️⃣  Linking to project..."
railway link

echo ""
echo "3️⃣  Extracting DATABASE_URL..."
export DATABASE_URL=$(railway variables get DATABASE_URL)

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Failed to get DATABASE_URL from Railway"
    exit 1
fi

echo "✅ DATABASE_URL retrieved"
echo ""
echo "4️⃣  Running migration script..."
echo ""

node run-migration.js

echo ""
echo "✅ Migration pipeline complete!"
echo ""
echo "Next: Restart your Railway app or wait for auto-deploy"
echo "Then monitor logs for: [Orchestrator] Heartbeat sent for X in-flight jobs"
