interface ConfigSchema {
    apiKey?: string;
    twitterHandle?: string;
    skills?: string[];
    reputation?: number;
    pollInterval?: number;
    processedJobs?: string[];
}
declare class ConfigManager {
    private store;
    constructor();
    get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K];
    set<K extends keyof ConfigSchema>(key: K, value: ConfigSchema[K]): void;
    has(key: keyof ConfigSchema): boolean;
    addProcessedJob(jobId: string): void;
    isJobProcessed(jobId: string): boolean;
    clear(): void;
}
export declare const config: ConfigManager;
export {};
//# sourceMappingURL=config.d.ts.map