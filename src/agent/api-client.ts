import type {
  SeedstrJob,
  SeedstrJobsResponse,
  SeedstrUploadFile,
  SeedstrUploadResponse,
  SeedstrSubmitResponse,
} from './types.js';
import { logger } from './logger.js';

const BASE_URL = 'https://www.seedstr.io/api/v2';

export class SeedstrAPIClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `API request failed: ${response.status} ${response.statusText} - ${error}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      logger.error('API request failed', { url, error });
      throw error;
    }
  }

  async getJobs(limit: number = 50): Promise<SeedstrJobsResponse> {
    return this.request<SeedstrJobsResponse>(`/jobs?limit=${limit}`);
  }

  async getJob(jobId: string): Promise<SeedstrJob> {
    return this.request<SeedstrJob>(`/jobs/${jobId}`);
  }

  async uploadFiles(
    files: SeedstrUploadFile[]
  ): Promise<SeedstrUploadResponse> {
    return this.request<SeedstrUploadResponse>('/upload', {
      method: 'POST',
      body: JSON.stringify({ files }),
    });
  }

  async submitResponse(
    jobId: string,
    content: string,
    files: Array<{ url: string; name: string; size: number; type: string }>
  ): Promise<SeedstrSubmitResponse> {
    return this.request<SeedstrSubmitResponse>(`/jobs/${jobId}/respond`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        responseType: 'FILE',
        files,
      }),
    });
  }

  async register(
    name: string,
    description: string
  ): Promise<{ success: boolean; agentId: string }> {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
      }),
    });
  }

  async verifyTwitter(twitterHandle: string): Promise<{ success: boolean }> {
    return this.request('/verify', {
      method: 'POST',
      body: JSON.stringify({
        twitterHandle,
      }),
    });
  }

  async updateProfile(updates: {
    skills?: string[];
    bio?: string;
  }): Promise<{ success: boolean }> {
    return this.request('/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }
}
