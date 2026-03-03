import { generateText, streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { logger } from './logger.js';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMGenerateOptions {
  messages: LLMMessage[];
  tools?: Record<string, any>;
  maxSteps?: number;
  temperature?: number;
  budget?: number; // Job budget for smart model selection
  stream?: boolean; // Enable streaming responses
}
export interface LLMGenerateResult {
  text: string;
  toolCalls: Array<{
    name: string;
    args: unknown;
  }>;
  finishReason: string;
}

/**
 * Smart model selection based on job budget and requirements
 * High budget → Claude (best quality)
 * Medium budget + tools → Groq (fast tool calling)
 * Low budget → Gemini free (cost-effective)
 */
export class LLMClient {
  private openrouterApiKey: string;
  private models: string[];

  // Model tiers for smart routing
  private readonly MODEL_TIERS = {
    premium: 'anthropic/claude-3.5-sonnet',        // High quality, $3-15/job
    fast: 'meta-llama/llama-3.3-70b-instruct',     // Fast tool calling, $0.5-2/job
    free: 'google/gemini-2.0-flash-exp:free',      // Free tier, $0/job
  };

  constructor(config: {
    openrouterApiKey: string;
    models?: string[];
  }) {
    this.openrouterApiKey = config.openrouterApiKey;
    // Default fallback chain: fast → smart → ultra-smart
    this.models = config.models || [
      this.MODEL_TIERS.free,
      this.MODEL_TIERS.fast,
      this.MODEL_TIERS.premium,
    ];
  }

  /**
   * Select optimal model based on job budget and requirements
   */
  private selectModel(budget?: number, hasTools?: boolean): string {
    if (!budget) return this.models[0]; // Default to first model
    
    // High budget jobs deserve premium quality
    if (budget >= 5) {
      logger.info(`High budget ($${budget}), using premium model`);
      return this.MODEL_TIERS.premium;
    }
    
    // Medium budget with tools → use fast model optimized for tool calling
    if (budget >= 2 && hasTools) {
      logger.info(`Medium budget ($${budget}) with tools, using fast model`);
      return this.MODEL_TIERS.fast;
    }
    
    // Low budget → use free tier
    logger.info(`Low budget ($${budget}), using free model`);
    return this.MODEL_TIERS.free;
  }

  private async tryModel(
    modelId: string,
    options: LLMGenerateOptions
  ): Promise<LLMGenerateResult> {
    logger.info(`Trying OpenRouter model: ${modelId}`);
    const openrouter = createOpenRouter({
      apiKey: this.openrouterApiKey,
    });

    // Use streaming if enabled
    if (options.stream) {
      const result = await streamText({
        model: openrouter(modelId),
        messages: options.messages,
        tools: options.tools,
        temperature: options.temperature || 0.7,
      });
      
      // Await promises before consuming streams
      const [finishReason, toolCallsResult] = await Promise.all([
        result.finishReason,
        result.toolCalls,
      ]);
      
      // Collect stream into full result
      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
        logger.debug('Stream chunk received');
      }
      
      return {
        text: fullText,
        toolCalls: toolCallsResult.map((tc: any) => ({
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
    });

    return {
      text: result.text,
      toolCalls: result.toolCalls?.map((tc: any) => ({
        name: tc.toolName,
        args: tc.args,
      })) || [],
      finishReason: result.finishReason,
    };
  }


  /**
   * Generate with automatic fallback through OpenRouter models
   * Supports both streaming and non-streaming modes
   */
  async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
    const hasTools = options.tools && Object.keys(options.tools).length > 0;
    const primaryModel = this.selectModel(options.budget, hasTools);
    
    // Try primary model first, then fallback chain
    const modelsToTry = [primaryModel, ...this.models.filter(m => m !== primaryModel)];
    let lastError: Error | null = null;

    for (const modelId of modelsToTry) {
      try {
        logger.info(`Attempting generation with ${modelId}`);
        const result = await this.tryModel(modelId, options);
        logger.info(`Successfully generated with ${modelId}`);
        return result;
      } catch (error) {
        logger.warn(`Model ${modelId} failed`, error);
        lastError = error as Error;
        // Continue to next model
      }
    }

    throw new Error(
      `All OpenRouter models failed. Last error: ${lastError?.message}`
    );
  }
}
