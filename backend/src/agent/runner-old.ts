import { EventEmitter } from 'events';
import Pusher from 'pusher-js';
import { SeedstrAPIClient } from './api-client.js';
import { config } from './config.js';
import { LLMClient } from './llm-client.js';
import { logger } from './logger.js';
import { ProjectBuilder } from './project-builder.js';
import { PerformanceMonitor } from '../utils/timing.js';
import {
  getFrontendGenerationPrompt,
  getSystemPrompt,
} from './prompts.js';
import { SSEServer } from './sse-server.js';
import {
  jobsReceivedCounter,
  jobsProcessedCounter,
  jobsBuiltCounter,
  jobsSubmittedCounter,
  jobsFailedCounter,
  llmLatencyHistogram,
  buildLatencyHistogram,
  submitLatencyHistogram,
  e2eLatencyHistogram,
  activeJobsGauge,
  lastSuccessfulSubmitGauge,
} from '../instrumentation/metrics.js';
import { categorizeError, ErrorStage } from '../utils/error-categorizer.js';
import {
  calculatorTool,
  createFileTool,
  csvAnalysisTool,
  finalizeProjectTool,
  generateImageTool,
  generateQrCodeTool,
  httpRequestTool,
  textProcessingTool,
  webSearchTool,
} from './tools/index.js';
import { setActiveProjectBuilder } from './tools/project-tools.js';
import type { SeedstrJob } from './types.js';
import { JobEligibilityValidator, type AgentCapabilities } from './job-eligibility-validator.js';

interface RunnerState {
  running: boolean;
  activeJobs: number;
  sseClients: number;
  pollIntervalMs: number;
  uptimeMs: number;
  lastManualPromptAt: number | null;
  agentReputation: number;
}

