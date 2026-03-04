#!/bin/bash

# Configuration
URL="https://seedstr-hackathon-agent-production-ff74.up.railway.app"
LOG_FILE="health_monitor.log"
ALERT_EMAIL="admin@example.com" # Placeholder

# Timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Check Health Endpoint
HEALTH_RESPONSE=$(curl -s "${URL}/health")
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${URL}/health")

# Check Dashboard Endpoint
DASHBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${URL}/")

# Parse JSON (requires jq)
if command -v jq &> /dev/null; then
  STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status')
  UPTIME=$(echo "$HEALTH_RESPONSE" | jq -r '.uptime')
  CLIENTS=$(echo "$HEALTH_RESPONSE" | jq -r '.clients')
else
  STATUS="unknown (jq missing)"
  UPTIME="unknown"
  CLIENTS="unknown"
fi

# Logging
echo "[$TIMESTAMP] Health: $HTTP_STATUS ($STATUS) | Dashboard: $DASHBOARD_STATUS | Uptime: ${UPTIME}s | Clients: $CLIENTS" >> "$LOG_FILE"

# Alerting Logic
if [ "$HTTP_STATUS" -ne 200 ] || [ "$STATUS" != "ok" ]; then
  echo "[$TIMESTAMP] ALERT: Health check failed! Status: $HTTP_STATUS, Body: $HEALTH_RESPONSE" >> "$LOG_FILE"
  # In a real scenario, send email or Slack notification here
fi

if [ "$DASHBOARD_STATUS" -ne 200 ]; then
  echo "[$TIMESTAMP] ALERT: Dashboard check failed! Status: $DASHBOARD_STATUS" >> "$LOG_FILE"
fi
