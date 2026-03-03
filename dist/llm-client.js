"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMClient = void 0;
const ai_1 = require("ai");
const ai_sdk_provider_1 = require("@openrouter/ai-sdk-provider");
const logger_js_1 = require("./logger.js");
/**
 * Multi-model LLM client using OpenRouter with fallback chain
 * Fast → Smart → Ultra-smart
 */
class LLMClient {
    openrouterApiKey;
    models;
    constructor(config) {
        this.openrouterApiKey = config.openrouterApiKey;
        // Default fallback chain: fast → smart → ultra-smart
        this.models = config.models || [
            'google/gemini-2.0-flash-exp:free', // Fastest, free
            'anthropic/claude-3.5-sonnet', // High quality
            'openai/gpt-4-turbo', // Fallback
        ];
    }
    async tryModel(modelId, options) {
        logger_js_1.logger.info(`Trying OpenRouter model: ${modelId}`);
        const openrouter = (0, ai_sdk_provider_1.createOpenRouter)({
            apiKey: this.openrouterApiKey,
        });
        const result = await (0, ai_1.generateText)({
            model: openrouter(modelId),
            messages: options.messages,
            tools: options.tools,
            temperature: options.temperature || 0.7,
        });
        return {
            text: result.text,
            toolCalls: result.toolCalls?.map((tc) => ({
                name: tc.toolName,
                args: tc.args,
            })) || [],
            finishReason: result.finishReason,
        };
    }
    /**
     * Generate with automatic fallback through OpenRouter models
     */
    async generate(options) {
        let lastError = null;
        for (const modelId of this.models) {
            try {
                logger_js_1.logger.info(`Attempting generation with ${modelId}`);
                const result = await this.tryModel(modelId, options);
                logger_js_1.logger.info(`Successfully generated with ${modelId}`);
                return result;
            }
            catch (error) {
                logger_js_1.logger.warn(`Model ${modelId} failed`, error);
                lastError = error;
                // Continue to next model
            }
        }
        throw new Error(`All OpenRouter models failed. Last error: ${lastError?.message}`);
    }
}
exports.LLMClient = LLMClient;
