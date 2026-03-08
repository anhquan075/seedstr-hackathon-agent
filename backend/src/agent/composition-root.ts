import { SeedstrAPIClient } from './api-client.js';
import { EventBus } from './core/event-bus.js';
import { Orchestrator } from './core/orchestrator.js';
import { Watcher } from './modules/watcher.js';
import { SeedstrPoller } from './modules/poller.js';
import { Brain } from './modules/brain.js';
import { Builder } from './modules/builder.js';
import { Packer } from './modules/packer.js';
import { Bridge } from './modules/bridge.js';

import { logger } from './logger.js';
import { SSEServer } from './sse-server.js';
import type { AgentConfig } from './types.js';
import type { Database } from './db.js';

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
  apiClient.getMe()
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

  // 4. Wire event handlers for critical flows
  // ============================================

  eventBus.on('job_received', async (data) => {
    // Pipeline start
  });

  return {
    eventBus,
    orchestrator,
    watcher,
    seedstrPoller,
    brain,
    builder,
    packer,
    bridge,
    sseServer,
    async start() {
      watcher.start();
      seedstrPoller.start();
      logger.info('[CompositionRoot] Agent pipeline started');
    },
    async stop() {
      watcher.stop();
      seedstrPoller.stop();
      logger.info('[CompositionRoot] Agent pipeline stopped');
    }
  };
}
