/**
 * Composition Root / Dependency Injection Container
 * 
 * Wires all 6 modular components (Watcher, Brain, Builder, Packer, Bridge, Orchestrator)
 * to a central EventBus with proper initialization order.
 * 
 * Architecture:
 * - EventBus: Central event coordination hub
 * - Watcher: Monitors .agent-prompt file for new jobs
 * - Brain: Invokes LLM to think through problem
 * - Builder: Compiles solution (code + tests)
 * - Packer: Uploads files & submits response
 * - Bridge: Broadcasts events to SSE clients
 * - SSEServer: Real-time event stream to frontend
 */

import type { AgentConfig } from './types.js';
import { EventBus } from './core/event-bus.js';
import { Orchestrator } from './core/orchestrator.js';
import { Watcher } from './modules/watcher.js';
import { Brain } from './modules/brain.js';
import { Builder } from './modules/builder.js';
import { Packer } from './modules/packer.js';
import { Bridge } from './modules/bridge.js';
import { SSEServer } from './sse-server.js';
import { logger } from './logger.js';

export interface ComposedAgentPipeline {
  eventBus: EventBus;
  orchestrator: Orchestrator;
  watcher: Watcher;
  brain: Brain;
  builder: Builder;
  packer: Packer;
  bridge: Bridge;
  sseServer: SSEServer;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * Compose and wire all agent modules
 * Enables dependency injection, testability, and clear module responsibilities
 */
export function createAgentPipeline(
  config: AgentConfig,
  sseServer: SSEServer
): ComposedAgentPipeline {
  logger.info('[CompositionRoot] Wiring agent pipeline...');

  // 1. Create central EventBus - all modules communicate via this
  const eventBus = new EventBus();
  logger.debug('[CompositionRoot] EventBus created');

  // 2. Create Orchestrator - manages overall agent lifecycle and state
  const orchestrator = new Orchestrator(eventBus, config);
  logger.debug('[CompositionRoot] Orchestrator created');

  // 3. Create worker modules in order of execution flow:

  // Watcher: Monitors for incoming jobs
  const watcher = new Watcher(eventBus, config);
  logger.debug('[CompositionRoot] Watcher created');

  // Brain: Thinks through problem using LLM
  const brain = new Brain(eventBus, config);
  logger.debug('[CompositionRoot] Brain created');

  // Builder: Compiles solution code
  const builder = new Builder(eventBus, config);
  logger.debug('[CompositionRoot] Builder created');

  // Packer: Uploads files & submits response to Seedstr API
  const packer = new Packer(eventBus, config);
  logger.debug('[CompositionRoot] Packer created');

  // Bridge: Broadcasts internal events to SSE clients
  const bridge = new Bridge(eventBus, sseServer);
  logger.debug('[CompositionRoot] Bridge created');

  // 4. Wire event handlers for critical flows
  // ============================================

  // Register SWARM deadline when job is received
  eventBus.on('job_received', (data) => {
    const jobType = data.jobType ?? 'STANDARD';
    packer.registerSwarmDeadline(data.id, jobType);
    logger.debug(`[CompositionRoot] Registered ${jobType} deadline for job ${data.id}`);
  });

  eventBus.on('job_received', async (data) => {
    try {
      logger.info(`[CompositionRoot] Starting generation for job ${data.id}`);
      const budget = data.budget || 1;
      const jobType = data.jobType ?? 'STANDARD';
      const skills = data.skills ?? [];
      const description = data.description ?? '';

      if (jobType === 'SWARM') {
        await packer.acceptSwarmJob({
          id: data.id,
          prompt: data.prompt,
          budget,
          skills,
          jobType,
        });
      }

      const brainOutput = await brain.generateFromPrompt(data.id, data.prompt, budget);

      // Detect response type (TEXT vs FILE)
      const responseType = brain.getResponseType({
        budget,
        description,
        prompt: data.prompt,
      });

      eventBus.emit('job_processing', {
        id: data.id,
        stage: 'building',
        timestamp: Date.now(),
      });
      await builder.buildFromOutput(data.id, brainOutput);
      const buildDir = builder.getBuildDir(data.id);

      eventBus.emit('job_processing', {
        id: data.id,
        stage: 'submitting',
        timestamp: Date.now(),
      });
      await packer.packAndSubmit(data.id, buildDir, brainOutput, responseType, {
        prompt: data.prompt,
        budget,
        skills,
        jobType,
      });

      logger.info(`[CompositionRoot] Job ${data.id} completed`);
    } catch (error) {
      logger.error(`[CompositionRoot] Processing failed for job ${data.id}:`, error);
      eventBus.emit('job_failed', {
        id: data.id,
        error: `Job failed: ${error instanceof Error ? error.message : String(error)}`,
        stage: 'generating',
        timestamp: Date.now(),
      });
    }
  });

  // 5. Return composed pipeline interface
  const pipeline: ComposedAgentPipeline = {
    eventBus,
    orchestrator,
    watcher,
    brain,
    builder,
    packer,
    bridge,
    sseServer,

    /**
     * Start the agent pipeline
     * Sequence: SSE Server → Orchestrator → Watcher begins polling
     */
    async start() {
      logger.info('[ComposedAgentPipeline] Starting...');

      try {
        // 1. Start SSE server for frontend communication
        await sseServer.start();
        logger.info('[ComposedAgentPipeline] SSE server started');

        // 2. Orchestrator is already initialized in constructor
        logger.info('[ComposedAgentPipeline] Orchestrator ready');

        bridge.start();
        logger.info('[ComposedAgentPipeline] Bridge started');

        watcher.start();
        logger.info('[ComposedAgentPipeline] Watcher polling started');

        logger.info('[ComposedAgentPipeline] ✓ Agent pipeline RUNNING');
      } catch (error) {
        logger.error('[ComposedAgentPipeline] Startup failed:', { error });
        throw error;
      }
    },

    /**
     * Gracefully stop the agent pipeline
     * Sequence: Watcher (stop polling) → Orchestrator (cleanup) → SSE Server (disconnect)
     */
    async stop() {
      logger.info('[ComposedAgentPipeline] Stopping...');

      try {
        // 1. Stop watcher polling
        watcher.stop();
        logger.info('[ComposedAgentPipeline] Watcher polling stopped');

        bridge.stop();
        logger.info('[ComposedAgentPipeline] Bridge stopped');

        logger.info('[ComposedAgentPipeline] Orchestrator cleaned up');

        // 3. Stop SSE server
        await sseServer.stop();
        logger.info('[ComposedAgentPipeline] SSE server stopped');

        // 4. Clear all event listeners to prevent memory leaks
        eventBus.removeAllListeners();
        logger.info('[ComposedAgentPipeline] Event listeners cleared');

        logger.info('[ComposedAgentPipeline] ✓ Agent pipeline STOPPED');
      } catch (error) {
        logger.error('[ComposedAgentPipeline] Shutdown error:', { error });
        throw error;
      }
    },
  };

  return pipeline;
}

export default createAgentPipeline;
