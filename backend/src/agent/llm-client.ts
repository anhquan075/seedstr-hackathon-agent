import { repairJSON } from './json-repair.js';
import { generateText, streamText, type LanguageModelUsage, stepCountIs } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { logger } from './logger.js';
import { calculateLLMCost } from './utils/cost-calculator.js';
import type { LLMMessage } from './types.js';

export interface LLMGenerateOptions {
 messages: LLMMessage[];
 tools?: Record<string, any>;
 maxSteps?: number;
 temperature?: number;
 budget?: number; // Job budget for smart model selection
 stream?: boolean; // Enable streaming responses
 onChunk?: (chunk: string) => void; // Callback for streaming chunks
}
export interface LLMGenerateResult {
 text: string;
 toolCalls: Array<{
  name: string;
  args: unknown;
 }>;
 finishReason: string;
 usage?: {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
 };
 cost?: {
  inputCost: number;
  outputCost: number;
  totalCost: number;
 };
}

/**
 * Smart model selection based on job budget and requirements
 * High budget -> Claude (best quality)
 * Medium budget + tools -> Groq (fast tool calling)
 * Low budget -> Gemini free (cost-effective)
 */
export class LLMClient {
 private openrouterApiKey: string;
 private models: string[];

 // Model tiers for smart routing (Updated March 2026 Value Frontier)
 private readonly MODEL_TIERS = {
  premium: 'anthropic/claude-3.5-sonnet',            // Gold standard reasoning
  fast: 'google/gemini-2.0-flash-001',             // Fastest 2M context
  grok: 'x-ai/grok-4.1-fast',                 // High-speed reasoning
  balanced: 'deepseek/deepseek-chat',             // Value King (V3.2 Speciale level)
  proValue: 'minimax/minimax-01',               // Opus-level coding at 1/20th cost
  coder: 'qwen/qwen-2.5-coder-32b-instruct',          // Pure code specialist
  budget: 'openai/gpt-4o-mini',                // Ultra-reliable small model
 };

 constructor(config: {
  openrouterApiKey: string;
  models?: string[];
 }) {
  this.openrouterApiKey = config.openrouterApiKey;
  // Fallback chain optimized for Value + Speed
  this.models = config.models || [
   this.MODEL_TIERS.fast,
   this.MODEL_TIERS.balanced,
   this.MODEL_TIERS.proValue,
   this.MODEL_TIERS.premium,
  ];
 }

