import { EventEmitter } from 'events';
import Pusher from 'pusher-js';
import { SeedstrAPIClient } from './api-client.js';
import { LLMClient } from './llm-client.js';
import { ProjectBuilder } from './project-builder.js';
import { logger } from './logger.js';
import { config } from './config.js';
import {
  webSearchTool,
  calculatorTool,
  createFileTool,
  finalizeProjectTool,
  generateImageTool,
  httpRequestTool,
} from './tools/index.js';
import { setActiveProjectBuilder } from './tools/project-tools.js';
import {
  getFrontendGenerationPrompt,
  getSystemPrompt,
} from './prompts.js';
import type { SeedstrJob } from './types.js';

export interface AgentRunnerConfig {
  seedstrApiKey: string;
  openrouterApiKey: string;
  pusherKey?: string;
  pusherCluster?: string;
  pollInterval?: number;
  models?: string[];
}
export class AgentRunner extends EventEmitter {
  private apiClient: SeedstrAPIClient;
  private llmClient: LLMClient;
  private config?: AgentRunnerConfig;
  private pusher?: Pusher;
  private isRunning = false;
  private pollTimer?: NodeJS.Timeout;
  private pollInterval: number;
  private activeJobs: Map<string, Promise<void>> = new Map();
  private readonly MAX_CONCURRENT_JOBS = 3;
  constructor(config: AgentRunnerConfig) {
    super();
    this.apiClient = new SeedstrAPIClient(config.seedstrApiKey);
    this.llmClient = new LLMClient({
      openrouterApiKey: config.openrouterApiKey,
      models: config.models,
    });
    this.pollInterval = config.pollInterval || 120000;

    if (config.pusherKey && config.pusherCluster) {
      this.pusher = new Pusher(config.pusherKey, {
        cluster: config.pusherCluster,
      });
    }
  }
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Agent already running');
      return;
    }
    // Connect to WebSocket if available
    if (this.pusher) {
      this.connectWebSocket();
    }

    // Start polling loop
    this.startPolling();

    this.emit('started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info('Stopping agent runner');

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }

    if (this.pusher) {
      this.pusher.disconnect();
    }

    this.emit('stopped');
  }

  private connectWebSocket(): void {
    logger.info('Connecting to Pusher WebSocket');


    const pusherKey = this.config?.pusherKey;
    const pusherCluster = this.config?.pusherCluster;

    if (!pusherKey || !pusherCluster) {
      logger.warn('Pusher credentials missing, skipping WebSocket');
      return;
    }

    this.pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,

    });

    const channel = this.pusher.subscribe('jobs');
    channel.bind('new-job', (data: { job: SeedstrJob }) => {
      logger.info('Received new job via WebSocket', data);
      this.handleJob(data.job);
    });

    this.pusher.connection.bind('connected', () => {
      logger.info('WebSocket connected');
      this.emit('websocket:connected');
    });

    this.pusher.connection.bind('disconnected', () => {
      logger.warn('WebSocket disconnected');
      this.emit('websocket:disconnected');
    });
  }

  private startPolling(): void {
    const interval = this.config?.pollInterval ?? 120000;

    const poll = async () => {
      if (!this.isRunning) return;

      try {
        logger.debug('Polling for jobs');
        const response = await this.apiClient.getJobs(50);

        // Find unprocessed jobs
        const newJobs = response.jobs.filter(
          (job) => !config.isJobProcessed(job.id) && job.status === 'OPEN'
        );

        if (newJobs.length > 0) {
          logger.info(`Found ${newJobs.length} new jobs`);
          
          // Process jobs up to MAX_CONCURRENT_JOBS
          for (const job of newJobs) {
            // Skip if already processing this job
            if (this.activeJobs.has(job.id)) continue;
            
            // Wait if we're at max capacity
            if (this.activeJobs.size >= this.MAX_CONCURRENT_JOBS) {
              logger.info(`Max concurrent jobs (${this.MAX_CONCURRENT_JOBS}) reached, waiting...`);
              break;
            }
            
            // Start job processing (non-blocking)
            const jobPromise = this.handleJob(job).finally(() => {
              this.activeJobs.delete(job.id);
            });
            
            this.activeJobs.set(job.id, jobPromise);
          }
        }
      } catch (error) {
        logger.error('Polling error', error);
        this.emit('error', error);
      }

      // Schedule next poll
      this.pollTimer = setTimeout(poll, interval);
    };

    // Start immediate first poll
    poll();
  }

  private async handleJob(job: SeedstrJob): Promise<void> {
    // Check if already processed
    if (config.isJobProcessed(job.id)) {
      logger.debug(`Job ${job.id} already processed, skipping`);
      return;
    }

    logger.info(`Processing job ${job.id}: ${job.prompt}`);
    this.emit('job:start', job);

    try {
      // Create project builder
      const projectBuilder = new ProjectBuilder(job.id);
      setActiveProjectBuilder(projectBuilder);

      // Generate frontend with LLM
      const systemPrompt = getSystemPrompt();
      const userPrompt = getFrontendGenerationPrompt(job.prompt);

      const tools = {
        web_search: webSearchTool,
        calculator: calculatorTool,
        create_file: createFileTool,
        finalize_project: finalizeProjectTool,
        generate_image: generateImageTool,
        http_request: httpRequestTool,
      };

      logger.info('Starting LLM generation');
      const result = await this.llmClient.generate({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools,
        maxSteps: 20,
        budget: job.budget, // Pass job budget for smart model selection
        stream: false, // Set to true for streaming in future
      });

      logger.info('Generation complete', {
        textLength: result.text.length,
        toolCalls: result.toolCalls.length,
      });

      // Create ZIP
      logger.info('Creating project ZIP');
      const zipBuffer = await projectBuilder.createZip();

      // Upload to Seedstr
      logger.info('Uploading to Seedstr');
      const uploadResponse = await this.apiClient.uploadFiles([
        {
          name: `project-${job.id}.zip`,
          content: zipBuffer.toString('base64'),
          type: 'application/zip',
        },
      ]);

      // Submit response
      logger.info('Submitting response');
      const submitResponse = await this.apiClient.submitResponse(
        job.id,
        `Generated frontend application based on requirements. Files: ${projectBuilder.getFiles().length}`,
        uploadResponse.files
      );

      logger.info('Job completed successfully', submitResponse);
      this.emit('job:complete', { job, result: submitResponse });

      // Mark as processed
      config.addProcessedJob(job.id);

      // Cleanup
      await projectBuilder.cleanup();
    } catch (error) {
      logger.error('Job processing failed', error);
      this.emit('job:error', { job, error });
    }
  }
}
