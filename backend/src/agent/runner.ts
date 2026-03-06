import { EventEmitter } from 'events';
import Pusher from 'pusher-js';
import { SeedstrAPIClient } from './api-client.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { SSEServer } from './sse-server.js';
import { createAgentPipeline, type ComposedAgentPipeline } from './composition-root.js';
import { database, type Database } from './db.js';
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
  private db?: Database;
  private lastExecutionState?: { prompt: string; jobId: string; timestamp: number };

  constructor(config: AgentConfig, db?: Database) {
    super();
    this.config = config;
    this.db = db;
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

      // Initialize composition root — wires all 6 modules with database
      this.pipeline = await createAgentPipeline(this.config, this.sseServer, this.db);
      
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
      stop: async () => {
        if (this.pipeline) {
          logger.info('[Control] Pause requested');
          this.pipeline.watcher.pause();
          logger.info('[Control] Agent polling paused (in-progress jobs continue)');
        }
      },

      start: async () => {
        if (this.pipeline) {
          logger.info('[Control] Resume requested');
          this.pipeline.watcher.resume();
          logger.info('[Control] Agent polling resumed');
        }
      },

      prompt: async (prompt: string) => {
        if (!this.pipeline) {
          logger.warn('[Control] Pipeline not initialized');
          return;
        }
        logger.info('[Control] Manual prompt received', { prompt });
        
        try {
const jobId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const budget = 100000;
          
          
          const brainOutput = await this.pipeline.brain.generateFromPrompt(jobId, prompt, budget);
          
          this.lastExecutionState = {
            prompt,
            jobId,
            timestamp: Date.now(),
          };
          
          logger.info('[Control] Manual prompt completed', {
            jobId,
            responseLength: String(brainOutput).length,
          });
          
        } catch (error) {
          logger.error('[Control] Manual prompt processing failed:', error);
        }
      },

      // Get current agent state
      getState: () => {
        return {
          running: this.isRunning,
          paused: this.pipeline ? this.pipeline.watcher.isPaused() : false,
          timestamp: Date.now(),
        };
      },

      getHistory: () => {
        return this.lastExecutionState ? [this.lastExecutionState] : [];
      },

      replayLast: async () => {
        if (!this.pipeline || !this.lastExecutionState) {
          logger.warn('[Control] No previous execution to replay');
          return;
        }
        
        logger.info('[Control] Replay last requested', { previousJobId: this.lastExecutionState.jobId });
        
        try {
          const { prompt } = this.lastExecutionState;
          const replayJobId = `replay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const budget = 100000;
          
          logger.info('[Control] Replaying execution with jobId:', replayJobId);
          
          const brainOutput = await this.pipeline.brain.generateFromPrompt(replayJobId, prompt, budget);
          
          this.lastExecutionState = {
            prompt,
            jobId: replayJobId,
            timestamp: Date.now(),
          };
          
          logger.info('[Control] Replay completed', {
            replayJobId,
            responseLength: String(brainOutput).length,
          });
          
        } catch (error) {
          logger.error('[Control] Replay failed:', error);
        }
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
