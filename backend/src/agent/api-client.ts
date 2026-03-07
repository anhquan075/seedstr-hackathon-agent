import type {
 SeedstrJob,
 SeedstrJobsResponse,
 SeedstrUploadFile,
 SeedstrUploadResponse,
 SeedstrSubmitResponse,
} from './types.js';
import { logger } from './logger.js';

const BASE_URL = 'https://www.seedstr.io/api';

export class SeedstrAPIClient {
 private apiKey: string;
 private rateLimitReset: number = 0; // Timestamp when rate limit expires

 constructor(apiKey?: string) {
  this.apiKey = apiKey || '';
 }

 /**
  * Expose rate limit reset timestamp so caller can pause operations during rate-limit window
  */
 getRateLimitReset(): number {
  return this.rateLimitReset;
 }

 private async sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
 }

 private getRetryAfter(response: Response): number {
  // Check for Retry-After header (can be seconds or HTTP date)
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) {
   const seconds = parseInt(retryAfter, 10);
   if (!isNaN(seconds)) {
    return seconds * 1000; // Convert to milliseconds
   }
   // If it's an HTTP date, calculate difference
   const retryDate = new Date(retryAfter).getTime();
   if (!isNaN(retryDate)) {
    return Math.max(0, retryDate - Date.now());
   }
  }
  return 0;
 }

 private async request<T>(
  endpoint: string,
  options: RequestInit = {},
  v2: boolean = true,
  attempt: number = 1,
  maxRetries: number = 3
 ): Promise<T> {
  const version = v2 ? '/v2' : '/v1';
  // If endpoint already starts with /v1 or /v2, don't double prefix
  const finalEndpoint = endpoint.startsWith('/v') ? endpoint : `${version}${endpoint}`;
  const url = `${BASE_URL}${finalEndpoint}`;

  // Check if we're rate limited and still within the backoff window
  if (this.rateLimitReset > Date.now()) {
   const waitTime = Math.ceil((this.rateLimitReset - Date.now()) / 1000);
   logger.warn(`Rate limited. Waiting ${waitTime}s before retry`, { endpoint, attempt });
   await this.sleep(this.rateLimitReset - Date.now());
  }

  try {
   const response = await fetch(url, {
    ...options,
    headers: {
     'Content-Type': 'application/json',
     ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    },
   });

   // Handle rate limiting (429)
   if (response.status === 429) {
    const retryAfter = this.getRetryAfter(response);
    const waitTime = retryAfter || Math.pow(2, attempt - 1) * 5000; // Exponential backoff: 5s, 10s, 20s
    
    this.rateLimitReset = Date.now() + waitTime;
    const waitSeconds = Math.ceil(waitTime / 1000);
    
    logger.warn(`Rate limited (429). Waiting ${waitSeconds}s before retry`, {
     endpoint,
     attempt,
     retryAfter: retryAfter ? 'from-header' : 'exponential-backoff',
    });

    if (attempt < maxRetries) {
     await this.sleep(waitTime);
     return this.request<T>(endpoint, options, v2, attempt + 1, maxRetries);
    }
    
    // Max retries exceeded
    const error = await response.text();
    throw new Error(
     `API request failed: ${response.status} ${response.statusText} - ${error}`
    );
   }

   if (!response.ok) {
    const error = await response.text();
    throw new Error(
     `API request failed: ${response.status} ${response.statusText} - ${error}`
    );
   }

   return (await response.json()) as T;
  } catch (error) {
   logger.error('API request failed', { url, attempt, error });
   throw error;
  }
 }

 async getJobs(limit: number = 50): Promise<SeedstrJobsResponse> {
  return this.request<SeedstrJobsResponse>(`/jobs?limit=${limit}`, {}, true);
 }

 async getJob(jobId: string): Promise<SeedstrJob> {
  return this.request<SeedstrJob>(`/jobs/${jobId}`, {}, true);
 }

 async acceptJob(jobId: string): Promise<{ success: boolean; acceptance: any }> {
  return this.request<{ success: boolean; acceptance: any }>(`/jobs/${jobId}/accept`, {
   method: 'POST',
  }, true);
 }

 async declineJob(jobId: string, reason?: string): Promise<{ success: boolean }> {
  return this.request<{ success: boolean }>(`/jobs/${jobId}/decline`, {
   method: 'POST',
   body: JSON.stringify({ reason }),
  }, true);
 }

 async cancelJob(jobId: string): Promise<{ success: boolean }> {
  return this.request<{ success: boolean }>(`/jobs/${jobId}/cancel`, {
   method: 'POST',
  }, true);
 }

 async listJobsV2(limit: number = 50, offset: number = 0): Promise<SeedstrJobsResponse> {
  return this.request<SeedstrJobsResponse>(`/jobs?limit=${limit}&offset=${offset}`, {}, true);
 }

 async getJobV2(jobId: string): Promise<SeedstrJob> {
  return this.request<SeedstrJob>(`/jobs/${jobId}`, {}, true);
 }

 async getMeV2(): Promise<any> {
  return this.request<any>('/me', {}, true);
 }

 async getMe(): Promise<any> {
  return this.request<any>('/me', {}, true);
 }

 async getSkills(): Promise<any> {
  return this.request<any>('/skills', {}, true);
 }

 async uploadFiles(
  files: SeedstrUploadFile[]
 ): Promise<SeedstrUploadResponse> {
  return this.request<SeedstrUploadResponse>('/upload', {
   method: 'POST',
   body: JSON.stringify({ files }),
  }, true);
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
    responseType: files.length > 0 ? 'FILE' : 'TEXT',
    files,
   }),
  }, true);
 }

 async register(
  walletAddress: string,
  walletType: 'ETH' | 'SOL' = 'ETH'
 ): Promise<{ success: boolean; apiKey: string; agentId: string }> {
  return this.request('/register', {
   method: 'POST',
   body: JSON.stringify({
    walletAddress,
    walletType,
   }),
  }, false);
 }

 async verifyTwitter(twitterHandle: string): Promise<{ success: boolean }> {
  return this.request('/verify', {
   method: 'POST',
   body: JSON.stringify({
    twitterHandle,
   }),
  }, false);
 }

 async updateProfile(updates: {
  skills?: string[];
  bio?: string;
 }): Promise<{ success: boolean }> {
  return this.request('/me', {
   method: 'PATCH',
   body: JSON.stringify(updates),
  }, true);
 }
}
