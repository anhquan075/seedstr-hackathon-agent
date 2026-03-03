# 🚀 RAILWAY DEPLOYMENT - STEP BY STEP GUIDE

Follow these commands **in your terminal** to deploy your agent to Railway.

---

## ✅ Prerequisites Check

Railway CLI is installed: ✓
Environment variables ready: ✓

---

## 📝 DEPLOYMENT STEPS

### Step 1: Login to Railway

Open your terminal and run:

```bash
railway login
```

**What happens:**
- Opens your browser to authenticate
- You'll authorize Railway CLI
- Returns to terminal when complete

**Expected output:**
```
✓ Logged in to Railway
```

---

### Step 2: Initialize Project

```bash
railway init
```

**What to do:**
- Select: **"Create new project"**
- Name it: **"seedstr-hackathon-agent"** (or any name you prefer)

**Expected output:**
```
✓ Created project seedstr-hackathon-agent
✓ Linked to project
```

---

### Step 3: Set Environment Variables

You need to set 3 environment variables. Run these commands one by one:

```bash
# Get your values from .env file first
cat .env | grep -E "SEEDSTR_API_KEY|AGENT_ID|OPENROUTER_API_KEY"
```

This shows your current values. Now set them in Railway:

```bash
# Replace YOUR_VALUE_HERE with actual values from .env
railway variables set SEEDSTR_API_KEY="YOUR_SEEDSTR_API_KEY_HERE"

railway variables set AGENT_ID="cmmapode3000073qtvyb4g67r"

railway variables set OPENROUTER_API_KEY="YOUR_OPENROUTER_KEY_HERE"
```

**Verify they're set:**
```bash
railway variables
```

**Expected output:**
```
SEEDSTR_API_KEY=***
AGENT_ID=cmmapode3000073qtvyb4g67r
OPENROUTER_API_KEY=***
```

---

### Step 4: Deploy

```bash
railway up
```

**What happens:**
- Builds Docker image (multi-stage build)
- Pushes to Railway registry
- Deploys and starts container
- Takes ~2-3 minutes

**Expected output:**
```
✓ Build successful
✓ Deployment successful
✓ Service is live
```

---

### Step 5: Verify Deployment

Check the logs to confirm it's running:

```bash
railway logs --tail 50
```

**Expected output:**
```
✓ Agent initialized
✓ Polling for jobs every 120000ms
✓ Ready to process jobs
```

---

## 🎯 QUICK COMMAND SUMMARY

Copy and paste these commands (replacing YOUR_VALUE with actual values):

```bash
# 1. Login
railway login

# 2. Initialize
railway init

# 3. Set variables (edit these with your actual values)
railway variables set SEEDSTR_API_KEY="YOUR_SEEDSTR_API_KEY"
railway variables set AGENT_ID="cmmapode3000073qtvyb4g67r"
railway variables set OPENROUTER_API_KEY="YOUR_OPENROUTER_KEY"

# 4. Deploy
railway up

# 5. Check logs
railway logs --follow
```

---

## 🔍 Monitoring Commands

```bash
# View live logs
railway logs --follow

# Check status
railway status

# Open Railway dashboard in browser
railway open

# Restart if needed
railway restart
```

---

## 🚨 Troubleshooting

### Login fails
```bash
# Try browser-based login
railway login --browserless
```

### Build fails
```bash
# Check logs
railway logs --tail 100

# Common issues:
# - Missing environment variables → Set them again
# - Docker error → Check Dockerfile syntax
```

### Agent not starting
```bash
# Check environment variables
railway variables

# View detailed logs
railway logs --tail 50

# Restart
railway restart
```

---

## ✅ Success Checklist

After deployment, verify:

- [ ] `railway status` shows "Running"
- [ ] `railway logs` shows "Polling for jobs"
- [ ] No errors in logs
- [ ] Railway dashboard shows green status
- [ ] Agent shows as ACTIVE on Seedstr.io

---

## 🎉 You're Done!

Your agent will now run 24/7 on Railway for FREE during the hackathon.

**What's happening now:**
- Agent polls Seedstr every 2 minutes
- Processes up to 3 jobs in parallel
- Auto-selects templates based on keywords
- Submits completed projects

**Hackathon:** March 6-10, 2026
**Cost:** $0 (FREE tier)
**Uptime:** 24/7

---

## 📊 Monitor During Hackathon

**Morning Check (9 AM):**
```bash
railway logs --tail 100 | grep "Job completed"
```

**Evening Check (9 PM):**
```bash
railway status
```

**If issues:**
```bash
railway logs --follow
railway restart
```

---

## 🆘 Need Help?

If you get stuck at any step, run:
```bash
railway --help
```

Or check the logs:
```bash
railway logs --tail 50
```

---

**Ready to deploy? Start with:** `railway login`

Good luck! 🚀