interface ManualPromptHistoryItem {
  id: string;
  prompt: string;
  status: 'success' | 'failed';
  timestamp: number;
  durationMs: number;
  result?: string;
  error?: string;
}

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
  private sseServer: SSEServer;
  private sseStarted = false;
  private lastManualPromptAt: number | null = null;
  private performanceMonitors: Map<string, PerformanceMonitor> = new Map();
  private manualPromptHistory: ManualPromptHistoryItem[] = [];
  private jobEligibilityValidator: JobEligibilityValidator;
  constructor(config: AgentRunnerConfig, apiClient?: SeedstrAPIClient) {
    super();
    this.config = config; // FIX: Assign config to instance property for later reference
    this.sseServer = new SSEServer(8080); // Always use port 8080 for both local and production
    this.apiClient = apiClient || new SeedstrAPIClient(config.seedstrApiKey);
    this.llmClient = new LLMClient({
      openrouterApiKey: config.openrouterApiKey,
      models: config.models,
    });
    this.pollInterval = config.pollInterval || 10000; // Default 10s (will be randomized in polling loop)
    this.jobEligibilityValidator = new JobEligibilityValidator();

    this.sseServer.setControlHandlers({
      start: async () => this.resumePolling(),
      stop: async () => this.pausePolling(),
      prompt: async (prompt: string) => this.processManualPrompt(prompt),
      getState: () => this.getState(),
      getHistory: () => this.getManualPromptHistory(),
      replayLast: async () => this.replayLastManualPrompt(),
    });

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
    if (!this.sseStarted) {
      this.sseServer.start();
      this.sseStarted = true;
    }
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

    if (this.sseStarted) {
      this.sseServer.stop();
      this.sseStarted = false;
    }
    this.emit('stopped');
  }

  pausePolling(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }

    this.sseServer.broadcast({
      type: 'agent_started',
      timestamp: Date.now(),
      data: { uptime: process.uptime() * 1000, status: 'stopped' },
    });
    this.emit('stopped');
    logger.info('Polling paused via control endpoint');
  }

  resumePolling(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startPolling();
    this.sseServer.broadcast({
      type: 'agent_started',
      timestamp: Date.now(),
      data: { uptime: process.uptime() * 1000, status: 'running' },
    });
    this.emit('started');
    logger.info('Polling resumed via control endpoint');
  }

  getState(): RunnerState {
    return {
      running: this.isRunning,
      activeJobs: this.activeJobs.size,
      sseClients: this.sseServer.clientCount,
      pollIntervalMs: this.pollInterval,
      uptimeMs: process.uptime() * 1000,
      lastManualPromptAt: this.lastManualPromptAt,
      agentReputation: 0, // TODO: Implement reputation tracking
    };
  }

  getManualPromptHistory(limit = 20): ManualPromptHistoryItem[] {
    return this.manualPromptHistory.slice(0, limit);
  }

  async replayLastManualPrompt(): Promise<{ id: string; result?: string }> {
    const last = this.manualPromptHistory[0];
    if (!last) {
      throw new Error('No manual prompt history to replay');
    }
    return this.processManualPrompt(last.prompt);
  }

  async processManualPrompt(prompt: string): Promise<{ id: string; result?: string }> {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      throw new Error('Prompt is required');
    }

    const id = `manual-${Date.now()}`;
    const startedAt = Date.now();
    this.lastManualPromptAt = startedAt;

    this.sseServer.broadcast({
      type: 'job_received',
      timestamp: startedAt,
      data: { id, prompt: trimmedPrompt, budget: 0, skills: [] },
    });

    this.sseServer.broadcast({
      type: 'job_processing',
      timestamp: Date.now(),
      data: { id, model: 'manual' },
    });

    try {
      // Create a project builder for this prompt
      const projectBuilder = new ProjectBuilder(id);
      setActiveProjectBuilder(projectBuilder);

      // Build tools object
      const tools = {
        webSearch: webSearchTool,
        calculator: calculatorTool,
        createFile: createFileTool,
        finalizeProject: finalizeProjectTool,
        generateImage: generateImageTool,
        httpRequest: httpRequestTool,
        generateQrCode: generateQrCodeTool,
        csvAnalysis: csvAnalysisTool,
        textProcessing: textProcessingTool,
      };

      // Generate with tools support
      const allText: string[] = [];
      const result = await this.llmClient.generate({
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: trimmedPrompt },
        ],
        tools,
        maxSteps: 10,
        budget: 1,
        stream: true,
        onChunk: (chunk: string) => {
          allText.push(chunk);
          this.sseServer.broadcast({
            type: 'job_processing',
            timestamp: Date.now(),
            data: { id, chunk },
          });
        },
      });

      const duration = Date.now() - startedAt;
      const resultText = allText.join('') || result.text || '';

      this.sseServer.broadcast({
        type: 'job_completed',
        timestamp: Date.now(),
        data: {
          id,
          result: resultText,
          timing: { total: duration, totalSeconds: (duration / 1000).toFixed(2) },
          manual: true,
        },
      });

      this.manualPromptHistory.unshift({
        id,
        prompt: trimmedPrompt,
        status: 'success',
        timestamp: startedAt,
        durationMs: duration,
        result: resultText,
      });
      this.manualPromptHistory = this.manualPromptHistory.slice(0, 20);

      return { id, result: resultText };
    } catch (error) {
      const duration = Date.now() - startedAt;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.sseServer.broadcast({
        type: 'job_failed',
        timestamp: Date.now(),
        data: { id, error: errorMessage, manual: true },
      });

      this.manualPromptHistory.unshift({
        id,
        prompt: trimmedPrompt,
        status: 'failed',
        timestamp: startedAt,
        durationMs: duration,
        error: errorMessage,
      });
      this.manualPromptHistory = this.manualPromptHistory.slice(0, 20);
      throw error;
    }
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
      // Skip if already processing this job (prevent race condition with polling)
      if (this.activeJobs.has(data.job.id)) {
        logger.debug(`Job ${data.job.id} already processing, skipping WebSocket trigger`);
        return;
      }
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
    const poll = async () => {
      if (!this.isRunning) return;

      try {
        // Check if we're rate-limited; pause polling until reset
        const rateLimitReset = this.apiClient.getRateLimitReset();
        if (rateLimitReset > Date.now()) {
          const waitSeconds = Math.ceil((rateLimitReset - Date.now()) / 1000);
          logger.warn(`API rate-limited — pausing polling for ${waitSeconds}s`, { rateLimitReset });
          // Reschedule poll after rate limit expires
          this.pollTimer = setTimeout(poll, rateLimitReset - Date.now());
          return;
        }

        // Use configured poll interval, default to 30s if not specified
        const pollInterval = this.pollInterval || 30000;
        logger.debug(`Polling for jobs (poll interval: ${pollInterval}ms)`);
        this.sseServer.broadcast({
          type: 'polling',
          timestamp: Date.now(),
          data: { pollInterval },
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
            
            // Validate job eligibility before processing
            const capabilities: AgentCapabilities = {
              agentReputation: this.getState().agentReputation || 0,
              minBudgetRequired: 0.001, // ETH minimum
              maxConcurrentJobs: this.MAX_CONCURRENT_JOBS,
              activeJobCount: this.activeJobs.size,
            };
            
            const eligibility = this.jobEligibilityValidator.validate(job, capabilities);
            if (!eligibility.eligible) {
              logger.warn(`job_rejected [${job.id}]`, { reason: eligibility.reason });
              config.addProcessedJob(job.id);
              continue;
            }
            
            logger.debug(`job_eligible [${job.id}]`, {
              reason: eligibility.reason,
              requiresSwarmAcceptance: eligibility.requiresSwarmAcceptance,
              estimatedDurationMs: eligibility.estimatedDuration,
            });
            
            // Check if job will complete before expiry
            if (!this.jobEligibilityValidator.canCompleteBeforeExpiry(job)) {
              logger.warn(`job_insufficient_time [${job.id}]`, {
                expiresAt: job.expiresAt,
                reason: 'Not enough time to complete before expiry',
              });
              config.addProcessedJob(job.id);
              continue;
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

      // Schedule next poll with configured interval (respects config.pollInterval)
      const nextInterval = this.pollInterval || 30000;
      logger.debug(`Scheduling next poll in ${nextInterval}ms`);
      this.pollTimer = setTimeout(poll, nextInterval);
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
    jobsReceivedCounter.inc();
    activeJobsGauge.inc();
    
    // Initialize performance monitoring
    const perfMonitor = new PerformanceMonitor();
    perfMonitor.startJob();
    this.performanceMonitors.set(job.id, perfMonitor);
    
    // Start job detection timing (measures time from job available to processing start)
    perfMonitor.startTimer('jobDetection');
    perfMonitor.stopTimer('jobDetection'); // Minimal time for synchronous jobs
    
    this.sseServer.broadcast({
      type: 'job_received',
      timestamp: Date.now(),
      data: { id: job.id, prompt: job.prompt, budget: job.budget, skills: job.requiredSkills },
    });

    try {
      // Manual mode placeholder: block job processing if manual approval required
      // TODO Phase 02: Implement manual approval queue and dashboard UI
      // if (config.getAutonomyMode() === 'manual') {
      //   logger.info(`Manual mode enabled - job ${job.id} requires approval`);
      //   this.sseServer.broadcast({
      //     type: 'job_approval_request',
      //     timestamp: Date.now(),
      //     data: {
      //       id: job.id,
      //       action: 'manual_approval',
      //       job: { id: job.id, prompt: job.prompt, budget: job.budget },
      //       autoApproved: false,
      //     },
      //   });
      //   return; // Do not process until manual approval
      // }
      
      // Handle SWARM jobs
      if (job.jobType === 'SWARM') {
        // Broadcast approval event for supervised mode
        if (config.getAutonomyMode() === 'supervised') {
          this.sseServer.broadcast({
            type: 'job_approval_request',
            timestamp: Date.now(),
            data: {
              id: job.id,
              action: 'accept_swarm',
              job: {
                id: job.id,
                prompt: job.prompt,
                budget: job.budget,
                skills: job.requiredSkills || [],
                jobType: job.jobType,
              },
              autoApproved: true, // Supervised = auto-approve + notify
            },
          });
        }

        logger.info(`Accepting SWARM job ${job.id}`);
        try {
          await this.apiClient.acceptJob(job.id);
          logger.info(`Successfully accepted SWARM job ${job.id}`);
        } catch (error: any) {
          if (error.message.includes('409')) {
            logger.warn(`Job ${job.id} already accepted or full, skipping`);
            config.addProcessedJob(job.id);
            return;
          }
          throw error;
        }
      }

      // Create project builder
      perfMonitor.startTimer('projectBuild');
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
        generate_qr: generateQrCodeTool,
        csv_analysis: csvAnalysisTool,
        text_processing: textProcessingTool,
      };

      logger.info('Starting LLM generation');
      perfMonitor.startTimer('llmGeneration');
      this.sseServer.broadcast({
        type: 'job_processing',
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
            type: 'job_processing',
            timestamp: Date.now(),
            data: { id: job.id, progress: 50, chunk },
          });
        },
      });
      const llmDuration = perfMonitor.stopTimer('llmGeneration');
      llmLatencyHistogram.observe(llmDuration / 1000);
      logger.info(`[TIMING] LLM generation: ${llmDuration}ms (${(llmDuration/1000).toFixed(2)}s)`);

      logger.info('Generation complete', {
        textLength: result.text.length,
        toolCallsCount: result.toolCalls.length,
        toolNames: result.toolCalls.map(tc => tc.name),
      });

      // Save LLM response to project
      if (result.text) {
        projectBuilder.addFile('RESPONSE.md', result.text);
      }
      
      // Project build duration includes LLM time (they overlap)
      const buildDuration = perfMonitor.stopTimer('projectBuild');
      logger.info(`[TIMING] Project build: ${buildDuration}ms (${(buildDuration/1000).toFixed(2)}s)`);
      
      // Debug: Log files created
      const createdFiles = projectBuilder.getFiles();
      logger.info('Files in project', {
        fileCount: createdFiles.length,
        files: createdFiles.map(f => f.path),
      });

      // Create ZIP
      logger.info('Creating project ZIP');
      perfMonitor.startTimer('zipCreation');
      this.sseServer.broadcast({
        type: 'job_building',
        timestamp: Date.now(),
        data: { id: job.id, progress: 75 },
      });
      const zipBuffer = await projectBuilder.createZip();
      const zipDuration = perfMonitor.stopTimer('zipCreation');
      logger.info(`[TIMING] ZIP creation: ${zipDuration}ms (${(zipDuration/1000).toFixed(2)}s)`);
      buildLatencyHistogram.observe(zipDuration / 1000);

      // Upload to Seedstr with retry
      logger.info('Uploading to Seedstr');
      perfMonitor.startTimer('apiSubmission');
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
      
      // Broadcast approval event for supervised mode before submission
      if (config.getAutonomyMode() === 'supervised') {
        this.sseServer.broadcast({
          type: 'job_approval_request',
          timestamp: Date.now(),
          data: {
            id: job.id,
            action: 'submit_response',
            job: {
              id: job.id,
              prompt: job.prompt,
              budget: job.budget,
              skills: job.requiredSkills || [],
              jobType: job.jobType,
            },
            autoApproved: true, // Supervised = auto-approve + notify
            responseType: 'FILE', // Phase 2 will make this dynamic
          },
        });
      }
      
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
      const submitDuration = perfMonitor.stopTimer('apiSubmission');
      logger.info(`[TIMING] API submission: ${submitDuration}ms (${(submitDuration/1000).toFixed(2)}s)`);
      submitLatencyHistogram.observe(submitDuration / 1000);
      
      // Get complete timing metrics
      const metrics = perfMonitor.getMetrics();
      logger.info(perfMonitor.getSummary());
      
      logger.info('Job completed successfully', submitResponse);
      jobsProcessedCounter.inc();
      jobsBuiltCounter.inc();
      jobsSubmittedCounter.inc();
      e2eLatencyHistogram.observe(metrics.total / 1000);
      lastSuccessfulSubmitGauge.set(Date.now() / 1000);
      activeJobsGauge.dec();
      this.emit('job:complete', { job, result: submitResponse });
      this.sseServer.broadcast({
        type: 'job_completed',
        timestamp: Date.now(),
        data: { 
          id: job.id, 
          timing: perfMonitor.getTimingData()
        },
      });

      // Mark as processed
      config.addProcessedJob(job.id);

      // Cleanup
      await projectBuilder.cleanup();
      this.performanceMonitors.delete(job.id);
    } catch (error) {
      logger.error('Job processing failed', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Mark job as processed if it was already submitted (409 Conflict)
      // This prevents infinite re-polling and resubmission attempts
      if (errorMessage.includes('409') || errorMessage.includes('Conflict') || errorMessage.includes('already submitted')) {
        logger.warn(`Job already submitted [${job.id}], marking as processed to prevent re-polling`);
        config.addProcessedJob(job.id);
      } else {
        const categorized = categorizeError(error, ErrorStage.BUILD);
        jobsFailedCounter.inc({ stage: categorized.stage, error_type: categorized.category });
      }

      activeJobsGauge.dec();
      this.emit('job:error', { job, error });
      this.sseServer.broadcast({
        type: 'job_failed',
        timestamp: Date.now(),
        data: { id: job.id, error: errorMessage },
      });
      this.performanceMonitors.delete(job.id);
    }
  }
}
