import type { EventBus } from '../core/event-bus.js';
import type { SSEServer } from '../sse-server.js';
import { logger } from '../logger.js';

/**
 * Bridge Module: Connects backend events to frontend via SSE
 *
 * Listens to job_completed events from EventBus and broadcasts
 * to all connected SSE clients with full LLM output included.
 *
 * **Critical Flow**: BrainOutput.rawResponse → job_completed event
 * → Bridge.broadcast() → SSE clients → Frontend modal/card display
 */
export class Bridge {
  constructor(private eventBus: EventBus, private sseServer: SSEServer) {}

  /**
   * Start listening to job_completed events and broadcast to SSE clients
   */
  start(): void {
    logger.info('[Bridge] Starting...');

    // Listen to job_completed events from Packer module
    // These events include output + outputTruncated
    this.eventBus.on('job_completed', (data) => {
      logger.info('[Bridge] Received job_completed event', {
        id: data.id,
        outputLength: (data.output as string)?.length ?? 0,
        truncatedLength: (data.outputTruncated as string)?.length ?? 0,
      });

      // Broadcast to all SSE clients
      // Frontend will use:
      // - data.output for JobDetailModal (full LLM response)
      // - data.outputTruncated for JobCard in "Recently Completed" list
      this.sseServer.broadcast({
        type: 'job_completed',
        timestamp: Date.now(),
        data: {
          id: data.id,
          responseId: data.responseId,
          output: data.output, // Full LLM response for modal
          outputTruncated: data.outputTruncated, // Truncated for list
          timestamp: data.timestamp,
        },
      });

      logger.info('[Bridge] Broadcasted to SSE clients');
    });

    // Listen to other job events for pipeline tracking
    this.eventBus.on('job_received', (data) => {
      logger.info('[Bridge] Received job_received event', { id: data.id });
      this.sseServer.broadcast({
        type: 'job_received',
        timestamp: Date.now(),
        data: {
          id: data.id,
          prompt: data.prompt,
          budget: data.budget,
          timestamp: data.timestamp,
        },
      });
    });

    this.eventBus.on('job_processing', (data) => {
      logger.info('[Bridge] Received job_processing event', { id: data.id, stage: data.stage });
      this.sseServer.broadcast({
        type: 'job_processing',
        timestamp: Date.now(),
        data: {
          id: data.id,
          stage: data.stage,
          timestamp: data.timestamp,
        },
      });
    });

    this.eventBus.on('job_failed', (data) => {
      logger.info('[Bridge] Received job_failed event', { id: data.id, error: data.error });
      this.sseServer.broadcast({
        type: 'job_failed',
        timestamp: Date.now(),
        data: {
          id: data.id,
          error: data.error,
          timestamp: data.timestamp,
        },
      });
    });

    this.eventBus.on('job_approval_request', (data) => {
      logger.info('[Bridge] Received job_approval_request event', {
        id: data.id,
        action: data.action,
        autoApproved: data.autoApproved,
      });

      this.sseServer.broadcast({
        type: 'job_approval_request',
        timestamp: Date.now(),
        data: data as unknown as Record<string, unknown>,
      });
    });
    this.eventBus.on('job_accepted', (data) => {
      this.sseServer.broadcast({
        type: 'job_accepted',
        timestamp: Date.now(),
        data: {
          id: data.id,
          prompt: data.prompt,
          budget: data.budget,
          jobType: data.jobType,
          timestamp: data.timestamp,
        },
      });
    });

    this.eventBus.on('job_generated', (data) => {
      this.sseServer.broadcast({
        type: 'job_generated',
        timestamp: Date.now(),
        data: {
          id: data.id,
          responseType: data.responseType,
          timestamp: data.timestamp,
        },
      });
    });


    logger.info('[Bridge] Started. Listening to event bus...');
  }

  stop(): void {
    logger.info('[Bridge] Stopping...');
    // Remove listeners for bridge events
    this.eventBus.removeAllListeners('job_completed');
    this.eventBus.removeAllListeners('job_received');
    this.eventBus.removeAllListeners('job_processing');
    this.eventBus.removeAllListeners('job_failed');
    this.eventBus.removeAllListeners('job_approval_request');
    logger.info('[Bridge] Stopped.');
  }
}
