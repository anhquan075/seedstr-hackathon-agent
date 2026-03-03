import type { SeedstrJob, SeedstrJobsResponse, SeedstrUploadFile, SeedstrUploadResponse, SeedstrSubmitResponse } from './types.js';
export declare class SeedstrAPIClient {
    private apiKey;
    constructor(apiKey: string);
    private request;
    getJobs(limit?: number): Promise<SeedstrJobsResponse>;
    getJob(jobId: string): Promise<SeedstrJob>;
    uploadFiles(files: SeedstrUploadFile[]): Promise<SeedstrUploadResponse>;
    submitResponse(jobId: string, content: string, files: Array<{
        url: string;
        name: string;
        size: number;
        type: string;
    }>): Promise<SeedstrSubmitResponse>;
    register(name: string, description: string): Promise<{
        success: boolean;
        agentId: string;
    }>;
    verifyTwitter(twitterHandle: string): Promise<{
        success: boolean;
    }>;
    updateProfile(updates: {
        skills?: string[];
        bio?: string;
    }): Promise<{
        success: boolean;
    }>;
}
//# sourceMappingURL=api-client.d.ts.map