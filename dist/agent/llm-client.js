import { generateText, streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { logger } from './logger.js';
/**
 * Smart model selection based on job budget and requirements
 * High budget → Claude (best quality)
 * Medium budget + tools → Groq (fast tool calling)
 * Low budget → Gemini free (cost-effective)
 */
export class LLMClient {
    openrouterApiKey;
    models;
    // Model tiers for smart routing
    MODEL_TIERS = {
        premium: 'anthropic/claude-3.5-sonnet', // High quality, reasoning
        fast: 'google/gemini-2.0-flash-lite-preview-02-05:free', // Ultra-fast, free
        balanced: 'meta-llama/llama-3.3-70b-instruct', // Good balance
    };
    constructor(config) {
        this.openrouterApiKey = config.openrouterApiKey;
        // Default fallback chain: fast → smart → ultra-smart
        this.models = config.models || [
            this.MODEL_TIERS.fast,
            this.MODEL_TIERS.balanced,
            this.MODEL_TIERS.premium,
        ];
    }
    /**
     * Assess job complexity based on prompt content
     */
    assessComplexity(prompt) {
        // Count estimated files from prompt hints
        const fileIndicators = [
            /\d+\s*pages?/i,
            /\d+\s*sections?/i,
            /\d+\s*components?/i,
            /\d+\s*files?/i,
        ];
        let estimatedFiles = 3; // Default assumption
        for (const pattern of fileIndicators) {
            const match = prompt.match(pattern);
            if (match) {
                const num = parseInt(match[0]);
                if (!isNaN(num))
                    estimatedFiles = Math.max(estimatedFiles, num);
            }
        }
        // Check for complexity indicators
        const hasImages = /image|photo|picture|illustration|graphic/i.test(prompt);
        const hasAnimations = /animation|transition|effect|interactive|parallax/i.test(prompt);
        const hasComplex = /dashboard|admin|e-commerce|shop|store|cart|checkout/i.test(prompt);
        const hasMultiPage = /multi-?page|multiple pages|several pages/i.test(prompt);
        // Simple: Single page, no images, no animations
        if (estimatedFiles <= 2 && !hasImages && !hasAnimations && !hasComplex) {
            return 'simple';
        }
        // Complex: Many files, images, animations, or complex features
        if (estimatedFiles >= 6 || hasMultiPage || (hasImages && hasAnimations) || hasComplex) {
            return 'complex';
        }
        // Medium: Everything else
        return 'medium';
    }
    /**
     * Select optimal model based on job budget, complexity, and requirements
     */
    selectModel(budget, hasTools, prompt) {
        if (!budget)
            return this.models[0]; // Default to first model
        // Assess complexity if prompt provided
        const complexity = prompt ? this.assessComplexity(prompt) : 'medium';
        // High budget jobs deserve premium quality
        // High budget ($5+): Use premium model for everything
        if (budget >= 5) {
            logger.info(`High budget ($${budget}), complexity: ${complexity}, using premium model`);
            return this.MODEL_TIERS.premium;
        }
        // Medium budget ($2-$5):
        if (budget >= 2) {
            // Complex jobs get premium model
            if (complexity === 'complex') {
                logger.info(`Medium budget ($${budget}), complex job, using premium model`);
                return this.MODEL_TIERS.premium;
            }
            // Medium/Simple jobs use balanced model
            logger.info(`Medium budget ($${budget}), ${complexity} job, using balanced model`);
            return this.MODEL_TIERS.balanced;
        }
        // Low budget (<$2): Prioritize speed and cost
        if (complexity === 'complex') {
            // Even low budget complex jobs might need balanced model to succeed
            logger.info(`Low budget ($${budget}), complex job, using balanced model`);
            return this.MODEL_TIERS.balanced;
        }
        // Default to fast/free model for low budget simple/medium jobs
        logger.info(`Low budget ($${budget}), ${complexity} job, using fast/free model`);
        return this.MODEL_TIERS.fast;
    }
    async tryModel(modelId, options) {
        logger.info(`Trying OpenRouter model: ${modelId}`);
        const openrouter = createOpenRouter({
            apiKey: this.openrouterApiKey,
        });
        // Create timeout controller (2 minute max)
        const TIMEOUT_MS = 120000;
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => {
            logger.warn(`Model ${modelId} timeout after ${TIMEOUT_MS}ms`);
            timeoutController.abort();
        }, TIMEOUT_MS);
        try {
            // Use streaming if enabled
            if (options.stream) {
                const result = await streamText({
                    model: openrouter(modelId),
                    messages: options.messages,
                    tools: options.tools,
                    temperature: options.temperature || 0.7,
                    abortSignal: timeoutController.signal,
                });
                // Collect stream and call onChunk callback
                let fullText = '';
                for await (const chunk of result.textStream) {
                    fullText += chunk;
                    if (options.onChunk) {
                        options.onChunk(chunk);
                    }
                }
                // Await tool calls
                const toolCallsResult = await result.toolCalls;
                const finishReason = await result.finishReason;
                return {
                    text: fullText,
                    toolCalls: toolCallsResult.map((tc) => ({
                        name: tc.toolName,
                        args: tc.args,
                    })),
                    finishReason: finishReason || 'stop',
                };
            }
            // Non-streaming generation
            const result = await generateText({
                model: openrouter(modelId),
                messages: options.messages,
                tools: options.tools,
                temperature: options.temperature || 0.7,
                abortSignal: timeoutController.signal,
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
        finally {
            clearTimeout(timeoutId);
        }
    }
    /**
     * Generate with automatic fallback through OpenRouter models
     * Supports both streaming and non-streaming modes
     */
    async generate(options) {
        const hasTools = options.tools && Object.keys(options.tools).length > 0;
        // Extract prompt from messages for complexity assessment
        const userMessage = options.messages.find(m => m.role === 'user');
        const prompt = userMessage?.content || '';
        const primaryModel = this.selectModel(options.budget, hasTools, prompt);
        // Try primary model first, then fallback chain
        const modelsToTry = [primaryModel, ...this.models.filter(m => m !== primaryModel)];
        let lastError = null;
        for (const modelId of modelsToTry) {
            try {
                logger.info(`Attempting generation with ${modelId}`);
                const result = await this.tryModel(modelId, options);
                logger.info(`Successfully generated with ${modelId}`);
                return result;
            }
            catch (error) {
                logger.warn(`Model ${modelId} failed`, error);
                lastError = error;
                // Continue to next model
            }
        }
        throw new Error(`All OpenRouter models failed. Last error: ${lastError?.message}`);
    }
}
//# sourceMappingURL=llm-client.js.map