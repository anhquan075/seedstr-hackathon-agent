#!/bin/bash
# Quick Environment Variable Setup for Railway
# Run this script to set all variables at once

echo "🔧 Setting Railway Environment Variables"
echo "========================================"
echo ""

# Read from .env file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

# Extract values
SEEDSTR_API_KEY=$(grep "^SEEDSTR_API_KEY=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
AGENT_ID=$(grep "^AGENT_ID=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
OPENROUTER_API_KEY=$(grep "^OPENROUTER_API_KEY=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")

# Use default AGENT_ID if not in .env
if [ -z "$AGENT_ID" ]; then
    AGENT_ID="cmmapode3000073qtvyb4g67r"
fi

# Validate
if [ -z "$SEEDSTR_API_KEY" ]; then
    echo "❌ Error: SEEDSTR_API_KEY not found in .env"
    exit 1
fi

if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "❌ Error: OPENROUTER_API_KEY not found in .env"
    exit 1
fi

echo "✓ Found all required values"
echo ""
echo "Setting variables in Railway..."
echo ""

# Set in Railway
railway variables set SEEDSTR_API_KEY="$SEEDSTR_API_KEY"
if [ $? -eq 0 ]; then
    echo "✓ SEEDSTR_API_KEY set"
else
    echo "❌ Failed to set SEEDSTR_API_KEY"
    exit 1
fi

railway variables set AGENT_ID="$AGENT_ID"
if [ $? -eq 0 ]; then
    echo "✓ AGENT_ID set"
else
    echo "❌ Failed to set AGENT_ID"
    exit 1
fi

railway variables set OPENROUTER_API_KEY="$OPENROUTER_API_KEY"
if [ $? -eq 0 ]; then
    echo "✓ OPENROUTER_API_KEY set"
else
    echo "❌ Failed to set OPENROUTER_API_KEY"
    exit 1
fi

echo ""
echo "✅ All environment variables set successfully!"
echo ""
echo "Verifying..."
railway variables

echo ""
echo "✅ Ready for deployment!"
echo ""
echo "Next step: railway up"
