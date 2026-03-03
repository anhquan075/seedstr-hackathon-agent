"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpRequestTool = void 0;
const ai_1 = require("ai");
const zod_1 = require("zod");
exports.httpRequestTool = (0, ai_1.tool)({
    description: 'Make HTTP requests to external APIs with automatic retries',
    inputSchema: zod_1.z.object({
        url: zod_1.z.string().describe('The URL to request'),
        method: zod_1.z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional().describe('HTTP method (default: GET)'),
        headers: zod_1.z.record(zod_1.z.string()).optional().describe('Request headers'),
        body: zod_1.z.string().optional().describe('Request body (JSON string)'),
        timeout: zod_1.z.number().optional().describe('Request timeout in ms (default: 10000)'),
    }),
    execute: async ({ url, method = 'GET', headers = {}, body, timeout = 10000 }) => {
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (compatible; SeedstrAgent/1.0)',
                        ...headers,
                    },
                    body: body ? body : undefined,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                const contentType = response.headers.get('content-type');
                let responseData;
                if (contentType?.includes('application/json')) {
                    responseData = await response.json();
                }
                else {
                    responseData = await response.text();
                }
                return {
                    success: true,
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    data: responseData,
                    attempt,
                };
            }
            catch (error) {
                const isLastAttempt = attempt === maxRetries;
                const errorMessage = error.message;
                if (isLastAttempt) {
                    return {
                        success: false,
                        error: errorMessage,
                        attempt,
                    };
                }
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            }
        }
        // Fallback (should never reach here)
        return {
            success: false,
            error: 'Max retries exceeded',
            attempt: maxRetries,
        };
    },
});
