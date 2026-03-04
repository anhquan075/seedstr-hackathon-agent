import { EventEmitter } from 'events';
import Pusher from 'pusher-js';
import { SeedstrAPIClient } from './api-client.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { SSEServer } from './sse-server.js';
import { createAgentPipeline, type ComposedAgentPipeline } from './composition-root.js';
import type { AgentConfig } from './types.js';

/**
 * Runner v2 — Thin HTTP/SSE layer over ComposedAgentPipeline
 * 
 * Responsibilities:
 * - Initialize the event-driven agent pipeline
 * - Expose SSE/HTTP control endpoints
 * - Handle manual prompts and control commands
 * - Manage HTTP lifecycle
 * 
 * All job processing is delegated to ComposedAgentPipeline modules:
 * Watcher → Brain → Builder → Packer → Bridge → SSE clients
 */
export class AgentRunner extends EventEmitter {
  private isRunning = false;
  private sseServer: SSEServer;
  private pipeline?: ComposedAgentPipeline;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.sseServer = new SSEServer(8080); // Port 8080 for both local and production
    this.setupSSEHandlers();
  }

  /**
   * Initialize and start the agent pipeline
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Agent already running');
      return;
    }

    try {
      logger.info('Starting AgentRunner v2 with ComposedAgentPipeline...');

      // Initialize composition root — wires all 6 modules
      this.pipeline = await createAgentPipeline(this.config, this.sseServer);
      
      // Start pipeline (Watcher polling + all modules)
      await this.pipeline.start();
      logger.info('Agent pipeline started');

      this.isRunning = true;
      this.emit('started');

    } catch (error) {
      logger.error('Failed to start AgentRunner', error);
      throw error;
    }
  }

  /**
   * Stop the agent pipeline and cleanup
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Agent not running');
      return;
    }

    try {
      logger.info('Stopping AgentRunner...');

      // Stop pipeline (Watcher polling + all modules)
      if (this.pipeline) {
        await this.pipeline.stop();
      }

      this.isRunning = false;
      this.emit('stopped');
      logger.info('Agent stopped');

    } catch (error) {
      logger.error('Error stopping AgentRunner', error);
      throw error;
    }
  }

  /**
   * Setup SSE control handlers
   * These are called by the frontend via SSE control channel
   */
  private setupSSEHandlers(): void {
    this.sseServer.setControlHandlers({
      // Pause polling
      stop: async () => {
        if (this.pipeline) {
          // Pause watcher polling (jobs in progress continue)
          logger.info('[Control] Pause requested');
          // TODO: Implement watcher.pause() method
        }
      },

      // Resume polling
      start: async () => {
        if (this.pipeline) {
          // Resume watcher polling
          logger.info('[Control] Resume requested');
          // TODO: Implement watcher.resume() method
        }
      },

      // Submit manual prompt (debugging)
      prompt: async (prompt: string) => {
        logger.info('[Control] Manual prompt received', { prompt });
        // TODO: Implement manual prompt handling
        // This would call Brain module directly for testing
      },

      // Get current state
      getState: () => {
        return {
          running: this.isRunning,
          timestamp: Date.now(),
        };
      },

      // Get execution history (not implemented in v2 yet)
      getHistory: () => {
        return [];
      },

      // Replay last execution
      replayLast: async () => {
        logger.info('[Control] Replay last requested');
        // TODO: Implement replay logic
      },
    });
  }

  /**
   * Expose SSE server for HTTP integration
   */
  getSSEServer(): SSEServer {
    return this.sseServer;
  }

  /**
   * Check if agent is running
   */
  isAgentRunning(): boolean {
    return this.isRunning;
  }
}

/**
 * Main entry point — initialize and start the agent
 */
export async function createAndStartAgent(agentConfig: AgentConfig): Promise<AgentRunner> {
  const runner = new AgentRunner(agentConfig);
  await runner.start();
  return runner;
}

export default AgentRunner;
