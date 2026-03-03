"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRunner = void 0;
const events_1 = require("events");
const pusher_js_1 = __importDefault(require("pusher-js"));
const api_client_js_1 = require("./api-client.js");
const llm_client_js_1 = require("./llm-client.js");
const project_builder_js_1 = require("./project-builder.js");
const logger_js_1 = require("./logger.js");
const config_js_1 = require("./config.js");
const index_js_1 = require("./tools/index.js");
const project_tools_js_1 = require("./tools/project-tools.js");
const prompts_js_1 = require("./prompts.js");
class AgentRunner extends events_1.EventEmitter {
    apiClient;
    llmClient;
    config;
    pusher;
    isRunning = false;
    pollTimer;
    pollInterval;
    constructor(config) {
        super();
        this.apiClient = new api_client_js_1.SeedstrAPIClient(config.seedstrApiKey);
        this.llmClient = new llm_client_js_1.LLMClient({
            openrouterApiKey: config.openrouterApiKey,
            models: config.models,
        });
        this.pollInterval = config.pollInterval || 120000;
        if (config.pusherKey && config.pusherCluster) {
            this.pusher = new pusher_js_1.default(config.pusherKey, {
                cluster: config.pusherCluster,
            });
        }
    }
    async start() {
        if (this.isRunning) {
            logger_js_1.logger.warn('Agent already running');
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
    async stop() {
        this.isRunning = false;
        logger_js_1.logger.info('Stopping agent runner');
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
        }
        if (this.pusher) {
            this.pusher.disconnect();
        }
        this.emit('stopped');
    }
    connectWebSocket() {
        logger_js_1.logger.info('Connecting to Pusher WebSocket');
        const pusherKey = this.config?.pusherKey;
        const pusherCluster = this.config?.pusherCluster;
        if (!pusherKey || !pusherCluster) {
            logger_js_1.logger.warn('Pusher credentials missing, skipping WebSocket');
            return;
        }
        this.pusher = new pusher_js_1.default(pusherKey, {
            cluster: pusherCluster,
        });
        const channel = this.pusher.subscribe('jobs');
        channel.bind('new-job', (data) => {
            logger_js_1.logger.info('Received new job via WebSocket', data);
            this.handleJob(data.job);
        });
        this.pusher.connection.bind('connected', () => {
            logger_js_1.logger.info('WebSocket connected');
            this.emit('websocket:connected');
        });
        this.pusher.connection.bind('disconnected', () => {
            logger_js_1.logger.warn('WebSocket disconnected');
            this.emit('websocket:disconnected');
        });
    }
    startPolling() {
        const interval = this.config?.pollInterval ?? 120000;
        const poll = async () => {
            if (!this.isRunning)
                return;
            try {
                logger_js_1.logger.debug('Polling for jobs');
                const response = await this.apiClient.getJobs(50);
                // Find unprocessed jobs
                const newJobs = response.jobs.filter((job) => !config_js_1.config.isJobProcessed(job.id) && job.status === 'OPEN');
                if (newJobs.length > 0) {
                    logger_js_1.logger.info(`Found ${newJobs.length} new jobs`);
                    // Process first unprocessed job
                    await this.handleJob(newJobs[0]);
                }
            }
            catch (error) {
                logger_js_1.logger.error('Polling error', error);
                this.emit('error', error);
            }
            // Schedule next poll
            this.pollTimer = setTimeout(poll, interval);
        };
        // Start immediate first poll
        poll();
    }
    async handleJob(job) {
        // Check if already processed
        if (config_js_1.config.isJobProcessed(job.id)) {
            logger_js_1.logger.debug(`Job ${job.id} already processed, skipping`);
            return;
        }
        logger_js_1.logger.info(`Processing job ${job.id}: ${job.prompt}`);
        this.emit('job:start', job);
        try {
            // Create project builder
            const projectBuilder = new project_builder_js_1.ProjectBuilder(job.id);
            (0, project_tools_js_1.setActiveProjectBuilder)(projectBuilder);
            // Generate frontend with LLM
            const systemPrompt = (0, prompts_js_1.getSystemPrompt)();
            const userPrompt = (0, prompts_js_1.getFrontendGenerationPrompt)(job.prompt);
            const tools = {
                web_search: index_js_1.webSearchTool,
                calculator: index_js_1.calculatorTool,
                create_file: index_js_1.createFileTool,
                finalize_project: index_js_1.finalizeProjectTool,
                generate_image: index_js_1.generateImageTool,
                http_request: index_js_1.httpRequestTool,
            };
            logger_js_1.logger.info('Starting LLM generation');
            const result = await this.llmClient.generate({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                tools,
                maxSteps: 20,
            });
            logger_js_1.logger.info('Generation complete', {
                textLength: result.text.length,
                toolCalls: result.toolCalls.length,
            });
            // Create ZIP
            logger_js_1.logger.info('Creating project ZIP');
            const zipBuffer = await projectBuilder.createZip();
            // Upload to Seedstr
            logger_js_1.logger.info('Uploading to Seedstr');
            const uploadResponse = await this.apiClient.uploadFiles([
                {
                    name: `project-${job.id}.zip`,
                    content: zipBuffer.toString('base64'),
                    type: 'application/zip',
                },
            ]);
            // Submit response
            logger_js_1.logger.info('Submitting response');
            const submitResponse = await this.apiClient.submitResponse(job.id, `Generated frontend application based on requirements. Files: ${projectBuilder.getFiles().length}`, uploadResponse.files);
            logger_js_1.logger.info('Job completed successfully', submitResponse);
            this.emit('job:complete', { job, result: submitResponse });
            // Mark as processed
            config_js_1.config.addProcessedJob(job.id);
            // Cleanup
            await projectBuilder.cleanup();
        }
        catch (error) {
            logger_js_1.logger.error('Job processing failed', error);
            this.emit('job:error', { job, error });
        }
    }
}
exports.AgentRunner = AgentRunner;
