"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSearchTool = void 0;
const ai_1 = require("ai");
const zod_1 = require("zod");
exports.webSearchTool = (0, ai_1.tool)({
    description: 'Search the web for current information, APIs, or documentation',
    inputSchema: zod_1.z.object({
        query: zod_1.z.string().describe('The search query'),
    }),
    execute: async ({ query }) => {
        try {
            // Use DuckDuckGo HTML API (no auth required)
            const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SeedstrAgent/1.0)',
                },
            });
            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`);
            }
            const html = await response.text();
            // Parse results (basic extraction from DDG HTML)
            const results = extractSearchResults(html);
            return {
                success: true,
                results: results.slice(0, 5), // Top 5 results
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    },
});
function extractSearchResults(html) {
    const results = [];
    // Simple regex-based extraction from DDG HTML
    // This is a fallback - in production, consider using a proper HTML parser
    const resultPattern = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    const snippetPattern = /<a[^>]+class="result__snippet"[^>]*>([^<]+)<\/a>/g;
    let match;
    let snippetMatch;
    while ((match = resultPattern.exec(html)) !== null) {
        const url = match[1];
        const title = match[2];
        // Try to find corresponding snippet
        snippetMatch = snippetPattern.exec(html);
        const snippet = snippetMatch ? snippetMatch[1] : '';
        results.push({ title, snippet, url });
        if (results.length >= 10)
            break;
    }
    return results;
}
