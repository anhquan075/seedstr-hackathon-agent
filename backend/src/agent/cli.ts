#!/usr/bin/env node
import 'dotenv/config';
import { PreflightChecker } from './preflight-check.js';
import { database } from './db.js';
import type { SeedstrJob } from './types.js';

import { Command } from 'commander';
import { AgentRunner } from './runner.js';
import { config } from './config.js';
import { logger } from './logger.js';

const program = new Command();

program
  .name('seedstr-agent')
  .description('Autonomous AI agent for the Seedstr hackathon platform')
  .version('1.0.0');

program
  .command('start')
  .description('Start the agent runner')
  .option('--api-key <key>', 'Seedstr API key (or use SEEDSTR_API_KEY env)')
  .option('--openrouter-key <key>', 'OpenRouter API key (or use OPENROUTER_API_KEY env)')
  .option('--models <models>', 'Comma-separated list of OpenRouter models')
  .option('--pusher-key <key>', 'Pusher key (or use PUSHER_KEY env)')

  .option('--pusher-cluster <cluster>', 'Pusher cluster (or use PUSHER_CLUSTER env)')
  .option('--poll-interval <ms>', 'Poll interval in milliseconds', '10000') // 10s for faster job pickup
  .option('--verbose', 'Enable verbose logging')
  .action(async (options) => {
    const seedstrApiKey =
      options.apiKey || process.env.SEEDSTR_API_KEY || config.get('apiKey');
    const openrouterApiKey =
      options.openrouterKey || process.env.OPENROUTER_API_KEY;
    const models = options.models?.split(',').map((m: string) => m.trim());
    const pusherKey = options.pusherKey || process.env.PUSHER_KEY;
    const pusherCluster = options.pusherCluster || process.env.PUSHER_CLUSTER;

    if (!seedstrApiKey) {
      logger.error('Seedstr API key is required. Use --api-key or SEEDSTR_API_KEY env');
      process.exit(1);
    }


    if (!openrouterApiKey) {
      logger.error('OpenRouter API key is required. Use --openrouter-key or OPENROUTER_API_KEY env');
      process.exit(1);
    }
    if (options.verbose) {
      logger.setLevel('debug');
    }
    // Phase 1: Run preflight verification checks
    logger.info('\n=== PHASE 1: Preflight Verification ===\n');
    const preflight = new PreflightChecker(seedstrApiKey);
    const preflightResult = await preflight.runAllChecks();

    if (!preflightResult.verified) {
      logger.error('❌ Preflight checks FAILED. Agent cannot start.');
      logger.error('Errors:');
      preflightResult.errors.forEach((err) => logger.error(`  - ${err}`));
      process.exit(1);
    }

    // Generate and save preflight report
    const preflightReport = await preflight.generateReport(preflightResult);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportFilename = `plans/reports/seedstr-preflight-${timestamp}.md`;
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const reportDir = path.dirname(reportFilename);
      await fs.mkdir(reportDir, { recursive: true });
      await fs.writeFile(reportFilename, preflightReport);
      logger.info(`✓ Preflight report saved: ${reportFilename}`);
    } catch (writeErr) {
      logger.warn(`Could not save preflight report: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`);
    }

    logger.info('\n=== Starting Agent Runner ===\n');
    
    // Initialize database connection
    logger.info('Connecting to database...');
    await database.connect();
    if (database.isAvailable()) {
      logger.info('✓ Database connected successfully');
    } else {
      logger.warn('⚠ Database not available, using in-memory fallback');
    }
    
    logger.info('Starting Seedstr Agent');


    logger.info('Starting Seedstr Agent');
    logger.info('Configuration:', {
      seedstrApiKey: '***' + seedstrApiKey.slice(-4),
      openrouterApiKey: '***' + openrouterApiKey.slice(-4),
      models: models || 'default',
      pusherEnabled: !!pusherKey,
      pollInterval: options.pollInterval,
    });
    const runner = new AgentRunner({
      apiKey: seedstrApiKey,
      seedstrApiKey,
      openrouterApiKey,
      models,
      pusherKey,
      pusherCluster,
      pollInterval: parseInt(options.pollInterval, 10),
    });
    // Event handlers
    runner.on('started', () => {
      logger.info('Agent started successfully');
    });

    runner.on('job:start', (job) => {
      logger.info(`[JOB ${job.id}] Started processing`);
    });

    runner.on('job:complete', ({ job }: { job: SeedstrJob; result: unknown }) => {
      logger.info(`[JOB ${job.id}] Completed successfully`);
    });

    runner.on('job:error', ({ job, error }: { job: SeedstrJob; error: Error }) => {
      logger.error(`[JOB ${job.id}] Failed:`, error);
    });

    runner.on('error', (error) => {
      logger.error('Runner error:', error);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down...');
      await runner.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down...');
      await runner.stop();
      process.exit(0);
    });

    // Start the agent
    await runner.start();
  });

program
  .command('config')
  .description('Manage agent configuration')
  .option('--set-api-key <key>', 'Set Seedstr API key')
  .option('--clear', 'Clear all configuration')
  .action((options) => {
    if (options.setApiKey) {
      config.set('apiKey', options.setApiKey);
      logger.info('API key saved');
    }

    if (options.clear) {
      config.clear();
      logger.info('Configuration cleared');
    }

    if (!options.setApiKey && !options.clear) {
      logger.info('Current configuration:');
      logger.info('API Key:', config.get('apiKey') ? '***' + config.get('apiKey')?.slice(-4) : 'not set');
      logger.info('Poll Interval:', config.get('pollInterval'), 'ms');
      logger.info('Processed Jobs:', (config.get('processedJobs') || []).length);
    }
  });

program.parse();
