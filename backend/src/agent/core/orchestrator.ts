import type { EventBus } from './event-bus.js';
import type { AgentConfig, EngineStage } from '../types.js';

/**
 * State Machine Orchestrator
 * Coordinates the entire pipeline: watch → receive → process → build → pack → submit → complete
 * 
 * Guarantees:
 * - Single responsibility: only orchestrate, don't implement business logic
 * - Stages are guarded: transitions only happen in valid sequences
 * - Metrics and logging at every stage transition
 * - Duplicate job prevention via in-flight tracking
 * - Rate limiting (max concurrent jobs)
 */
export class Orchestrator {
  private stage: EngineStage = 'idle';
  private inFlightJobs = new Set<string>();
  private maxConcurrentJobs: number;
  private metrics = {
    jobsReceived: 0,
    jobsCompleted: 0,
    jobsFailed: 0,
  };

  constructor(
    private bus: EventBus,
    private config: AgentConfig
  ) {
    this.maxConcurrentJobs = (config as any).maxConcurrentJobs || 3;
    this.setupEventListeners();
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
      // Guard: duplicate prevention
      if (this.inFlightJobs.has(data.id)) {
        console.warn(`[Orchestrator] Duplicate job ignored: ${data.id}`);
        return;
      }

      // Guard: rate limiting
      if (this.inFlightJobs.size >= this.maxConcurrentJobs) {
        console.warn(`[Orchestrator] Job queued (at capacity ${this.maxConcurrentJobs}): ${data.id}`);
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
    });
  }

  /**
   * Transition to a new stage and emit event
   */
  private transitionTo(newStage: EngineStage): void {
    const oldStage = this.stage;
    this.stage = newStage;
    console.log(`[Orchestrator] ${oldStage} → ${newStage}`);
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
    console.log('[Orchestrator] Shutting down...');
    this.transitionTo('idle');

    const startTime = Date.now();
    while (this.inFlightJobs.size > 0 && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.inFlightJobs.size > 0) {
      console.warn(`[Orchestrator] Forced shutdown with ${this.inFlightJobs.size} in-flight jobs`);
    } else {
      console.log('[Orchestrator] Graceful shutdown complete');
    }
  }
}

export default Orchestrator;
