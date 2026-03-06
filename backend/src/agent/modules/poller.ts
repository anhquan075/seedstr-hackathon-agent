import { SeedstrAPIClient } from '../api-client.js';
import { config as configManager } from '../config.js';
import type { EventBus } from '../core/event-bus.js';
import { database } from '../db.js';
import { JobEligibilityValidator, type AgentCapabilities } from '../job-eligibility-validator.js';
import { logger } from '../logger.js';
import type { AgentConfig } from '../types.js';

export class SeedstrPoller {
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private processedJobIds = new Set<string>();
  private apiClient: SeedstrAPIClient;
  private validator: JobEligibilityValidator;
  private dbAvailable = false;

  constructor(
    private bus: EventBus,
    private config: AgentConfig,
    private capabilities: AgentCapabilities
  ) {
    this.apiClient = new SeedstrAPIClient(config.seedstrApiKey || config.apiKey);
    this.validator = new JobEligibilityValidator();
    
    // Check if database is available
    this.dbAvailable = database.isAvailable();
    if (this.dbAvailable) {
      logger.info('[SeedstrPoller] Using PostgreSQL for job persistence');
      this.loadJobsFromDatabase();
    } else {
      logger.info('[SeedstrPoller] Database not available, using in-memory + config');
      this.loadPersistentJobs();
    }
  }

  private async loadJobsFromDatabase(): Promise<void> {
    try {
      const jobs = await database.getRecentJobs(1000);
      jobs.forEach(job => {
        if (job.status !== 'processing') {
          this.processedJobIds.add(job.job_id);
        }
      });
      logger.info(`[SeedstrPoller] Loaded ${this.processedJobIds.size} jobs from database`);
      
      // Prune old jobs to keep only last 1000
      await database.pruneOldJobs(1000);
    } catch (error) {
      logger.error('[SeedstrPoller] Failed to load jobs from database:', error);
      this.loadPersistentJobs();
    }
  }

  private loadPersistentJobs(): void {
    const persistentJobs = (configManager.get('processedJobs') || []) as string[];
    persistentJobs.forEach((id) => {
      this.processedJobIds.add(id);
    });
    logger.info(`[SeedstrPoller] Loaded ${this.processedJobIds.size} persistent jobs`);
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('[SeedstrPoller] Already running');
      return;
    }

    this.isRunning = true;
    logger.info('[SeedstrPoller] Started');

    this.poll().catch((error) => {
      logger.error('[SeedstrPoller] Initial poll error:', error);
    });

    this.scheduleNextPoll();
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    logger.info('[SeedstrPoller] Stopped');
  }

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

  resume(): void {
    if (!this.isRunning) {
      logger.warn('[SeedstrPoller] Not running, cannot resume');
      return;
    }

    if (this.pollInterval) {
      logger.warn('[SeedstrPoller] Already polling');
      return;
    }

    this.scheduleNextPoll();
    logger.info('[SeedstrPoller] Polling resumed');
  }

  isPaused(): boolean {
    return this.isRunning && !this.pollInterval;
  }

  markJobProcessed(jobId: string): void {
    this.processedJobIds.add(jobId);
    
    // Persist to database if available
    if (this.dbAvailable) {
      database.markJobProcessed(jobId, 'completed').catch(err => {
        logger.error('[SeedstrPoller] Failed to persist to DB:', err);
        configManager.addProcessedJob(jobId);
      });
    } else {
      configManager.addProcessedJob(jobId);
    }
    
    // Keep in-memory set aligned with persistent retention limit.
    if (this.processedJobIds.size > 1000) {
      const oldestId = Array.from(this.processedJobIds)[0];
      this.processedJobIds.delete(oldestId);
    }
    logger.info(`[SeedstrPoller] Marked job ${jobId} as processed`);
  }

  /**
   * Atomically claim a job in the database to prevent race conditions
   * Returns true if successfully claimed, false if already being processed
   */
  async tryClaimJob(jobId: string): Promise<boolean> {
    if (this.dbAvailable) {
      const claimed = await database.claimJob(jobId);
      if (claimed) {
        this.processedJobIds.add(jobId);
        logger.info(`[SeedstrPoller] Claimed job ${jobId} via database`);
        return true;
      }
      return false;
    }
    
    // Fallback to in-memory check
    if (this.processedJobIds.has(jobId)) {
      return false;
    }
    this.processedJobIds.add(jobId);
    return true;
  }

  clearProcessedJobs(): void {
    this.processedJobIds.clear();
    logger.info('[SeedstrPoller] Cleared processed jobs set');
  }

  getProcessedJobCount(): number {
    return this.processedJobIds.size;
  }

  private scheduleNextPoll(): void {
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

    logger.info(
      `[SeedstrPoller] Next poll scheduled in ${Math.round(interval)}ms`
    );
  }
  private async poll(): Promise<void> {
    try {
      const now = Date.now();

      this.bus.emit('job_tick', { timestamp: now });

      const rateLimitReset = this.apiClient.getRateLimitReset();
      if (rateLimitReset > now) {
        const waitSeconds = Math.ceil((rateLimitReset - now) / 1000);
        logger.info(
          `[SeedstrPoller] Rate limited. Waiting ${waitSeconds}s before retry`
        );
        return;
      }

      logger.info(`[SeedstrPoller] Starting poll...`);
      const response = await this.apiClient.listJobsV2(50, 0);
      logger.info(`[SeedstrPoller] Fetched ${response.jobs.length} jobs from Seedstr API`);

      for (const job of response.jobs) {
        // Use atomic database claim to prevent race conditions across instances
        if (this.dbAvailable) {
          const claimed = await this.tryClaimJob(job.id);
          if (!claimed) {
            logger.info(`[SeedstrPoller] Job ${job.id} already claimed by another instance, skipping`);
            continue;
          }
        } else {
          // Fallback to in-memory check
          if (this.processedJobIds.has(job.id)) {
            logger.info(`[SeedstrPoller] Skipping already-processed job ${job.id}`);
            continue;
          }
          this.processedJobIds.add(job.id);
        }

        const validationResult = this.validator.validate(job, this.capabilities);
        this.validator.logValidation(job.id, validationResult);
        
        // Log rejection reasons at INFO level (not debug) so they're visible in production
        if (!validationResult.eligible) {
          logger.info(`[SeedstrPoller] Job ${job.id} REJECTED: ${validationResult.reason || 'unknown reason'}`);
          continue;
        }


        logger.info(
          `[SeedstrPoller] Valid job found: ${job.id} (${job.jobType}, budget: ${
            job.jobType === 'SWARM' ? job.budgetPerAgent : job.budget
          })`
        );

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
      logger.error('[SeedstrPoller] Poll error:', error instanceof Error ? error.message : String(error));
    }
  }
}
export default SeedstrPoller;
