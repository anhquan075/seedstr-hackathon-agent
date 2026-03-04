import type { SeedstrJob, SeedstrJobsResponse, SeedstrUploadFile, SeedstrUploadResponse, SeedstrSubmitResponse } from './types.js';
export declare class SeedstrAPIClient {
    private apiKey;
    constructor(apiKey?: string);
    private request;
    getJobs(limit?: number): Promise<SeedstrJobsResponse>;
    getJob(jobId: string): Promise<SeedstrJob>;
    acceptJob(jobId: string): Promise<{
        success: boolean;
        acceptance: any;
    }>;
    declineJob(jobId: string, reason?: string): Promise<{
        success: boolean;
    }>;
    getMe(): Promise<any>;
    getSkills(): Promise<string[]>;
    uploadFiles(files: SeedstrUploadFile[]): Promise<SeedstrUploadResponse>;
    submitResponse(jobId: string, content: string, files: Array<{
        url: string;
        name: string;
        size: number;
        type: string;
    }>): Promise<SeedstrSubmitResponse>;
    register(walletAddress: string, walletType?: 'ETH' | 'SOL'): Promise<{
        success: boolean;
        apiKey: string;
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