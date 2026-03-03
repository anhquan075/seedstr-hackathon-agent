export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface LLMGenerateOptions {
    messages: LLMMessage[];
    tools?: Record<string, any>;
    maxSteps?: number;
    temperature?: number;
    budget?: number;
    stream?: boolean;
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
export declare class LLMClient {
    private openrouterApiKey;
    private models;
    private readonly MODEL_TIERS;
    constructor(config: {
        openrouterApiKey: string;
        models?: string[];
    });
    /**
     * Select optimal model based on job budget and requirements
     */
    private selectModel;
    private tryModel;
    /**
     * Generate with automatic fallback through OpenRouter models
     * Supports both streaming and non-streaming modes
     */
    generate(options: LLMGenerateOptions): Promise<LLMGenerateResult>;
}
//# sourceMappingURL=llm-client.d.ts.map