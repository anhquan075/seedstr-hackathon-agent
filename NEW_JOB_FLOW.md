# New Job Flow - Complete Pipeline

## Overview
When a NEW job (not in database) is encountered, it goes through a complete lifecycle from API fetch → database claim → processing → completion.

---

## 1. SEQUENCE DIAGRAM: Full New Job Flow

```mermaid
sequenceDiagram
    participant API as Seedstr API
    participant Poller as SeedstrPoller
    participant DB as Database
    participant Orchestrator as Orchestrator
    participant CompositionRoot as CompositionRoot
    participant Brain as Brain (LLM)
    participant Builder as Builder
    participant Packer as Packer
    participant Events as EventBus

    Note over Poller,DB: STEP 1: JOB DISCOVERY
    Poller->>API: listJobsV2(limit=50)
    API-->>Poller: returns [Job1, Job2, ...]
    
    Note over Poller,DB: STEP 2: FILTER & CLAIM
    Poller->>DB: claimJob(jobId) - atomic INSERT
    alt Job already claimed
        DB-->>Poller: INSERT fails (unique constraint)
        Poller->>Poller: Skip to next job
    else Job is NEW
        DB-->>Poller: ✓ Claims successfully
        DB->>DB: INSERT processed_jobs (status='processing')
    end
    
    Note over Poller,Orchestrator: STEP 3: EMIT EVENT
    Poller->>Events: emit 'job_received'
    Events->>Orchestrator: receive job_received
    
    Note over Orchestrator: STEP 4: GUARD CHECK
    Orchestrator->>Orchestrator: Check inFlightJobs (in-memory)
    Orchestrator->>Orchestrator: Check processedJobsCache (DB state)
    Orchestrator->>Orchestrator: Check maxConcurrentJobs limit
    alt Guards pass
        Orchestrator-->>Events: ✓ Job accepted
    else Guards fail
        Orchestrator-->>Events: ✗ Job rejected (duplicate/rate limit)
    end
    
    Events->>CompositionRoot: Forward to job_received handler
    
    Note over CompositionRoot,Packer: STEP 5: FULL PIPELINE
    CompositionRoot->>Packer: acceptJob(job)
    Packer-->>CompositionRoot: ✓ Job registered
    
    CompositionRoot->>Brain: generateFromPrompt(job.prompt)
    Note over Brain: LLM generates response (may take time)
    Brain-->>CompositionRoot: response output
    Events->>Events: emit 'job_generated'
    
    CompositionRoot->>Builder: buildFromOutput(output)
    Note over Builder: Compile/validate response
    Builder-->>CompositionRoot: compiled package
    Events->>Events: emit 'job_processing'
    
    CompositionRoot->>Packer: packAndSubmit(package)
    Note over Packer: Submit to Seedstr with job ID
    Packer-->>CompositionRoot: response
    
    Note over CompositionRoot,DB: STEP 6: SUCCESS PATH
    alt Success (not 409)
        CompositionRoot->>DB: markJobProcessed(jobId, 'completed')
        DB-->>CompositionRoot: ✓ Status updated
        CompositionRoot->>Events: emit 'job_completed'
    else 409 Conflict (already submitted)
        CompositionRoot->>DB: markJobProcessed(jobId, 'completed')
        DB-->>CompositionRoot: ✓ Status updated (treat as success)
        CompositionRoot->>Events: emit 'job_completed' (conflict note)
    else Any other error
        CompositionRoot->>DB: markJobProcessed(jobId, 'failed')
        DB-->>CompositionRoot: ✓ Status updated
        CompositionRoot->>Events: emit 'job_failed'
        Note over DB: Job eligible for retry on next poll
    end
```

---

