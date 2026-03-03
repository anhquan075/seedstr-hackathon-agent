# 🚀 Railway Deployment Guide - Seedstr Hackathon Agent

Deploy your Seedstr agent to Railway for 24/7 operation during the hackathon (March 6-10, 2026).

---

## 📋 Prerequisites

- Railway account (sign up at [railway.app](https://railway.app))
- GitHub repository connected to Railway
- Environment variables ready (from your `.env` file)

---

## 🎯 Quick Deploy (5 minutes)

### Step 1: Install Railway CLI

```bash
# macOS/Linux
brew install railway

# Or use npm
npm install -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

This opens your browser to authenticate.

### Step 3: Initialize Project

```bash
# From your project directory
railway init

# Select: "Create new project"
# Name it: "seedstr-hackathon-agent"
```

### Step 4: Set Environment Variables

```bash
# Set all required environment variables
railway variables set SEEDSTR_API_KEY="your_seedstr_api_key"
railway variables set AGENT_ID="cmmapode3000073qtvyb4g67r"
railway variables set OPENROUTER_API_KEY="your_openrouter_api_key"

# Optional: Set custom poll interval (default: 120000ms = 2 minutes)
railway variables set POLL_INTERVAL="120000"
```

**Or use Railway Dashboard:**
1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Select your project
3. Go to "Variables" tab
4. Add each variable manually

### Step 5: Deploy

```bash
railway up
```

This will:
- Build Docker image (multi-stage for optimal size)
- Push to Railway
- Deploy and start the agent
- Show deployment URL and logs

### Step 6: Verify Deployment

```bash
# View logs
railway logs

# You should see:
# ✓ Agent initialized
# ✓ Polling for jobs every 2 minutes
# ✓ Ready to process jobs
```

---

## 📊 Railway Dashboard

### Monitor Your Agent

1. **Logs:** Real-time logs at `railway.app/project/your-project/logs`
2. **Metrics:** CPU/Memory usage at `railway.app/project/your-project/metrics`
3. **Deployments:** Deployment history at `railway.app/project/your-project/deployments`

### Check Agent Status

```bash
# View recent logs
railway logs --tail 100

# Follow live logs
railway logs --follow
```

---

## 🔧 Configuration

### Dockerfile (Multi-stage Build)

```dockerfile
# Stage 1: Build TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm run agent:build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
CMD ["npm", "run", "agent:start"]
```

**Benefits:**
- Small image size (~150MB vs 1GB+)
- Only production dependencies in final image
- Fast deployments (~2 minutes)

### railway.toml

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "npm run agent:start"
restartPolicyType = "always"
restartPolicyMaxRetries = 10
```

**Features:**
- Auto-restart on crashes (up to 10 retries)
- Uses Dockerfile for build
- Runs agent:start command

---

## 💰 Cost

**Railway Free Tier:**
- $5 free credits per month
- ~500 hours of runtime (more than enough for 5-day hackathon)
- No credit card required for free tier

**For Hackathon (March 6-10):**
- 5 days × 24 hours = 120 hours
- **Cost: FREE** (well within free tier)

**After Hackathon (if you want to keep it running):**
- ~$5/month for 24/7 operation
- Can upgrade to Hobby plan ($5/month) or Pro ($20/month)

---

## 🛠️ Troubleshooting

### Agent Not Starting

**Check logs:**
```bash
railway logs --tail 50
```

**Common issues:**
- Missing environment variables → Add them via `railway variables set`
- Build failed → Check Dockerfile syntax
- Node version mismatch → Using node:20-alpine in Dockerfile

### Agent Crashing

**Check restart policy:**
```bash
railway logs | grep "restart"
```

Railway auto-restarts up to 10 times. If it keeps crashing:
1. Check environment variables are correct
2. Test locally first: `npm run agent:build && npm run agent:start`
3. Check Railway logs for error messages

### Not Receiving Jobs

**Verify configuration:**
```bash
# Check environment variables
railway variables

# Should show:
# SEEDSTR_API_KEY=***
# AGENT_ID=cmmapode3000073qtvyb4g67r
# OPENROUTER_API_KEY=***
```

**Check Seedstr registration:**
1. Go to seedstr.io
2. Verify agent is registered
3. Check agent status is "ACTIVE"

### High Memory Usage

**Monitor metrics:**
```bash
railway status
```

If memory > 512MB:
- Check for memory leaks in logs
- Reduce MAX_CONCURRENT_JOBS (currently 3)
- Upgrade to larger Railway instance

---

## 🔄 Updates & Redeployment

### Deploy Code Changes

```bash
# Option 1: Push to GitHub (auto-deploys if connected)
git push origin main

# Option 2: Deploy directly via CLI
railway up
```

### Rollback Deployment

```bash
# List deployments
railway deployments

# Rollback to previous deployment
railway rollback <deployment-id>
```

### Update Environment Variables

```bash
# Update a variable
railway variables set POLL_INTERVAL="60000"

# Delete a variable
railway variables delete SOME_VAR

# View all variables
railway variables
```

---

## 📈 Monitoring During Hackathon

### Daily Checklist

**Morning (9 AM):**
```bash
railway logs --tail 100
# Check: Jobs processed in last 24h
# Check: No error spikes
```

**Evening (9 PM):**
```bash
railway status
# Check: Memory < 400MB
# Check: CPU < 50%
# Check: Uptime 100%
```

### Key Metrics to Watch

**Logs:**
```bash
railway logs | grep "Job completed"
# Should see: Completed jobs throughout the day
```

**Errors:**
```bash
railway logs | grep "ERROR"
# Should see: Minimal errors (only API rate limits expected)
```

**Performance:**
```bash
railway status
# Memory: < 512MB
# CPU: < 50%
# Restarts: 0
```

---

## 🎯 Production Checklist

### Pre-Deployment
- [ ] Build passes locally: `npm run agent:build`
- [ ] Agent runs locally: `npm run agent:start`
- [ ] All environment variables set in Railway
- [ ] Dockerfile tested: `docker build -t test .`
- [ ] Railway CLI installed and authenticated

### Post-Deployment
- [ ] Agent logs show "Polling for jobs"
- [ ] No error messages in logs
- [ ] Memory usage < 300MB
- [ ] CPU usage < 30%
- [ ] Test job submission on Seedstr

### During Hackathon
- [ ] Check logs 2x per day (morning/evening)
- [ ] Monitor Seedstr dashboard for submissions
- [ ] Keep Railway dashboard open for real-time metrics
- [ ] Have phone notifications enabled for Railway (in settings)

---

## 🚨 Emergency Procedures

### Agent Down

```bash
# Check status
railway status

# View recent logs
railway logs --tail 50

# Restart manually
railway restart
```

### Out of Memory

```bash
# Reduce concurrent jobs
railway variables set MAX_CONCURRENT_JOBS="2"

# Restart
railway restart
```

### API Rate Limited

```bash
# Increase poll interval (slower polling = fewer API calls)
railway variables set POLL_INTERVAL="180000"  # 3 minutes instead of 2

# Restart
railway restart
```

---

## 📞 Support

**Railway Issues:**
- Railway docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)

**Agent Issues:**
- Check logs: `railway logs --follow`
- Test locally: `npm run agent:build && npm run agent:start`
- Verify environment variables: `railway variables`

---

## 🎉 Success Criteria

Your agent is successfully deployed when:

✅ Railway dashboard shows "Running"  
✅ Logs show "Polling for jobs every X minutes"  
✅ No error messages in logs  
✅ Memory usage < 400MB  
✅ CPU usage < 50%  
✅ Seedstr dashboard shows agent as "ACTIVE"  
✅ Test job submission processes successfully  

---

## 🏆 Ready for Hackathon

**Agent Status:** 🟢 DEPLOYED  
**Platform:** Railway  
**Uptime:** 24/7  
**Cost:** FREE (within free tier)  
**Monitoring:** Real-time logs + metrics  

**Hackathon Dates:** March 6-10, 2026  
**Your Agent ID:** `cmmapode3000073qtvyb4g67r`  

Let's win this! 💪

---

## 📝 Quick Reference Commands

```bash
# Deploy
railway up

# View logs
railway logs --follow

# Check status
railway status

# Update env var
railway variables set KEY="value"

# Restart
railway restart

# Rollback
railway rollback

# Open dashboard
railway open
```

---

**Last Updated:** March 3, 2026  
**Deploy Time:** ~5 minutes  
**Ready:** ✅ YES
