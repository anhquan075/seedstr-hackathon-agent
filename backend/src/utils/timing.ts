/**
 * Performance timing utilities for measuring pipeline stage durations
 */

export interface TimingMetrics {
  /** Job detection (polling or WebSocket) */
  jobDetection: number;
  /** LLM generation (model inference + tool calls) */
  llmGeneration: number;
  /** Project build (template application + file creation) */
  projectBuild: number;
  /** ZIP archive creation */
  zipCreation: number;
  /** API submission (upload + submit) */
  apiSubmission: number;
  /** Total end-to-end duration */
  total: number;
  /** Timestamp when measurement started */
  startedAt: number;
  /** Timestamp when measurement completed */
  completedAt?: number;
}

export interface TimerEntry {
  startTime: number;
  endTime?: number;
  duration?: number;
}

/**
 * Performance monitoring class for tracking pipeline stage timings
 */
export class PerformanceMonitor {
  private timers: Map<string, TimerEntry> = new Map();
  private jobStartTime: number = 0;

  /**
   * Start timing for the entire job
   */
  startJob(): void {
    this.jobStartTime = Date.now();
    this.timers.clear();
  }

  /**
   * Start a timer for a specific stage
   */
  startTimer(stage: string): void {
    this.timers.set(stage, {
      startTime: Date.now(),
    });
  }

  /**
   * Stop a timer for a specific stage and return duration in milliseconds
   */
  stopTimer(stage: string): number {
    const entry = this.timers.get(stage);
    if (!entry) {
      throw new Error(`Timer for stage "${stage}" was never started`);
    }

    if (entry.endTime !== undefined) {
      throw new Error(`Timer for stage "${stage}" was already stopped`);
    }

    entry.endTime = Date.now();
    entry.duration = entry.endTime - entry.startTime;

    return entry.duration;
  }

  /**
   * Get duration for a specific stage (without stopping it)
   */
  getDuration(stage: string): number | undefined {
    const entry = this.timers.get(stage);
    if (!entry) return undefined;

    if (entry.duration !== undefined) {
      return entry.duration;
    }

    // If timer is still running, return elapsed time
    return Date.now() - entry.startTime;
  }

  /**
   * Get all timing metrics
   */
  getMetrics(): TimingMetrics {
    const totalDuration = this.jobStartTime > 0 ? Date.now() - this.jobStartTime : 0;

    return {
      jobDetection: this.getDuration('jobDetection') || 0,
      llmGeneration: this.getDuration('llmGeneration') || 0,
      projectBuild: this.getDuration('projectBuild') || 0,
      zipCreation: this.getDuration('zipCreation') || 0,
      apiSubmission: this.getDuration('apiSubmission') || 0,
      total: totalDuration,
      startedAt: this.jobStartTime,
      completedAt: totalDuration > 0 ? this.jobStartTime + totalDuration : undefined,
    };
  }

  /**
   * Get formatted timing summary for logging
   */
  getSummary(): string {
    const metrics = this.getMetrics();
    const formatMs = (ms: number) => `${ms}ms (${(ms / 1000).toFixed(2)}s)`;

    return [
      `[TIMING] Pipeline Summary:`,
      `  Job Detection: ${formatMs(metrics.jobDetection)}`,
      `  LLM Generation: ${formatMs(metrics.llmGeneration)}`,
      `  Project Build: ${formatMs(metrics.projectBuild)}`,
      `  ZIP Creation: ${formatMs(metrics.zipCreation)}`,
      `  API Submission: ${formatMs(metrics.apiSubmission)}`,
      `  Total: ${formatMs(metrics.total)}`,
    ].join('\n');
  }

  /**
   * Reset all timers
   */
  reset(): void {
    this.timers.clear();
    this.jobStartTime = 0;
  }

  /**
   * Check if a timer exists
   */
  hasTimer(stage: string): boolean {
    return this.timers.has(stage);
  }

  /**
   * Get timing data for SSE broadcast
   */
  getTimingData(): Record<string, number> {
    const metrics = this.getMetrics();
    return {
      total: metrics.total,
      totalSeconds: parseFloat((metrics.total / 1000).toFixed(2)),
      jobDetection: metrics.jobDetection,
      jobDetectionSeconds: parseFloat((metrics.jobDetection / 1000).toFixed(2)),
      llmGeneration: metrics.llmGeneration,
      llmGenerationSeconds: parseFloat((metrics.llmGeneration / 1000).toFixed(2)),
      projectBuild: metrics.projectBuild,
      projectBuildSeconds: parseFloat((metrics.projectBuild / 1000).toFixed(2)),
      zipCreation: metrics.zipCreation,
      zipCreationSeconds: parseFloat((metrics.zipCreation / 1000).toFixed(2)),
      apiSubmission: metrics.apiSubmission,
      apiSubmissionSeconds: parseFloat((metrics.apiSubmission / 1000).toFixed(2)),
    };
  }
}

/**
 * Helper function to measure async operation duration
 */
export async function measureAsync<T>(
  stage: string,
  operation: () => Promise<T>,
  onComplete?: (duration: number) => void
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    if (onComplete) {
      onComplete(duration);
    }

    return { result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    if (onComplete) {
      onComplete(duration);
    }
    throw error;
  }
}
