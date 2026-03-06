/**
 * Composition Root / Dependency Injection Container
 * 
 * Wires all 7 modular components (Watcher, SeedstrPoller, Brain, Builder, Packer, Bridge, Orchestrator)
 * to a central EventBus with proper initialization order.
 * 
 * Architecture:
 * - EventBus: Central event coordination hub
 * - Watcher: Monitors .agent-prompt file for new jobs (local polling)
 * - SeedstrPoller: Polls Seedstr API v2 for jobs (live Seedstr polling)
 * - Brain: Invokes LLM to think through problem
 * - Builder: Compiles solution (code + tests)
 * - Packer: Uploads files & submits response
 * - Bridge: Broadcasts events to SSE clients
 * - SSEServer: Real-time event stream to frontend
 */

import { SeedstrAPIClient } from './api-client.js';
import { EventBus } from './core/event-bus.js';
import { Orchestrator } from './core/orchestrator.js';
import { Database } from './db.js';
import { logger } from './logger.js';
import { Brain } from './modules/brain.js';
import { Bridge } from './modules/bridge.js';
import { Builder } from './modules/builder.js';
import { Packer } from './modules/packer.js';
import { SeedstrPoller } from './modules/poller.js';
import { Watcher } from './modules/watcher.js';
import { SSEServer } from './sse-server.js';
import type { AgentConfig } from './types.js';

export interface ComposedAgentPipeline {
  eventBus: EventBus;
  orchestrator: Orchestrator;
  watcher: Watcher;
  seedstrPoller: SeedstrPoller;
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
  sseServer: SSEServer,
  database?: Database // Optional: database for persistent duplicate prevention
): ComposedAgentPipeline {

  logger.info('[CompositionRoot] Wiring agent pipeline...');

  // 1. Create central EventBus - all modules communicate via this
  const eventBus = new EventBus();
  logger.debug('[CompositionRoot] EventBus created');

  // 2. Create Orchestrator - manages overall agent lifecycle and state
  const orchestrator = new Orchestrator(eventBus, config, database);
  logger.debug('[CompositionRoot] Orchestrator created');

  // 3. Create worker modules in order of execution flow:

  // Watcher: Monitors for incoming jobs (local file polling)
  const watcher = new Watcher(eventBus, config);
  logger.debug('[CompositionRoot] Watcher created');

  // SeedstrPoller: Polls Seedstr API for incoming jobs (live Seedstr polling)
  // Initialize capabilities with real agent reputation from Seedstr API
let agentCapabilities = {
  agentReputation: config.reputation || 0,
  minBudgetRequired: 0.5, // 0.5 USD minimum requirement
  maxConcurrentJobs: 3, // Support up to 3 concurrent jobs
  get activeJobCount() { return orchestrator.getActiveJobCount(); }, // Dynamically linked to orchestrator
};

// Fetch real agent reputation from Seedstr API (async, non-blocking startup)
const apiClient = new SeedstrAPIClient(config.seedstrApiKey || config.apiKey);
apiClient.getMeV2()
  .then((agentData) => {
    if (agentData && typeof agentData.reputation === 'number') {
      agentCapabilities.agentReputation = agentData.reputation;
      logger.info(`[CompositionRoot] Updated agent reputation to ${agentData.reputation}`);
    }
    if (agentData && agentData.verification && agentData.verification.isVerified === false) {
      logger.error('************************************************');
      logger.error('AGENT NOT VERIFIED ON SEEDSTR!');
      logger.error('Please verify your agent via Twitter as per skill.md');
      logger.error('Agent ID: ' + agentData.id);
      logger.error('************************************************');
    } else if (agentData && agentData.verification && agentData.verification.isVerified === true) {
      logger.info(`[CompositionRoot] Agent verified: ${agentData.verification.ownerTwitter}`);
    }
  })
  .catch((error) => {
    logger.warn('[CompositionRoot] Failed to fetch agent reputation, using default (0):', error);
    // Falls back to config.reputation or 0
  });

  const seedstrPoller = new SeedstrPoller(eventBus, config, agentCapabilities);
  logger.debug('[CompositionRoot] SeedstrPoller created');

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

  // Job lifecycle is managed by orchestrator's in-flight tracking
  // No additional duplicate prevention needed here

  // 4. Wire event handlers for critical flows
  // ============================================

  // Register SWARM deadline when job is received

  eventBus.on('job_received', async (data) => {
    try {
      // 1. Orchestrator handled it synchronously and added to in-flight
      // 2. Register SWARM deadline
      const jobType = data.jobType ?? 'STANDARD';
      packer.registerSwarmDeadline(data.id, jobType);
      logger.debug(`[CompositionRoot] Registered ${jobType} deadline for job ${data.id}`);

      // 3. Start processing
      logger.info(`[CompositionRoot] Starting generation for job ${data.id}`);
      const budget = data.budget || 1;
      const skills = data.skills ?? [];
      const description = data.description ?? '';
      // Always attempt to accept the job (STANDARD or SWARM) before starting generation
      // This acts as a remote lock in multi-instance environments
      await packer.acceptJob({
        id: data.id,
        prompt: data.prompt,
        budget,
        skills,
        jobType,
      });

      const brainOutput = await brain.generateFromPrompt(data.id, data.prompt, budget);
      
      const responseType = brain.getResponseType({
        budget,
        description,
        prompt: data.prompt,
      });

      // Emit job_generated to match template workflow
      eventBus.emit('job_generated', {
        id: data.id,
        output: brainOutput,
        responseType,
        timestamp: Date.now(),
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
        isLocal: data.isLocal,
      });

      logger.info(`[CompositionRoot] Job ${data.id} completed`);
      // Mark as completed in database to prevent re-processing
      await database?.markJobProcessed(data.id, 'completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[CompositionRoot] Processing failed for job ${data.id}:`, error);
      
      // Handle 409 Conflict: job already submitted (treat as success)
      if (errorMessage.includes('409') || errorMessage.includes('Conflict') || errorMessage.includes('already submitted')) {
        logger.info(`[CompositionRoot] Job ${data.id} already submitted (409 Conflict) - marking as completed`);
        // Mark as completed in database to prevent retries
        await database?.markJobProcessed(data.id, 'completed');
        eventBus.emit('job_completed', {
          id: data.id,
          output: '(Job already submitted on Seedstr)',
          outputTruncated: '(Already submitted)',
          responseId: `conflict-${data.id}`,
          timestamp: Date.now(),
          responseType: 'TEXT',
        });
        return;
      }
      
      // Mark job as failed for retry on next poll
      logger.info(`[CompositionRoot] Marking job ${data.id} as failed for potential retry`);
      await database?.markJobProcessed(data.id, 'failed');
      
      eventBus.emit('job_failed', {
        id: data.id,
        error: `Job failed: ${errorMessage}`,
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
    seedstrPoller,
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

        seedstrPoller.start();
        logger.info('[ComposedAgentPipeline] SeedstrPoller started');
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

        seedstrPoller.stop();
        logger.info('[ComposedAgentPipeline] SeedstrPoller stopped');

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
