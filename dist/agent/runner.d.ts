import { EventEmitter } from 'events';
export interface AgentRunnerConfig {
    seedstrApiKey: string;
    openrouterApiKey: string;
    pusherKey?: string;
    pusherCluster?: string;
    pollInterval?: number;
    models?: string[];
    ssePort?: number;
}
export declare class AgentRunner extends EventEmitter {
    private apiClient;
    private llmClient;
    private config?;
    private pusher?;
    private isRunning;
    private pollTimer?;
    private pollInterval;
    private activeJobs;
    private readonly MAX_CONCURRENT_JOBS;
    private sseServer;
    constructor(config: AgentRunnerConfig);
    /**
     * Retry helper with exponential backoff
     */
    private retryWithBackoff;
    start(): Promise<void>;
    stop(): Promise<void>;
    private connectWebSocket;
    private startPolling;
    private handleJob;
}
//# sourceMappingURL=runner.d.ts.map