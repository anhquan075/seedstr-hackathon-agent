import { Registry, Counter, Histogram, Gauge } from 'prom-client';

// Create a dedicated registry for our metrics
export const metricsRegistry = new Registry();

// ============================================================================
// COUNTERS - Track cumulative event counts
// ============================================================================

// Job lifecycle counters
export const jobsReceivedCounter = new Counter({
 name: 'jobs_received_total',
 help: 'Total number of jobs received from Seedstr API',
 labelNames: ['provider'], // Track which LLM provider was attempted
 registers: [metricsRegistry],
});

export const jobsProcessedCounter = new Counter({
 name: 'jobs_processed_total',
 help: 'Total number of jobs successfully processed (LLM generated response)',
 labelNames: ['provider'],
 registers: [metricsRegistry],
});

export const jobsBuiltCounter = new Counter({
 name: 'jobs_built_total',
 help: 'Total number of projects successfully built',
 registers: [metricsRegistry],
});

export const jobsSubmittedCounter = new Counter({
 name: 'jobs_submitted_total',
 help: 'Total number of jobs successfully submitted to Seedstr',
 registers: [metricsRegistry],
});

export const jobsFailedCounter = new Counter({
 name: 'jobs_failed_total',
 help: 'Total number of jobs that failed at any stage',
 labelNames: ['stage', 'error_type'], // stage: poll, parse, llm, build, submit
 registers: [metricsRegistry],
});

// LLM provider usage
export const llmCallsCounter = new Counter({
 name: 'llm_calls_total',
 help: 'Total LLM API calls made',
 labelNames: ['provider', 'status'], // status: success, failure, retry
 registers: [metricsRegistry],
});

// JSON repair attempts
export const jsonRepairAttemptsCounter = new Counter({
 name: 'json_repair_attempts_total',
 help: 'Total JSON repair attempts (counts each strategy tried)',
 labelNames: ['strategy', 'success'], // strategy: parse, markdown, extract, trailing_comma, quote_keys, etc
 registers: [metricsRegistry],
});

// ============================================================================
// HISTOGRAMS - Track latency distributions
// ============================================================================

// Polling latency (time between polls)
export const pollIntervalHistogram = new Histogram({
 name: 'poll_interval_seconds',
 help: 'Time spent in polling loop (includes wait + request overhead)',
 buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
 registers: [metricsRegistry],
});

// LLM response latency
export const llmLatencyHistogram = new Histogram({
 name: 'llm_latency_seconds',
 help: 'Time spent waiting for LLM API response',
 buckets: [1, 2, 5, 10, 15, 20, 30],
 labelNames: ['provider'],
 registers: [metricsRegistry],
});

// JSON parsing + repair latency
export const jsonRepairLatencyHistogram = new Histogram({
 name: 'json_repair_latency_seconds',
 help: 'Time spent parsing and repairing JSON',
 buckets: [0.001, 0.01, 0.05, 0.1, 0.2, 0.5, 1],
 registers: [metricsRegistry],
});

// Project build latency
export const buildLatencyHistogram = new Histogram({
 name: 'build_latency_seconds',
 help: 'Time spent building and compressing project ZIP',
 buckets: [0.5, 1, 2, 3, 5, 10],
 registers: [metricsRegistry],
});

// Submission latency
export const submitLatencyHistogram = new Histogram({
 name: 'submit_latency_seconds',
 help: 'Time spent submitting response to Seedstr API',
 buckets: [1, 2, 5, 10, 20],
 registers: [metricsRegistry],
});

// End-to-end latency (from job received to submission complete)
export const e2eLatencyHistogram = new Histogram({
 name: 'e2e_latency_seconds',
 help: 'Total end-to-end latency (job received -> submitted)',
 buckets: [5, 10, 20, 30, 45, 60, 120],
 registers: [metricsRegistry],
});

// ============================================================================
// GAUGES - Track current state snapshots
// ============================================================================

// Active jobs being processed
export const activeJobsGauge = new Gauge({
 name: 'active_jobs',
 help: 'Number of jobs currently being processed',
 registers: [metricsRegistry],
});

// Last successful job timestamp
export const lastSuccessfulSubmitGauge = new Gauge({
 name: 'last_successful_submit_timestamp_seconds',
 help: 'Unix timestamp of last successful job submission',
 registers: [metricsRegistry],
});

// Polling health check
export const lastPolledGauge = new Gauge({
 name: 'last_polled_timestamp_seconds',
 help: 'Unix timestamp of last successful Seedstr API poll',
 registers: [metricsRegistry],
});

// ============================================================================
// HELPER FUNCTIONS - Simplified metric recording
// ============================================================================

/**
 * Record async operation timing and automatically handle success/failure
 */
export async function recordTiming<T>(
 histogram: Histogram,
 fn: () => Promise<T>,
 labels?: Record<string, string | number>
): Promise<T> {
 const startMs = Date.now();
 try {
  const result = await fn();
  const durationSecs = (Date.now() - startMs) / 1000;
  if (labels && Object.keys(labels).length > 0) {
   histogram.observe(labels, durationSecs);
  } else {
   histogram.observe(durationSecs);
  }
  return result;
 } catch (error) {
  const durationSecs = (Date.now() - startMs) / 1000;
  if (labels && Object.keys(labels).length > 0) {
   histogram.observe(labels, durationSecs);
  } else {
   histogram.observe(durationSecs);
  }
  throw error;
 }
}

/**
 * Record sync operation timing
 */
export function recordTimingSync<T>(
 histogram: Histogram,
 fn: () => T,
 labels?: Record<string, string | number>
): T {
 const startMs = Date.now();
 try {
  const result = fn();
  const durationSecs = (Date.now() - startMs) / 1000;
  if (labels && Object.keys(labels).length > 0) {
   histogram.observe(labels, durationSecs);
  } else {
   histogram.observe(durationSecs);
  }
  return result;
 } catch (error) {
  const durationSecs = (Date.now() - startMs) / 1000;
  if (labels && Object.keys(labels).length > 0) {
   histogram.observe(labels, durationSecs);
  } else {
   histogram.observe(durationSecs);
  }
  throw error;
 }
}
