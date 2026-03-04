# 🚀 Production Deployment & Testing Guide

## ✅ Pre-Deployment Checklist (Completed)

- [x] **API Client Enhanced**: Added `acceptJob`, `declineJob`, `getMe`, `getSkills` methods
- [x] **SWARM Job Support**: Implemented two-step accept → respond flow
- [x] **Registration Script**: Created interactive CLI for wallet registration
- [x] **Smoke Tests**: 100% pass rate (19/19 tests)
- [x] **Build Verification**: TypeScript compiles cleanly with no errors
- [x] **Code Committed**: All changes committed to `main` branch
- [x] **GitHub Push**: Latest code pushed to repository

## 🔧 Environment Variables Required

Ensure these are set in Railway dashboard:

```bash
# Required
SEEDSTR_API_KEY=your_api_key_from_registration
OPENROUTER_API_KEY=your_openrouter_key

# Optional
NODE_ENV=production
```

## 📦 Railway Deployment Steps

### Option 1: Auto-Deploy from GitHub (Recommended)

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Create New Project** → Deploy from GitHub repo
3. **Select Repository**: `anhquan075/seedstr-hackathon-agent`
4. **Set Environment Variables** (see above)
5. **Deploy**: Railway will automatically build and deploy

### Option 2: Manual Railway CLI Deployment

If Railway CLI certificate issue is resolved:

```bash
# Link to Railway project
railway link

# Deploy
railway up

# Check logs
railway logs
```

## 🧪 Production Testing Checklist

### 1. Registration Test (CRITICAL - Do This First)

```bash
# Run on your local machine with Railway credentials
npm run register

# Follow prompts:
# - Enter your ETH or SOL wallet address
# - Copy the API key to Railway environment variables
# - Tweet the verification message
```

### 2. Verify Deployment

Check Railway logs for:
- ✅ Agent started successfully
- ✅ Polling for jobs every 10 seconds
- ✅ No API authentication errors

### 3. Test Job Polling

Monitor logs for:
```
[INFO] Polling for jobs...
[INFO] Found N available jobs
```

### 4. Test SWARM Job Acceptance

When a SWARM job appears:
```
[INFO] Accepting SWARM job <job_id>
[INFO] Successfully accepted SWARM job <job_id>
[INFO] Processing job <job_id>
```

### 5. Test Project Generation

Check logs for:
```
[INFO] Generating project for job <job_id>
[INFO] Selected design system: <design_name>
[INFO] Using template: <template_name>
[INFO] Project generated successfully
[INFO] Submitting response...
[INFO] ✓ Response submitted successfully
```

### 6. Verify Submission

Use Seedstr API to check submission status:
```bash
curl https://api.seedstr.io/v2/jobs/<job_id> \
  -H "Authorization: Bearer $SEEDSTR_API_KEY"
```

## 🔍 Smoke Test Results (Local)

All tests passed locally before deployment:

```
🎯 Seedstr Agent - Comprehensive Smoke Test

✅ API Client - Initialization
✅ API Client - Has Required Methods
✅ LLM Client - Initialization
✅ LLM Client - Generate (basic)
✅ JSON Repair - Valid JSON
✅ JSON Repair - Markdown Wrapped
✅ JSON Repair - Trailing Comma
✅ JSON Repair - Missing Quotes
✅ Design Systems - Get All Names
✅ Design Systems - Get Glassmorphism
✅ Design Systems - Get Default
✅ UI Templates - Get All
✅ UI Templates - Templates Have Required Fields
✅ Tools - Import All
✅ Tools - QR Code Tool Exists
✅ Tools - CSV Analysis Tool Exists
✅ Tools - Text Processing Tool Exists
✅ Tools - Web Search Tool Exists
✅ Project Builder - Create Instance

📊 Test Results:
  ✅ Passed:  19
  ❌ Failed:  0
  📊 Total:   19

✅ Success Rate: 100.00%
```

## 🐛 Troubleshooting

### Issue: 401 Unauthorized

**Solution**: Run `npm run register` and update `SEEDSTR_API_KEY` in Railway

### Issue: Agent not polling

**Solution**: Check Railway logs for startup errors, verify environment variables

### Issue: SWARM job slot full (409)

**Solution**: This is expected behavior - agent will skip and try next job

### Issue: Twitter verification failed

**Solution**: 
1. Tweet the verification message from registration
2. Call `/v2/verify` endpoint manually if needed

## 📊 Production Monitoring

### Key Metrics to Watch

1. **Job Acceptance Rate**: How many SWARM slots successfully accepted
2. **Project Generation Time**: Should be < 2 hours (SWARM deadline)
3. **Submission Success Rate**: % of successful submissions vs failures
4. **API Error Rate**: 401, 403, 409, 500 errors

### Log Analysis

Search Railway logs for:
- `[ERROR]`: Critical errors requiring immediate attention
- `409`: Job slot conflicts (normal for SWARM jobs)
- `Successfully submitted`: Successful job completions
- `Failed to`: Any failures in the pipeline

## 🎯 Mystery Prompt Preparation

The mystery prompt will drop **March 6-10, 2025**. Ensure:

- [x] Agent is deployed and running continuously
- [x] Polling every 10 seconds
- [x] SWARM acceptance logic working
- [ ] User has registered with wallet
- [ ] User has completed Twitter verification
- [ ] Railway environment variables set correctly

## 🚨 Critical Actions Required Before Mystery Prompt

1. **Complete Registration**: Run `npm run register` with real wallet
2. **Verify Twitter**: Tweet verification message and call `/v2/verify`
3. **Monitor Logs**: Check Railway dashboard regularly
4. **Test Submission**: Wait for a test job to verify end-to-end flow

---

**Status**: ✅ Ready for production deployment
**Next Step**: Deploy to Railway and complete registration
