#!/bin/bash

# Backend Local Debug Script
# Start backend agent with verbose logging to file

set -e

PROJECT_DIR="/Users/anhquannguyen/Documents/coding-stuff/seedstr-hackathon"
BACKEND_DIR="$PROJECT_DIR/backend"
LOG_DIR="$PROJECT_DIR/logs"
TIMESTAMP=$(date +%s)
LOG_FILE="$LOG_DIR/agent-debug-$TIMESTAMP.log"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

echo "========================================="
echo "Starting Seedstr Agent - Local Debug"
echo "========================================="
echo ""
echo "📁 Project: $PROJECT_DIR"
echo "📁 Backend: $BACKEND_DIR"
echo "📝 Log file: $LOG_FILE"
echo ""
echo "⚙️  Building backend..."
cd "$BACKEND_DIR"
npm run build >> "$LOG_FILE" 2>&1 || {
  echo "❌ Build failed. Check $LOG_FILE"
  exit 1
}

echo "✅ Build successful"
echo ""
echo "🚀 Starting agent with verbose logging..."
echo "   Log file: $LOG_FILE"
echo ""

# Start agent in background with logging
nohup npm run start -- --verbose >> "$LOG_FILE" 2>&1 &
AGENT_PID=$!

echo "✅ Agent started (PID: $AGENT_PID)"
echo ""
echo "📊 Monitoring logs (live):"
echo "   tail -f $LOG_FILE"
echo ""
echo "📋 Last 20 lines:"
sleep 2
tail -20 "$LOG_FILE" || echo "(still initializing...)"
echo ""
echo "🔗 Log file path: $LOG_FILE"
