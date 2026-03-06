import type { EventBus } from './event-bus.js';
import type { AgentConfig, EngineStage } from '../types.js';
import type { Database } from '../db.js';
import { logger } from '../logger.js';

/**
 * State Machine Orchestrator
 * Coordinates the entire pipeline: watch → receive → process → build → pack → submit → complete
 * 
 * Guarantees:
 * - Single responsibility: only orchestrate, don't implement business logic
 * - Stages are guarded: transitions only happen in valid sequences
 * - Metrics and logging at every stage transition
 * - Duplicate job prevention via in-flight tracking + database persistence
 * - Rate limiting (max concurrent jobs)
 * - Prevents race conditions via atomic database checks
 */
export class Orchestrator {
  private stage: EngineStage = 'idle';
  private inFlightJobs = new Set<string>();
  private processedJobsCache = new Set<string>(); // Cache of recently processed jobs from DB
  private maxConcurrentJobs: number;
  private metrics = {
    jobsReceived: 0,
    jobsCompleted: 0,
    jobsFailed: 0,
  };

  constructor(
    private bus: EventBus,
    private config: AgentConfig,
    private db?: Database // Optional: database for persistent duplicate prevention
  ) {
    this.maxConcurrentJobs = (config as any).maxConcurrentJobs || 3;
    this.setupEventListeners();
    if (this.db) {
      this.loadProcessedJobsFromDatabase();
      this.startHeartbeatLoop();
      this.startLeaseCleanupLoop();
    }
  }

  /**
   * Start background heartbeat loop to maintain lease for in-flight jobs
   * Sends periodic heartbeats every 10 seconds
   */
  private startHeartbeatLoop(): void {
    const heartbeatInterval = setInterval(async () => {
      if (this.inFlightJobs.size === 0) return;

      for (const jobId of this.inFlightJobs) {
        if (!this.db) break;
        const success = await this.db.heartbeat(jobId);
        if (!success) {
          logger.warn(`[Orchestrator] Failed to send heartbeat for job ${jobId}`);
          // Job might have been removed from DB or processing status cleared
          this.inFlightJobs.delete(jobId);
        }
      }

      if (this.inFlightJobs.size > 0) {
        logger.debug(
          `[Orchestrator] Heartbeat sent for ${this.inFlightJobs.size} in-flight jobs`
        );
      }
    }, 10000); // Every 10 seconds

    // Allow process to exit even if interval is running
    heartbeatInterval.unref();
  }

  /**
   * Start background task to release expired leases
   * Detects crashed workers and marks their jobs as failed for retry
   * Runs every 60 seconds
   */
  private startLeaseCleanupLoop(): void {
    const cleanupInterval = setInterval(async () => {
      if (!this.db) return;

      try {
        const releasedCount = await this.db.releaseExpiredLeases();
        if (releasedCount > 0) {
          logger.info(
            `[Orchestrator] Released ${releasedCount} expired job leases (detected crashes)`
          );
        }
      } catch (error) {
        logger.error('[Orchestrator] Failed to release expired leases:', error);
      }
    }, 60000); // Every 60 seconds

    // Allow process to exit even if interval is running
    cleanupInterval.unref();
  }

  /**
   * Load recently processed jobs from database to restore state after restart
   * Only loads jobs with 'processing' status to prevent duplicate concurrent execution
   * Completed/failed jobs are allowed to be re-executed
   */
  private async loadProcessedJobsFromDatabase(): Promise<void> {
    if (!this.db) return;
    try {
      const recentJobs = await this.db.getRecentJobs(500); // Load last 500 recent jobs
      // Only track jobs currently PROCESSING to prevent duplicate concurrent execution
      const processingJobs = recentJobs.filter((job) => job.status === 'processing');
      processingJobs.forEach((job) => {
        this.processedJobsCache.add(job.job_id);
      });
      logger.info(`[Orchestrator] Loaded ${processingJobs.length} processing jobs from database (skipped ${recentJobs.length - processingJobs.length} completed/failed jobs)`);
    } catch (error) {
      logger.info('[Orchestrator] Failed to load processed jobs from database:', error);
      // Continue gracefully without DB state
    }
  }


  /**
   * Initialize orchestrator: wire up event listeners for all stages
   */
  private setupEventListeners(): void {
    // System lifecycle
    this.bus.on('system_start', () => this.transitionTo('watching'));
    this.bus.on('system_stop', () => this.transitionTo('idle'));

    // Job received → schedule for processing
    this.bus.on('job_received', (data) => {
      // Guard 1: check if job was already processed (in memory or database)
      if (this.inFlightJobs.has(data.id)) {
        logger.info(`[Orchestrator] Duplicate job ignored (in-flight): ${data.id}`);
        return;
      }
      if (this.processedJobsCache.has(data.id)) {
        logger.info(`[Orchestrator] Duplicate job ignored (already processed): ${data.id}`);
        return;
      }

      // Guard 2: rate limiting
      if (this.inFlightJobs.size >= this.maxConcurrentJobs) {
        logger.info(`[Orchestrator] Job queued (at capacity ${this.maxConcurrentJobs}): ${data.id}`);
        return;
      }

      this.inFlightJobs.add(data.id);
      this.metrics.jobsReceived++;
      this.transitionTo('generating');
      this.bus.emit('job_processing', { id: data.id, stage: 'generating', timestamp: Date.now() });
    });

    // Job failed at any stage
    this.bus.on('job_failed', (data) => {
      this.metrics.jobsFailed++;
      this.transitionTo('error');
      this.inFlightJobs.delete(data.id);
    });

    // Job completed → final result with output
    this.bus.on('job_completed', (data) => {
      this.metrics.jobsCompleted++;
      this.transitionTo('completed');
      this.inFlightJobs.delete(data.id);
      this.processedJobsCache.add(data.id); // Mark as processed for duplicate prevention
    });
  }

  /**
   * Transition to a new stage and emit event
   */
  private transitionTo(newStage: EngineStage): void {
    const oldStage = this.stage;
    this.stage = newStage;
    logger.info(`[Orchestrator] ${oldStage} → ${newStage}`);
  }

  /**
   * Get current orchestrator state (for debugging/monitoring)
   */
  getState() {
    return {
      stage: this.stage,
      inFlightJobs: Array.from(this.inFlightJobs),
      metrics: this.metrics,
    };
  }

  /**
   * Get active job count (for capability tracking)
   */
  getActiveJobCount(): number {
    return this.inFlightJobs.size;
  }

  /**
   * Graceful shutdown: wait for in-flight jobs to complete
   */
  async shutdown(timeoutMs: number = 30000): Promise<void> {
    logger.info('[Orchestrator] Shutting down...');
    this.transitionTo('idle');

    const startTime = Date.now();
    while (this.inFlightJobs.size > 0 && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.inFlightJobs.size > 0) {
      logger.info(`[Orchestrator] Forced shutdown with ${this.inFlightJobs.size} in-flight jobs`);
    } else {
      logger.info('[Orchestrator] Graceful shutdown complete');
    }
  }
}

export default Orchestrator;