 /**
  * Assess job complexity based on prompt content
  */
 private assessComplexity(prompt: string): 'simple' | 'medium' | 'complex' {
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
    if (!isNaN(num)) estimatedFiles = Math.max(estimatedFiles, num);
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
 private selectModel(budget?: number, hasTools?: boolean, prompt?: string): string {
  if (!budget) return this.models[0]; // Default to first model
  
  // Assess complexity if prompt provided
  const complexity = prompt ? this.assessComplexity(prompt) : 'medium';
  
  // Check if it's a technical/coding task
  const isTechnical = prompt && /code|script|algorithm|bug|fix|implement|function|api|database|react|typescript|backend|frontend/i.test(prompt);

  // High budget jobs deserve premium quality
  if (budget >= 5) {
   logger.info(`High budget ($${budget}), complexity: ${complexity}, using premium model`);
   return this.MODEL_TIERS.premium;
  }
  
  // Medium budget ($2-$5):
  if (budget >= 2) {
   // Complex jobs get Pro-Value model (MiniMax M2.5) if premium is too expensive
   if (complexity === 'complex') {
    logger.info(`Medium budget ($${budget}), complex job, using proValue model (Opus-level logic)`);
    return this.MODEL_TIERS.proValue;
   }
   // Technical medium jobs use specialized coder
   if (isTechnical) {
    logger.info(`Medium budget ($${budget}), technical job, using coder model`);
    return this.MODEL_TIERS.coder;
   }
   // Medium/Simple jobs use balanced model (DeepSeek)
   logger.info(`Medium budget ($${budget}), ${complexity} job, using balanced model`);
   return this.MODEL_TIERS.balanced;
  }
  
  // Low budget (<$2): Prioritize speed and cost
  if (complexity === 'complex') {
   logger.info(`Low budget ($${budget}), complex job, using balanced model (DeepSeek)`);
   return this.MODEL_TIERS.balanced;
  }

  // Default to fast/free model for low budget simple/medium jobs
  logger.info(`Low budget ($${budget}), ${complexity} job, using fast/free model`);
  return this.MODEL_TIERS.fast;
 }

 private async tryModel(
  modelId: string,
  options: LLMGenerateOptions,
  attempt: number = 1,
  maxRetries: number = 3
 ): Promise<LLMGenerateResult> {
  logger.info(`Trying OpenRouter model: ${modelId} (attempt ${attempt}/${maxRetries})`);
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
     stopWhen: stepCountIs(options.maxSteps || 10),
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
    const usageData = await result.usage;
    
    const usage = usageData ? {
     promptTokens: usageData.inputTokens ?? 0,
     completionTokens: usageData.outputTokens ?? 0,
     totalTokens: (usageData.inputTokens ?? 0) + (usageData.outputTokens ?? 0)
    } : undefined;
    
    const cost = usage ? calculateLLMCost(modelId, usage.promptTokens, usage.completionTokens) : undefined;
    
    return {
     text: fullText,
     toolCalls: toolCallsResult.map((tc: any) => ({
      name: tc.toolName,
      args: tc.args,
     })),
     finishReason: finishReason || 'stop',
     usage,
     cost
    };
   }
   
   // Non-streaming generation
   const result = await generateText({
    model: openrouter(modelId),
    messages: options.messages,
    tools: options.tools,
    stopWhen: stepCountIs(options.maxSteps || 10),
    temperature: options.temperature || 0.7,
    abortSignal: timeoutController.signal,
   });

   const usageData = result.usage;
   const usage = usageData ? {
    promptTokens: usageData.inputTokens ?? 0,
    completionTokens: usageData.outputTokens ?? 0,
    totalTokens: (usageData.inputTokens ?? 0) + (usageData.outputTokens ?? 0)
   } : undefined;

   const cost = usage ? calculateLLMCost(modelId, usage.promptTokens, usage.completionTokens) : undefined;

   return {
    text: result.text,
    toolCalls: result.toolCalls?.map((tc: any) => ({
     name: tc.toolName,
     args: tc.args,
    })) || [],
    finishReason: result.finishReason,
    usage,
    cost
   };
  } catch (error) {
   const errorMessage = error instanceof Error ? error.message : String(error);
   const isRateLimit = errorMessage.includes('429') || errorMessage.includes('rate') || errorMessage.includes('Too many');
   const isAbort = error instanceof Error && error.name === 'AbortError';

   if (isAbort) {
    logger.error(`Model ${modelId} aborted (timeout)`);
    throw new Error(`Timeout on model ${modelId}`);
   }
   
   // ONLY retry on rate limits (429) within the same model
   if (isRateLimit) {
    // Extract retry-after if available in error message
    const retryMatch = errorMessage.match(/(\d+)\s*(?:seconds?|ms)/);
    const suggestedWait = retryMatch ? parseInt(retryMatch[1]) * 1000 : 0;
    const waitTime = suggestedWait || Math.pow(2, attempt - 1) * 2000; // Faster retries for hackathon: 2s, 4s, 8s
    const waitSeconds = Math.ceil(waitTime / 1000);
    
    logger.warn(`OpenRouter rate limited on ${modelId}. Waiting ${waitSeconds}s before retry ${attempt}/${maxRetries}`);
    
    if (attempt < maxRetries) {
     await new Promise(resolve => setTimeout(resolve, waitTime));
     return this.tryModel(modelId, options, attempt + 1, maxRetries);
    }
   }
   
   // For all other errors (500, network, empty response), throw so generate() can catch and switch models
   logger.error(`Model ${modelId} execution failed: ${errorMessage}`);
   throw error;
  } finally {
   clearTimeout(timeoutId);
  }
 }


 /**
  * Generate with automatic fallback through OpenRouter models
  * Supports both streaming and non-streaming modes
  */
 async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
  const hasTools = options.tools && Object.keys(options.tools).length > 0;
  
  // Extract prompt from messages for complexity assessment
  const userMessage = options.messages.find(m => m.role === 'user');
  const prompt = userMessage?.content || '';
  
  const primaryModel = this.selectModel(options.budget, hasTools, prompt);
  
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
