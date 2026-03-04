/**
 * Error categorization and structured error tracking
 * Enables debugging, monitoring, and metrics by error type
 */

export enum ErrorStage {
  POLL = 'poll',           // Seedstr API polling failed
  PARSE = 'parse',         // JSON parsing/repair failed
  LLM = 'llm',             // LLM API call failed
  PROMPT = 'prompt',       // Failed to extract/understand prompt
  BUILD = 'build',         // Project build/generation failed
  ZIP = 'zip',             // ZIP compression/creation failed
  SUBMIT = 'submit',       // Seedstr submission failed
  UNKNOWN = 'unknown',     // Unknown error stage
}

export enum ErrorCategory {
  // API/Network errors
  API_REQUEST_FAILED = 'api_request_failed',
  NETWORK_TIMEOUT = 'network_timeout',
  RATE_LIMITED = 'rate_limited',
  AUTH_FAILED = 'auth_failed',
  HTTP_4XX = 'http_4xx',
  HTTP_5XX = 'http_5xx',

  // LLM-specific errors
  LLM_API_ERROR = 'llm_api_error',
  LLM_MODEL_NOT_FOUND = 'llm_model_not_found',
  LLM_CONTEXT_EXCEEDED = 'llm_context_exceeded',
  LLM_RATE_LIMITED = 'llm_rate_limited',
  LLM_INVALID_KEY = 'llm_invalid_key',

  // Parsing/Data errors
  JSON_REPAIR_FAILED = 'json_repair_failed',
  INVALID_RESPONSE_FORMAT = 'invalid_response_format',
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  INVALID_FIELD_TYPE = 'invalid_field_type',

  // Build/Generation errors
  BUILD_FAILED = 'build_failed',
  TEMPLATE_NOT_FOUND = 'template_not_found',
  FILE_WRITE_ERROR = 'file_write_error',
  INVALID_FILE_STRUCTURE = 'invalid_file_structure',

  // Submission errors
  SUBMISSION_FAILED = 'submission_failed',
  SUBMISSION_REJECTED = 'submission_rejected',
  FILE_UPLOAD_FAILED = 'file_upload_failed',

  // Configuration/Runtime errors
  CONFIG_ERROR = 'config_error',
  INVALID_PROMPT = 'invalid_prompt',
  TIMEOUT = 'timeout',
  OUT_OF_MEMORY = 'out_of_memory',
  UNKNOWN_ERROR = 'unknown_error',
}

export interface CategorizedError {
  stage: ErrorStage;
  category: ErrorCategory;
  message: string;
  originalError: Error;
  timestamp: number;
  retryable: boolean;
}

/**
 * Categorize an error based on type, message, and context
 */
export function categorizeError(
  error: unknown,
  stage: ErrorStage = ErrorStage.UNKNOWN,
  context?: string
): CategorizedError {
  const originalError = error instanceof Error ? error : new Error(String(error));
  const message = originalError.message;
  const stack = originalError.stack || '';

  let category = ErrorCategory.UNKNOWN_ERROR;
  let retryable = false;

  // Network/API errors
  if (message.includes('fetch') || message.includes('network') || message.includes('ECONNREFUSED')) {
    category = ErrorCategory.API_REQUEST_FAILED;
    retryable = true;
  } else if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    category = ErrorCategory.NETWORK_TIMEOUT;
    retryable = true;
  } else if (message.includes('429') || message.includes('rate') || message.includes('throttled')) {
    category = ErrorCategory.RATE_LIMITED;
    retryable = true;
  } else if (message.includes('401') || message.includes('unauthorized') || message.includes('invalid api key')) {
    category = ErrorCategory.AUTH_FAILED;
    retryable = false;
  } else if (message.includes('403') || message.includes('forbidden')) {
    category = ErrorCategory.HTTP_4XX;
    retryable = false;
  } else if (message.includes('404') || message.includes('not found')) {
    category = ErrorCategory.HTTP_4XX;
    retryable = false;
  } else if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
    category = ErrorCategory.HTTP_5XX;
    retryable = true;
  }
  // LLM-specific errors
  else if (message.includes('openrouter') || message.includes('anthropic') || message.includes('openai')) {
    if (message.includes('model') && message.includes('not found')) {
      category = ErrorCategory.LLM_MODEL_NOT_FOUND;
      retryable = false;
    } else if (message.includes('context') || message.includes('token')) {
      category = ErrorCategory.LLM_CONTEXT_EXCEEDED;
      retryable = true;
    } else if (message.includes('rate')) {
      category = ErrorCategory.LLM_RATE_LIMITED;
      retryable = true;
    } else if (message.includes('api_key') || message.includes('auth')) {
      category = ErrorCategory.LLM_INVALID_KEY;
      retryable = false;
    } else {
      category = ErrorCategory.LLM_API_ERROR;
      retryable = true;
    }
  }
  // JSON parsing/repair errors
  else if (message.includes('JSON') || message.includes('parse') || message.includes('stringify')) {
    category = ErrorCategory.JSON_REPAIR_FAILED;
    retryable = true;
  }
  // Build/file errors
  else if (message.includes('ENOENT') || message.includes('file') || message.includes('directory')) {
    category = ErrorCategory.FILE_WRITE_ERROR;
    retryable = false;
  } else if (message.includes('build') || message.includes('compile')) {
    category = ErrorCategory.BUILD_FAILED;
    retryable = false;
  } else if (message.includes('template')) {
    category = ErrorCategory.TEMPLATE_NOT_FOUND;
    retryable = false;
  }
  // Memory/Resource errors
  else if (message.includes('memory') || message.includes('heap') || message.includes('ENOMEM')) {
    category = ErrorCategory.OUT_OF_MEMORY;
    retryable = true;
  }
  // Timeout
  else if (message.includes('deadline') || message.includes('timeout')) {
    category = ErrorCategory.TIMEOUT;
    retryable = true;
  }

  return {
    stage,
    category,
    message,
    originalError,
    timestamp: Date.now(),
    retryable,
  };
}

/**
 * Format error for logging
 */
export function formatError(error: CategorizedError): string {
  return `[${error.stage.toUpperCase()}] ${error.category}: ${error.message}`;
}

/**
 * Get retry strategy based on error
 */
export function getRetryStrategy(error: CategorizedError): {
  shouldRetry: boolean;
  delayMs: number;
  maxAttempts: number;
} {
  if (!error.retryable) {
    return { shouldRetry: false, delayMs: 0, maxAttempts: 1 };
  }

  // Rate limited / network issues: aggressive retry with exponential backoff
  if (error.category === ErrorCategory.RATE_LIMITED || error.category === ErrorCategory.NETWORK_TIMEOUT) {
    return { shouldRetry: true, delayMs: 5000, maxAttempts: 5 };
  }

  // Server errors: moderate retry
  if (error.category === ErrorCategory.HTTP_5XX || error.category === ErrorCategory.API_REQUEST_FAILED) {
    return { shouldRetry: true, delayMs: 2000, maxAttempts: 3 };
  }

  // JSON/parsing errors: one retry (might fix with different LLM model)
  if (error.category === ErrorCategory.JSON_REPAIR_FAILED) {
    return { shouldRetry: true, delayMs: 1000, maxAttempts: 2 };
  }

  // LLM errors: retry with fallback provider
  if (error.stage === ErrorStage.LLM) {
    return { shouldRetry: true, delayMs: 1000, maxAttempts: 3 };
  }

  // Other retryable errors: minimal retry
  return { shouldRetry: true, delayMs: 1000, maxAttempts: 2 };
}
