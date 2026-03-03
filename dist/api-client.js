"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedstrAPIClient = void 0;
const logger_js_1 = require("./logger.js");
const BASE_URL = 'https://www.seedstr.io/api/v2';
class SeedstrAPIClient {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async request(endpoint, options = {}) {
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
                throw new Error(`API request failed: ${response.status} ${response.statusText} - ${error}`);
            }
            return (await response.json());
        }
        catch (error) {
            logger_js_1.logger.error('API request failed', { url, error });
            throw error;
        }
    }
    async getJobs(limit = 50) {
        return this.request(`/jobs?limit=${limit}`);
    }
    async getJob(jobId) {
        return this.request(`/jobs/${jobId}`);
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
    async register(name, description) {
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify({
                name,
                description,
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
exports.SeedstrAPIClient = SeedstrAPIClient;
