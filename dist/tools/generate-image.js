"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateImageTool = void 0;
const ai_1 = require("ai");
const zod_1 = require("zod");
exports.generateImageTool = (0, ai_1.tool)({
    description: 'Generate an image using AI based on a text prompt',
    inputSchema: zod_1.z.object({
        prompt: zod_1.z.string().describe('The image generation prompt'),
        width: zod_1.z.number().optional().describe('Image width (default: 1024)'),
        height: zod_1.z.number().optional().describe('Image height (default: 1024)'),
        seed: zod_1.z.number().optional().describe('Random seed for reproducibility'),
    }),
    execute: async ({ prompt, width = 1024, height = 1024, seed }) => {
        try {
            // Pollinations.ai API endpoint
            const params = new URLSearchParams({
                prompt,
                width: width.toString(),
                height: height.toString(),
                model: 'flux',
                nologo: 'true',
            });
            if (seed !== undefined) {
                params.append('seed', seed.toString());
            }
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SeedstrAgent/1.0)',
                },
            });
            if (!response.ok) {
                throw new Error(`Image generation failed: ${response.statusText}`);
            }
            // Get the image as base64
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const dataUrl = `data:image/png;base64,${base64}`;
            return {
                success: true,
                imageUrl: url,
                dataUrl,
                prompt,
                dimensions: { width, height },
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