## 2. STATE MACHINE: Job Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> NotInDB: New job discovered
    
    NotInDB --> Claiming: Atomic INSERT attempt
    Claiming --> Processing: Successfully claimed
    Claiming --> Skipped: Already claimed by another instance
    
    Processing --> Generating: Brain starts LLM generation
    Generating --> Building: Output received
    Building --> Submitting: Validation passed
    Submitting --> Completed: Submission successful (not 409)
    Submitting --> Completed: 409 Conflict (already submitted)
    Submitting --> Failed: Submission error (non-409)
    
    Building --> Failed: Validation error
    Generating --> Failed: LLM error
    
    Completed --> [*]: Job done
    Failed --> WaitForRetry: Will retry on next poll
    WaitForRetry --> [*]
    Skipped --> [*]: Another instance processing
    
    note right of Processing
        processedJobIds.has(jobId) = false
        In database: status='processing'
    end note
    
    note right of Generating
        Brain (LLM) is working
        Long-running operation
    end note
    
    note right of Failed
        Database status='failed'
        Eligible for retry
        Will be picked up in next poll
    end note
```

---

## 3. DATABASE FLOW: Job Claim & Status Tracking

```mermaid
flowchart TD
    A["Poller: listJobsV2 returns job ID = 'xyz123'"] --> B["Check: Is jobId in processedJobIds set?"]
    
    B -->|Yes - Already processed| C["SKIP job (completed or processing)"]
    B -->|No - New job| D["Try to claim: claimJob('xyz123')"]
    
    D --> E["Database: INSERT into processed_jobs"]
    E --> F{Unique constraint?}
    
    F -->|CONFLICT: Job ID exists| G["Another instance already claimed it"]
    G --> H["SKIP job"]
    
    F -->|SUCCESS: First to claim| I["Database status = 'processing'"]
    I --> J["✓ Add to processedJobIds"]
    J --> K["Emit job_received event"]
    K --> L["CompositionRoot processes job"]
    
    L --> M{Processing result?}
    
    M -->|Success| N["markJobProcessed jobId='xyz123' status='completed'"]
    M -->|409 Conflict| O["markJobProcessed jobId='xyz123' status='completed'<br/>(already submitted elsewhere)"]
    M -->|Error| P["markJobProcessed jobId='xyz123' status='failed'<br/>(will retry next poll)"]
    
    N --> Q["Database updated"]
    O --> Q
    P --> Q
    Q --> R["Poll cycle continues"]
```

---

## 4. CODE FLOW: Key Functions & Line References

### A. Job Discovery (poller.ts:200-250)
```typescript
// 1. Fetch jobs
const response = await this.apiClient.listJobsV2(50, 0);

// 2. For each job
for (const job of response.jobs) {
  // 3. Check if already processed
  if (this.processedJobIds.has(job.id)) {
    logger.info(`Skipping ${job.id} (already processed)`);
    continue;
  }
  
  // 4. Try to claim in database
  const claimed = await this.tryClaimJob(job.id);
  if (!claimed) {
    logger.info(`Job ${job.id} already claimed by another instance`);
    continue;
  }
  
  // 5. Validate job
  const isValid = validator.validate(job);
  if (!isValid) {
    logger.info(`Job ${job.id} validation failed`);
    continue;
  }
  
  // 6. Emit event - triggers full pipeline
  eventBus.emit('job_received', job);
}
```

### B. Atomic Claim (db.ts)
```typescript
// claimJob: INSERT with unique constraint
// Only succeeds if job_id doesn't exist
async claimJob(jobId: string): Promise<boolean> {
  const INSERT INTO processed_jobs (job_id, status, processed_at)
  VALUES ($1, 'processing', $2)
  ON CONFLICT (job_id) DO NOTHING;  // ← Atomic guard
  return affectedRows > 0;
}

