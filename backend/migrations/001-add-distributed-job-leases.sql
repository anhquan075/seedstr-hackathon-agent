-- Migration: Add distributed job lease tracking
-- Purpose: Implement Postgres-based distributed locking with automatic timeout recovery
-- Date: 2026-03-07
-- Status: Production-ready

-- Add lease tracking columns for distributed job claiming
ALTER TABLE processed_jobs
ADD COLUMN IF NOT EXISTS claimed_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS claimed_at BIGINT,
ADD COLUMN IF NOT EXISTS lease_expires_at BIGINT,
ADD COLUMN IF NOT EXISTS last_heartbeat BIGINT;

-- Create index for efficient lease expiration queries
-- This index is used to find stuck jobs (expired leases) for recovery
CREATE INDEX IF NOT EXISTS idx_lease_expiration ON processed_jobs(lease_expires_at)
WHERE status = 'processing';

-- Verify migration completed
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'processed_jobs' 
AND column_name IN ('claimed_by', 'claimed_at', 'lease_expires_at', 'last_heartbeat')
ORDER BY ordinal_position;
