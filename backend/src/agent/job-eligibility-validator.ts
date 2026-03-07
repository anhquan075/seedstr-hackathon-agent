import type { SeedstrJob } from './types.js';
import { logger } from './logger.js';

/**
 * Job eligibility validator for hardening job intake.
 *
 * Performs pre-checks before processing:
 * 1. Job status validation (must be OPEN)
 * 2. Expiry check (not expired)
 * 3. Reputation threshold validation
  4. Budget sufficiency check (0.5 USD minimum, no maximum)
 * 5. SWARM-specific validation
 * 6. Concurrent job limit
 * 7. Job completion before expiry (SWARM deadline enforcement)
 */


export interface JobValidationResult {
 eligible: boolean;
 reason?: string;
 requiresSwarmAcceptance?: boolean;
 estimatedDuration?: number;
}

export interface AgentCapabilities {
 agentReputation: number;
 minBudgetRequired: number; // ETH or equivalent
 maxConcurrentJobs: number;
 activeJobCount: number;
}

export class JobEligibilityValidator {
 /**
  * Validate job eligibility for processing
  */
 validate(job: SeedstrJob, capabilities: AgentCapabilities): JobValidationResult {
  // Check 1: Job must be OPEN
  if (job.status !== 'OPEN') {
   return {
    eligible: false,
    reason: `Job status is ${job.status}, not OPEN`,
   };
  }

  // Check 2: Job must not be expired
  if (job.expiresAt) {
   const expiryTime = new Date(job.expiresAt).getTime();
   const now = Date.now();
   if (now > expiryTime) {
    return {
     eligible: false,
     reason: `Job expired at ${job.expiresAt}`,
    };
   }
  }

  // Check 3: Agent reputation meets minimum requirement
  if (job.minReputation && capabilities.agentReputation < job.minReputation) {
   return {
    eligible: false,
    reason: `Agent reputation ${capabilities.agentReputation} < required ${job.minReputation}`,
   };
  }

  // Check 4: Budget sufficiency - STRICTLY enforce 0.5 USD minimum, NO MAXIMUM LIMIT
  // For SWARM jobs, check budgetPerAgent; for standard jobs, check budget
  // For SWARM jobs, check budgetPerAgent; for standard jobs, check budget
  const jobBudget = job.jobType === 'SWARM' 
   ? (job.budgetPerAgent || 0)
   : (job.budget || 0);
  
  // minBudgetRequired should be set to 0.5 (USD) in config or here directly
  const minRequired = 0.5; // USD: ALWAYS 0.5 minimum, no maximum limit

  if (jobBudget < minRequired) {
   return {
    eligible: false,
    reason: `Job budget ${jobBudget} < minimum required ${minRequired} USD`,
   };
  }


  // Check 5: Concurrent job limit
  if (capabilities.activeJobCount >= capabilities.maxConcurrentJobs) {
   return {
    eligible: false,
    reason: `Already processing ${capabilities.activeJobCount} jobs (max: ${capabilities.maxConcurrentJobs})`,
   };
  }

  // Check 6: SWARM-specific validation
  const requiresSwarmAcceptance = job.jobType === 'SWARM';
  if (requiresSwarmAcceptance && job.maxAgents) {
   // For SWARM, check if there are still slots available
   const slotsUsed = job.acceptedCount || 0;
   if (slotsUsed >= job.maxAgents) {
    return {
     eligible: false,
     reason: `SWARM job full: ${slotsUsed}/${job.maxAgents} slots filled`,
    };
   }
  }

  // Check 7: Job can be completed before expiry (SWARM deadline enforcement)
  if (job.jobType === 'SWARM' && !this.canCompleteBeforeExpiry(job)) {
   return {
    eligible: false,
    reason: `Job cannot be completed before expiry deadline`,
   };
  }

  // All checks passed
  return {
   eligible: true,
   reason: 'Job meets all eligibility criteria',
   requiresSwarmAcceptance,
   estimatedDuration: this.estimateJobDuration(job),
  };
 }

 /**
  * Check if job can be completed before expiry
  */
 canCompleteBeforeExpiry(job: SeedstrJob): boolean {
  if (!job.expiresAt) {
   return true; // No expiry, can always complete
  }

  const expiryTime = new Date(job.expiresAt).getTime();
  const now = Date.now();
  const timeRemainingMs = expiryTime - now;

  // Estimate: 5s SWARM acceptance + 10s LLM generation + 5s upload/submit + 5s buffer = 25s minimum
  const estimatedDurationMs = this.estimateJobDuration(job);
  const minBufferMs = 5000; // 5s safety buffer

  return timeRemainingMs > (estimatedDurationMs + minBufferMs);
 }

 /**
  * Estimate job processing duration in milliseconds
  */
 private estimateJobDuration(job: SeedstrJob): number {
  let duration = 0;

  // SWARM acceptance time
  if (job.jobType === 'SWARM') {
   duration += 5000; // 5s for SWARM acceptance attempt
  }

  // LLM generation time (rough estimate: 10s for typical prompt)
  duration += 10000;

  // File upload and submission time
  duration += 5000;

  // Buffer for retries and network latency
  duration += 5000;

  return duration;
 }

 /**
  * Log job validation decision
  */
 logValidation(jobId: string, result: JobValidationResult): void {
  if (result.eligible) {
   logger.debug(`job_eligible [${jobId}]`, {
    reason: result.reason,
    requiresSwarmAcceptance: result.requiresSwarmAcceptance,
    estimatedDurationMs: result.estimatedDuration,
   });
  } else {
   logger.warn(`job_rejected [${jobId}]`, {
    reason: result.reason,
   });
  }
 }
}
