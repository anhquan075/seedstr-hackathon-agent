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
import { SSEServer } from './sse-server.js';

export interface AgentRunnerConfig {
  seedstrApiKey: string;
  openrouterApiKey: string;
  pusherKey?: string;
  pusherCluster?: string;
  pollInterval?: number;
  models?: string[];
  ssePort?: number;
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
  private sseServer: SSEServer;
  constructor(config: AgentRunnerConfig) {
    super();
    this.config = config; // FIX: Assign config to instance property for later reference
    this.sseServer = new SSEServer(config.ssePort ?? 3001);
    this.apiClient = new SeedstrAPIClient(config.seedstrApiKey);
    this.llmClient = new LLMClient({
      openrouterApiKey: config.openrouterApiKey,
      models: config.models,
    });
    this.pollInterval = config.pollInterval || 30000;

    if (config.pusherKey && config.pusherCluster) {
      this.pusher = new Pusher(config.pusherKey, {
        cluster: config.pusherCluster,
      });
    }
  }

  /**
   * Retry helper with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 1000,
    operationName = 'operation'
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries - 1) {
          logger.error(`${operationName} failed after ${maxRetries} attempts`, error);
          throw error;
        }
        const delay = baseDelayMs * Math.pow(2, attempt);
        logger.warn(`${operationName} attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Unreachable');
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
    // Start SSE server
    this.sseServer.start();
    this.isRunning = true;

    // Start polling loop
    this.startPolling();

    this.emit('started');
    this.sseServer.broadcast({
      type: 'agent_started',
      timestamp: Date.now(),
      data: { uptime: process.uptime() * 1000, status: 'running' },
    });
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

    this.sseServer.stop();
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
    const interval = this.pollInterval; // Use instance property (set to 30000 in constructor)

    const poll = async () => {
      if (!this.isRunning) return;

      try {
        logger.debug('Polling for jobs');
        this.sseServer.broadcast({
          type: 'polling',
          timestamp: Date.now(),
          data: { interval },
        });
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
    this.sseServer.broadcast({
      type: 'job_found',
      timestamp: Date.now(),
      data: { id: job.id, prompt: job.prompt, budget: job.budget, skills: job.requiredSkills },
    });

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
      this.sseServer.broadcast({
        type: 'job_generating',
        timestamp: Date.now(),
        data: { id: job.id, model: 'auto' },
      });
      const result = await this.llmClient.generate({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools,
        maxSteps: 20,
        budget: job.budget,
        stream: true,
        onChunk: (chunk: string) => {
          // Broadcast each chunk via SSE for real-time UI updates
          this.sseServer.broadcast({
            type: 'job_generating',
            timestamp: Date.now(),
            data: { id: job.id, progress: 50, chunk },
          });
        },
      });

      logger.info('Generation complete', {
        textLength: result.text.length,
        toolCallsCount: result.toolCalls.length,
        toolNames: result.toolCalls.map(tc => tc.name),
      });
      
      // Debug: Log files created
      const createdFiles = projectBuilder.getFiles();
      logger.info('Files in project', {
        fileCount: createdFiles.length,
        files: createdFiles.map(f => f.path),
      });

      // Create ZIP
      logger.info('Creating project ZIP');
      this.sseServer.broadcast({
        type: 'job_building',
        timestamp: Date.now(),
        data: { id: job.id, progress: 75 },
      });
      const zipBuffer = await projectBuilder.createZip();

      // Upload to Seedstr with retry
      logger.info('Uploading to Seedstr');
      const uploadResponse = await this.retryWithBackoff(
        () => this.apiClient.uploadFiles([
          {
            name: `project-${job.id}.zip`,
            content: zipBuffer.toString('base64'),
            type: 'application/zip',
          },
        ]),
        3,
        1000,
        'Upload files'
      );

      // Submit response with retry
      logger.info('Submitting response');
      this.sseServer.broadcast({
        type: 'job_submitting',
        timestamp: Date.now(),
        data: { id: job.id },
      });
      const submitResponse = await this.retryWithBackoff(
        () => this.apiClient.submitResponse(
          job.id,
          `Generated frontend application based on requirements. Files: ${projectBuilder.getFiles().length}`,
          uploadResponse.files
        ),
        3,
        1000,
        'Submit response'
      );

      logger.info('Job completed successfully', submitResponse);
      this.emit('job:complete', { job, result: submitResponse });
      this.sseServer.broadcast({
        type: 'job_success',
        timestamp: Date.now(),
        data: { id: job.id, duration: 0 },
      });

      // Mark as processed
      config.addProcessedJob(job.id);

      // Cleanup
      await projectBuilder.cleanup();
    } catch (error) {
      logger.error('Job processing failed', error);
      this.emit('job:error', { job, error });
      this.sseServer.broadcast({
        type: 'job_failed',
        timestamp: Date.now(),
        data: { id: job.id, error: error instanceof Error ? error.message : String(error) },
      });
      this.emit('job:error', { job, error });
    }
  }
}
