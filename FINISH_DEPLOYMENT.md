# 🎯 FINAL DEPLOYMENT STEPS - Environment Variables

Your Railway project is created and building!

**Project URL:** https://railway.com/project/845bbcc7-aee6-43b5-a379-964641f0483d

---

## 📋 What You Need To Do Now

The build is in progress, but the agent needs 3 environment variables to run properly.

### Method 1: Set Variables via Railway Dashboard (Easiest) ⭐

The dashboard should be open in your browser. If not, open:
https://railway.com/project/845bbcc7-aee6-43b5-a379-964641f0483d

**Steps:**
1. Click on your service (it might show as "seedstr-hackathon-agent")
2. Go to the **"Variables"** tab
3. Click **"+ New Variable"**
4. Add these 3 variables one by one:

```
Variable 1:
  Name: SEEDSTR_API_KEY
  Value: [paste your value from .env file]

Variable 2:
  Name: AGENT_ID
  Value: cmmapode3000073qtvyb4g67r

Variable 3:
  Name: OPENROUTER_API_KEY
  Value: [paste your value from .env file]
```

5. Click **"Deploy"** or it will auto-redeploy

### Method 2: Set Variables via Terminal (Alternative)

In your terminal, run these commands (replace YOUR_VALUE with actual values from your `.env`):

```bash
# First, view your current .env values
cat .env | grep -E "SEEDSTR_API_KEY|OPENROUTER_API_KEY"

# Then set them in Railway (replace YOUR_VALUE)
railway variables set SEEDSTR_API_KEY="YOUR_SEEDSTR_KEY_HERE"
railway variables set AGENT_ID="cmmapode3000073qtvyb4g67r"
railway variables set OPENROUTER_API_KEY="YOUR_OPENROUTER_KEY_HERE"
```

---

## ✅ How to Verify It's Working

After setting the variables and redeploying:

### Check Logs (Terminal)
```bash
railway logs --tail 50
```

**Should see:**
```
✓ Agent initialized
✓ Polling for jobs every 120000ms
✓ Ready to process jobs
```

### Check Dashboard (Browser)
Go to: https://railway.com/project/845bbcc7-aee6-43b5-a379-964641f0483d

**Should see:**
- Status: 🟢 Running
- No errors in logs
- Memory: ~200-400MB

---

## 🚨 Troubleshooting

### Build succeeds but agent crashes
- **Cause:** Missing environment variables
- **Fix:** Set all 3 variables via dashboard

### Can't see service in dashboard
- **Cause:** Build might still be in progress
- **Fix:** Wait 2-3 minutes, refresh page

### Variables not saving
- **Cause:** Not linked to correct service
- **Fix:** Make sure you're on the service page, not project page

---

## 📊 What Happens Next

Once environment variables are set:

1. **Railway auto-redeploys** (takes ~2 minutes)
2. **Agent starts** and begins polling Seedstr
3. **Polls every 2 minutes** for new jobs
4. **Processes up to 3 jobs** in parallel
5. **Runs 24/7** until hackathon ends

---

## 🎉 Success Checklist

- [ ] Railway dashboard shows service is Running
- [ ] Logs show "Polling for jobs every 120000ms"
- [ ] No error messages in logs
- [ ] Seedstr.io shows agent as ACTIVE
- [ ] Memory usage is reasonable (~200-400MB)

---

## 🆘 Need Help?

### Check Current Status
```bash
railway status
railway logs --tail 100
```

### Redeploy After Setting Variables
```bash
railway up --detach
```

### Restart Service
```bash
railway restart
```

---

## 📞 Quick Commands Reference

```bash
# View logs (live)
railway logs --follow

# Check status
railway status

# Open dashboard
railway open

# List all variables
railway variables

# Restart service
railway restart
```

---

## 🎯 Your Next Action

1. **Go to Railway dashboard** (should be open in browser)
2. **Click on your service**
3. **Go to Variables tab**
4. **Add the 3 environment variables**
5. **Wait for auto-redeploy** (~2 minutes)
6. **Check logs:** `railway logs --follow`

---

**Dashboard URL:** https://railway.com/project/845bbcc7-aee6-43b5-a379-964641f0483d

**Once variables are set, your agent will be live 24/7 for the hackathon!** 🚀

Good luck! 🏆
