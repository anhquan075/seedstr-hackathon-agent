import type { EventBus } from '../core/event-bus.js';
import type { AgentConfig } from '../types.js';
import { SeedstrAPIClient } from '../api-client.js';
import { JobEligibilityValidator, type AgentCapabilities } from '../job-eligibility-validator.js';
import { logger } from '../logger.js';

/**
 * SeedstrPoller Module
 * 
 * Polls the Seedstr API for new jobs using listJobsV2().
 * Implements 5-10s randomized polling intervals for stealth.
 * Filters jobs via JobEligibilityValidator to enforce budget constraints (0.5 USD minimum, no maximum).
 * Prevents duplicate job processing using a local Set.
 * Emits job_received events to the EventBus when a valid job is found.
 */
export class SeedstrPoller {
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private processedJobIds = new Set<string>();
  private apiClient: SeedstrAPIClient;
  private validator: JobEligibilityValidator;


  constructor(
    private bus: EventBus,
    private config: AgentConfig,
    private capabilities: AgentCapabilities
  ) {
    this.apiClient = new SeedstrAPIClient(config.seedstrApiKey || config.apiKey);
    this.validator = new JobEligibilityValidator();
  }

  /**
   * Start polling for jobs
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[SeedstrPoller] Already running');
      return;
    }

    this.isRunning = true;
    logger.info('[SeedstrPoller] Started');

    // First poll immediately (sub-1s)
    this.poll().catch((error) => {
      logger.error('[SeedstrPoller] Initial poll error:', error);
    });

    // Then poll every 5-10s with randomization
    this.scheduleNextPoll();
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.pollInterval) clearInterval(this.pollInterval);
    logger.info('[SeedstrPoller] Stopped');
  }

  /**
   * Pause polling (soft pause - internal state tracking)
   * Jobs in progress will continue; no new polls will occur
   */
  pause(): void {
    if (!this.isRunning) {
      logger.warn('[SeedstrPoller] Not running, cannot pause');
      return;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      logger.info('[SeedstrPoller] Polling paused');
    }
  }

  /**
   * Resume polling after pause
   */
  resume(): void {
    if (!this.isRunning) {
      logger.warn('[SeedstrPoller] Not running, cannot resume');
      return;
    }

    if (this.pollInterval) {
      logger.warn('[SeedstrPoller] Already polling');
      return;
    }

    // Resume polling
    this.scheduleNextPoll();
    logger.info('[SeedstrPoller] Polling resumed');
  }

  /**
   * Check if currently paused
   */
  isPaused(): boolean {
    return this.isRunning && !this.pollInterval;
  }

  /**
   * Mark a job as processed to prevent duplicate handling
   */
  markJobProcessed(jobId: string): void {
    this.processedJobIds.add(jobId);
    logger.debug(`[SeedstrPoller] Marked job ${jobId} as processed`);
  }

  /**
   * Clear processed jobs (useful for testing or full reset)
   */
  clearProcessedJobs(): void {
    this.processedJobIds.clear();
    logger.info('[SeedstrPoller] Cleared processed jobs set');
  }

  /**
   * Get count of processed jobs
   */
  getProcessedJobCount(): number {
    return this.processedJobIds.size;
  }

  /**
   * Schedule the next poll with randomized 5-10s interval
   */
  private scheduleNextPoll(): void {
    // Randomize interval: 5000-10000ms
    const minInterval = 5000;
    const maxInterval = 10000;
    const interval = minInterval + Math.random() * (maxInterval - minInterval);

    this.pollInterval = setInterval(() => {
      if (this.isRunning) {
        this.poll().catch((error) => {
          logger.error('[SeedstrPoller] Poll error:', error);
        });
      }
    }, Math.round(interval));

    logger.debug(
      `[SeedstrPoller] Next poll scheduled in ${Math.round(interval)}ms`
    );
  }

  /**
   * Main polling logic
   */
  private async poll(): Promise<void> {
    try {
      const now = Date.now();


      // Emit job_tick event for monitoring
      this.bus.emit('job_tick', { timestamp: now });

      // Check rate limit before making request
      const rateLimitReset = this.apiClient.getRateLimitReset();
      if (rateLimitReset > now) {
        const waitSeconds = Math.ceil((rateLimitReset - now) / 1000);
        logger.warn(
          `[SeedstrPoller] Rate limited. Waiting ${waitSeconds}s before retry`
        );
        return;
      }

      // Fetch jobs from API (limit to 50 per request)
      const response = await this.apiClient.listJobsV2(50, 0);
      logger.debug(`[SeedstrPoller] Fetched ${response.jobs.length} jobs`);

      // Filter and process jobs
      for (const job of response.jobs) {
        // Skip if already processed
        if (this.processedJobIds.has(job.id)) {
          logger.debug(`[SeedstrPoller] Skipping already-processed job ${job.id}`);
          continue;
        }

        // Validate job eligibility
        const validationResult = this.validator.validate(job, this.capabilities);
        this.validator.logValidation(job.id, validationResult);

        if (!validationResult.eligible) {
          // Mark as processed even if ineligible to avoid re-checking
          this.processedJobIds.add(job.id);
          continue;
        }

        // Valid job found - emit event
        logger.info(
          `[SeedstrPoller] Valid job found: ${job.id} (${job.jobType}, budget: ${
            job.jobType === 'SWARM' ? job.budgetPerAgent : job.budget
          })`
        );

        this.processedJobIds.add(job.id);

        // Emit job_received event to EventBus
        this.bus.emit('job_received', {
          id: job.id,
          prompt: job.prompt,
          budget: job.jobType === 'SWARM' ? (job.budgetPerAgent || 0) : job.budget,
          timestamp: now,
          jobType: job.jobType,
          skills: job.requiredSkills || [],
          description: job.description,
          responseType: job.responseType,
        });
      }
    } catch (error) {
      logger.error('[SeedstrPoller] Poll failed:', error);
    }
  }
}

export default SeedstrPoller;
