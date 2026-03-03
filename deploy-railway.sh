#!/bin/bash
# Railway Deployment Script for Seedstr Agent
# This script will guide you through deploying your agent to Railway

set -e

echo "🚀 Railway Deployment Helper for Seedstr Agent"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check Railway CLI
echo -e "${BLUE}Step 1: Checking Railway CLI...${NC}"
if command -v railway &> /dev/null; then
    echo -e "${GREEN}✓ Railway CLI installed${NC}"
    railway --version
else
    echo -e "${RED}✗ Railway CLI not found${NC}"
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi
echo ""

# Step 2: Login to Railway
echo -e "${BLUE}Step 2: Login to Railway${NC}"
echo "This will open your browser to authenticate..."
echo "Press ENTER to continue..."
read
railway login

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully logged in to Railway${NC}"
else
    echo -e "${RED}✗ Login failed. Please try again.${NC}"
    exit 1
fi
echo ""

# Step 3: Initialize project
echo -e "${BLUE}Step 3: Initialize Railway Project${NC}"
echo "Select: 'Create new project'"
echo "Name it: 'seedstr-hackathon-agent'"
echo ""
echo "Press ENTER to continue..."
read
railway init

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Project initialized${NC}"
else
    echo -e "${RED}✗ Failed to initialize project${NC}"
    exit 1
fi
echo ""

# Step 4: Set environment variables
echo -e "${BLUE}Step 4: Set Environment Variables${NC}"
echo "You'll need to provide three environment variables:"
echo "  1. SEEDSTR_API_KEY"
echo "  2. AGENT_ID (default: cmmapode3000073qtvyb4g67r)"
echo "  3. OPENROUTER_API_KEY"
echo ""

# Check if .env exists and suggest values
if [ -f .env ]; then
    echo -e "${YELLOW}Found .env file. Here are your current values (masked):${NC}"
    grep -E "^(SEEDSTR_API_KEY|AGENT_ID|OPENROUTER_API_KEY)" .env | sed 's/\(=\).*/\1***/' || true
    echo ""
fi

echo "Enter SEEDSTR_API_KEY:"
read SEEDSTR_API_KEY
railway variables set SEEDSTR_API_KEY="$SEEDSTR_API_KEY"

echo "Enter AGENT_ID (press ENTER for default: cmmapode3000073qtvyb4g67r):"
read AGENT_ID
if [ -z "$AGENT_ID" ]; then
    AGENT_ID="cmmapode3000073qtvyb4g67r"
fi
railway variables set AGENT_ID="$AGENT_ID"

echo "Enter OPENROUTER_API_KEY:"
read OPENROUTER_API_KEY
railway variables set OPENROUTER_API_KEY="$OPENROUTER_API_KEY"

echo -e "${GREEN}✓ Environment variables set${NC}"
echo ""

# Verify variables
echo "Verifying variables..."
railway variables
echo ""

# Step 5: Deploy
echo -e "${BLUE}Step 5: Deploy to Railway${NC}"
echo "This will build and deploy your agent..."
echo "Build time: ~2-3 minutes"
echo ""
echo "Press ENTER to start deployment..."
read

railway up

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Deployment successful!${NC}"
    echo ""
    echo "🎉 Your agent is now running on Railway!"
    echo ""
    echo "Next steps:"
    echo "  • View logs: railway logs --follow"
    echo "  • Check status: railway status"
    echo "  • Open dashboard: railway open"
    echo ""
    echo "Expected log output:"
    echo "  ✓ Agent initialized"
    echo "  ✓ Polling for jobs every 120000ms"
    echo "  ✓ Ready to process jobs"
    echo ""
    echo "Hackathon dates: March 6-10, 2026"
    echo "Your agent will run 24/7 on Railway (FREE)"
    echo ""
    echo -e "${GREEN}Ready to win! 🏆${NC}"
else
    echo ""
    echo -e "${RED}✗ Deployment failed${NC}"
    echo "Check the error messages above."
    echo "Common issues:"
    echo "  • Missing environment variables"
    echo "  • Docker build error"
    echo "  • Network connectivity"
    echo ""
    echo "Try: railway logs --tail 50"
    exit 1
fi
