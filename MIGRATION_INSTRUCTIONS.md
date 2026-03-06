# Running the Distributed Job Leases Migration on Railway

## Overview
The migration adds 4 columns to the `processed_jobs` table to support distributed job lease tracking with automatic crash recovery.

## Option 1: Run via Railway CLI (Recommended)

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Authenticate with Railway
```bash
railway login
```

### Step 3: Connect to your project
```bash
railway link  # Select your seedstr-hackathon-agent project
```

### Step 4: Run the migration script
```bash
# Set the DATABASE_URL from your Railway Postgres
export DATABASE_URL=$(railway variables get DATABASE_URL)

# Run the migration
node run-migration.js
```

Expected output:
```
✅ Migration completed successfully!

Lease columns in processed_jobs table:
┌─────────────────┬─────────────┬────────────┐
│ Column Name     │ Data Type   │ Nullable   │
├─────────────────┼─────────────┼────────────┤
│ claimed_by      │ varchar     │ YES        │
│ claimed_at      │ bigint      │ YES        │
│ lease_expires_at│ bigint      │ YES        │
│ last_heartbeat  │ bigint      │ YES        │
└─────────────────┴─────────────┴────────────┘

✨ MIGRATION COMPLETE ✨
```

---

## Option 2: Manual SQL via Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app)
2. Open your project
3. Click on **Postgres** plugin
4. Click **Data** tab → **Query** button
5. Paste the SQL from `backend/migrations/001-add-distributed-job-leases.sql`
6. Click **Execute**

---

## Option 3: Run on Next App Deployment (Zero Downtime)

The migration **already runs automatically** when the app starts:
- In `backend/src/agent/db.ts`, the `runMigrations()` method executes on app startup
- This is the **safest approach** for production

To trigger it:
1. Make a small commit (or re-push current):
   ```bash
   git commit --allow-empty -m "chore: trigger migration on deployment"
   git push origin main
   ```
2. Railway will auto-redeploy
3. The migration runs automatically during startup

---

## What the Migration Does

```sql
-- Adds 4 new columns to processed_jobs table
ALTER TABLE processed_jobs
ADD COLUMN IF NOT EXISTS claimed_by VARCHAR(255),    -- which instance claimed
ADD COLUMN IF NOT EXISTS claimed_at BIGINT,          -- when claimed (unix ms)
ADD COLUMN IF NOT EXISTS lease_expires_at BIGINT,    -- lease expiration time
ADD COLUMN IF NOT EXISTS last_heartbeat BIGINT;      -- last heartbeat timestamp

-- Creates index for efficient lease expiration queries
CREATE INDEX IF NOT EXISTS idx_lease_expiration ON processed_jobs(lease_expires_at)
WHERE status = 'processing';
```

---

## Verification

After migration completes, verify in the Railway Dashboard:

1. **Check columns exist**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'processed_jobs' 
   AND column_name IN ('claimed_by', 'claimed_at', 'lease_expires_at', 'last_heartbeat');
   ```
   Should return 4 rows.

2. **Check index exists**:
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'processed_jobs' 
   AND indexname = 'idx_lease_expiration';
   ```
   Should return 1 row.

---

## Monitoring After Migration

Once migration is complete and app is running, look for these log messages:

```
[Orchestrator] Heartbeat sent for 3 in-flight jobs          (every 10 seconds)
[Orchestrator] Released 0 expired job leases               (every 60 seconds)
[SeedstrPoller] Claimed job {jobId} via database           (when jobs claimed)
```

These indicate the distributed lease pattern is working correctly.

---

## Troubleshooting

**If migration fails:**

1. Check if columns already exist:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'processed_jobs' 
   LIMIT 20;
   ```

2. Check for locks:
   ```sql
   SELECT * FROM pg_locks WHERE relation = 'processed_jobs'::regclass;
   ```

3. Check if table exists:
   ```sql
   SELECT EXISTS (SELECT 1 FROM information_schema.tables 
   WHERE table_name = 'processed_jobs');
   ```

**If migration hangs:**
- Kill long-running queries in Railway Dashboard
- Restart the Postgres service
- Try again

---

## Next Steps

1. ✅ Run one of the migration options above
2. ⏳ Wait for Railway to redeploy (if using Option 3)
3. 📊 Monitor logs for heartbeat activity (Option 2 above)
4. 🧪 Run a test job through Seedstr API to verify distributed claiming works
