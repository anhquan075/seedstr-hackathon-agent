
/**
 * Pricing data for common models used via OpenRouter/OpenAI/Anthropic
 * Prices are in USD per 1M tokens (Input / Output)
 * 
 * Sources: OpenRouter Pricing & Provider Docs (Estimated March 2026)
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  'anthropic/claude-3.5-sonnet': { input: 3.0, output: 15.0 },
  'anthropic/claude-3-opus': { input: 15.0, output: 75.0 },
  'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },
  
  // OpenAI
  'openai/gpt-4o': { input: 5.0, output: 15.0 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'openai/gpt-4-turbo': { input: 10.0, output: 30.0 },

  // xAI (Grok)
  'x-ai/grok-4.1-fast': { input: 0.2, output: 0.5 },
  
  // Meta Llama (via OpenRouter/Groq/DeepInfra)
  'meta-llama/llama-3.3-70b-instruct': { input: 0.6, output: 0.6 },
  'meta-llama/llama-3.1-405b-instruct': { input: 2.0, output: 2.0 },
  
  // DeepSeek (Value King)
  'deepseek/deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek/deepseek-reasoner': { input: 0.55, output: 2.19 },

  // Qwen (Coding Specialist)
  'qwen/qwen-2.5-coder-32b-instruct': { input: 0.07, output: 0.14 },

  // Google
  'google/gemini-2.0-flash-001': { input: 0.1, output: 0.4 },
  'google/gemini-pro-1.5': { input: 1.25, output: 3.75 },

  // Default fallback for unknown models
  'default': { input: 1.0, output: 2.0 }
};

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

/**
 * Calculates the USD cost of an LLM completion
 */
export function calculateLLMCost(model: string, inputTokens: number, outputTokens: number): CostBreakdown {
  // Normalize model name (e.g., removing provider prefix if necessary)
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['default'];
  
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost
  };
}
