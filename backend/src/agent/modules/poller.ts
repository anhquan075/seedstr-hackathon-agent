import type { EventBus } from '../core/event-bus.js';
import type { AgentConfig } from '../types.js';
import { SeedstrAPIClient } from '../api-client.js';
import { JobEligibilityValidator, type AgentCapabilities } from '../job-eligibility-validator.js';
import { logger } from '../logger.js';
import { config as configManager } from '../config.js';

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
    this.loadPersistentJobs();
  }

  private loadPersistentJobs(): void {
    const persistentJobs = configManager.get('processedJobs') || [];
    persistentJobs.forEach(id => {
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
    if (this.pollInterval) clearInterval(this.pollInterval);
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
    configManager.addProcessedJob(jobId);
    logger.debug(`[SeedstrPoller] Marked job ${jobId} as processed (persisted)`);
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

    logger.debug(
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
        logger.warn(
          `[SeedstrPoller] Rate limited. Waiting ${waitSeconds}s before retry`
        );
        return;
      }

      const response = await this.apiClient.listJobsV2(50, 0);
      logger.debug(`[SeedstrPoller] Fetched ${response.jobs.length} jobs`);

      for (const job of response.jobs) {
        if (this.processedJobIds.has(job.id)) {
          logger.debug(`[SeedstrPoller] Skipping already-processed job ${job.id}`);
          continue;
        }

        const validationResult = this.validator.validate(job, this.capabilities);
        this.validator.logValidation(job.id, validationResult);

        if (!validationResult.eligible) {
          this.processedJobIds.add(job.id);
          continue;
        }

        logger.info(
          `[SeedstrPoller] Valid job found: ${job.id} (${job.jobType}, budget: ${
            job.jobType === 'SWARM' ? job.budgetPerAgent : job.budget
          })`
        );

        this.processedJobIds.add(job.id);

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