// markJobProcessed: Update status
async markJobProcessed(jobId: string, status: 'completed' | 'failed'): Promise<void> {
  INSERT INTO processed_jobs (job_id, status, processed_at)
  VALUES ($1, $2, $3)
  ON CONFLICT (job_id) DO UPDATE SET status=$2, processed_at=$3;
}
```

### C. Full Pipeline (composition-root.ts:131-225)
```typescript
eventBus.on('job_received', async (data) => {
  try {
    // 1. Accept job
    await packer.acceptJob(data);
    
    // 2. Generate via LLM
    const output = await brain.generateFromPrompt(data.prompt);
    eventBus.emit('job_generated', { id: data.id, output });
    
    // 3. Build from output
    const compiledPackage = await builder.buildFromOutput(output);
    eventBus.emit('job_processing', { id: data.id, stage: 'building' });
    
    // 4. Submit job
    const result = await packer.packAndSubmit(compiledPackage);
    
    // 5. Mark completed
    await database?.markJobProcessed(data.id, 'completed');
    eventBus.emit('job_completed', {
      id: data.id,
      output: result.output,
      responseId: result.id,
    });
    
  } catch (error) {
    // 409 = Already submitted (success)
    if (error.includes('409')) {
      await database?.markJobProcessed(data.id, 'completed');
      return;
    }
    
    // Other errors = Mark failed (retry on next poll)
    await database?.markJobProcessed(data.id, 'failed');
    eventBus.emit('job_failed', { id: data.id, error });
  }
});
```

---

## 5. Guard Mechanisms: Preventing Duplicates

### In-Memory Guard (Orchestrator)
```typescript
// Track in-flight jobs during current session
if (this.inFlightJobs.has(jobId)) {
  logger.info(`Job ${jobId} already in flight, skipping`);
  return;  // ← Prevents immediate re-processing
}
this.inFlightJobs.add(jobId);
```

### Database Guard (Poller + DB)
```typescript
// claimJob uses atomic INSERT with unique constraint
// Only one instance can claim a job at a time (distributed safety)
const claimed = await database.claimJob(jobId);
if (!claimed) {
  logger.info(`Job ${jobId} already claimed by another instance`);
  return;  // ← Prevents race condition across instances
}
```

### Cached State Guard (Orchestrator)
```typescript
// Load recently processed jobs on startup
const recentJobs = await database.getRecentJobs(500);
this.processedJobsCache = new Set(recentJobs.map(j => j.job_id));

// Check cache before processing
if (this.processedJobsCache.has(jobId)) {
  logger.info(`Job ${jobId} already cached as processed`);
  return;  // ← Prevents re-execution of recently processed jobs
}
```

---

## 6. Failure Recovery & Retries

### Failed Jobs (status='failed')
- **When set**: Any error except 409 conflicts
- **When picked up**: Next poll cycle via `listJobsV2`
- **Why**: Failed jobs NOT added to `processedJobIds` skip list
- **Flow**: On next poll, `claimJob()` will succeed again (no unique constraint block)

### Completed Jobs (status='completed')
- **When set**: Successful submission OR 409 conflicts
- **When skipped**: Every poll via `processedJobIds` check
- **Why**: Added to skip list in `loadJobsFromDatabase()`
- **Optimization**: Prevents unnecessary database lookups

### Processing Jobs (status='processing')
- **When set**: Initially by `claimJob()`
- **Timeout behavior**: If job crashes mid-processing, stays 'processing'
- **Recovery**: Manual cleanup or timeout-based reset (not auto)
- **Note**: Currently not skipped by poller (would need timeout logic)

---

## 7. Edge Cases & Handling

| Scenario | What Happens | Why |
|----------|--------------|-----|
| Job already in DB from previous poll | `claimJob()` fails, skipped | Atomic INSERT constraint |
| Multiple instances fetch same job | First wins via atomic claim | Database unique index |
| Job fails (non-409 error) | Status='failed', retried next poll | Not added to skip list |
| Job gets 409 conflict | Treated as success (already submitted) | Mark 'completed', skip forever |
| Processing crashes mid-job | Status stays 'processing' | No auto-timeout (would need implementation) |
| Database unavailable | Falls back to in-memory tracking | Restart loses history |

---

## Summary: New Job Lifecycle

```
NEW JOB DISCOVERED
        ↓
[Poll] Check local skip set → No? Proceed
        ↓
[DB] Atomic claim INSERT → Success? Proceed
        ↓
[Validate] Check job eligibility → Valid? Proceed
        ↓
[Emit] job_received event
        ↓
[Orchestrator] Guard checks (in-memory, cache, concurrency)
        ↓
[Pipeline] Brain → Builder → Packer
        ↓
[DB] Mark status (completed/failed)
        ↓
JOB DONE or QUEUED FOR RETRY
```

**Key Insight**: New jobs are protected by **THREE layers of guards**:
1. **Local Skip Set**: In-memory cache (fast)
2. **Database Claim**: Atomic INSERT (distributed safety)
3. **Orchestrator Guard**: Final gatekeeper (concurrency control)

This ensures reliable, idempotent processing even with multiple instances.
