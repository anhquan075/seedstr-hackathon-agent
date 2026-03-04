import { logger } from './logger.js';
const BASE_URL = 'https://www.seedstr.io/api/v2';
export class SeedstrAPIClient {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey || '';
    }
    async request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
                },
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`API request failed: ${response.status} ${response.statusText} - ${error}`);
            }
            return (await response.json());
        }
        catch (error) {
            logger.error('API request failed', { url, error });
            throw error;
        }
    }
    async getJobs(limit = 50) {
        return this.request(`/jobs?limit=${limit}`);
    }
    async getJob(jobId) {
        return this.request(`/jobs/${jobId}`);
    }
    async acceptJob(jobId) {
        return this.request(`/jobs/${jobId}/accept`, {
            method: 'POST',
        });
    }
    async declineJob(jobId, reason) {
        return this.request(`/jobs/${jobId}/decline`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }
    async getMe() {
        return this.request('/me');
    }
    async getSkills() {
        return this.request('/skills');
    }
    async uploadFiles(files) {
        return this.request('/upload', {
            method: 'POST',
            body: JSON.stringify({ files }),
        });
    }
    async submitResponse(jobId, content, files) {
        return this.request(`/jobs/${jobId}/respond`, {
            method: 'POST',
            body: JSON.stringify({
                content,
                responseType: 'FILE',
                files,
            }),
        });
    }
    async register(walletAddress, walletType = 'ETH') {
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify({
                walletAddress,
                walletType,
            }),
        });
    }
    async verifyTwitter(twitterHandle) {
        return this.request('/verify', {
            method: 'POST',
            body: JSON.stringify({
                twitterHandle,
            }),
        });
    }
    async updateProfile(updates) {
        return this.request('/me', {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    }
}
//# sourceMappingURL=api-client.js.map