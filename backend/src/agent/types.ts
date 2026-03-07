import type { LanguageModelUsage } from 'ai';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SeedstrJob {
  id: string;
  prompt: string;
  budget: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  jobType: 'STANDARD' | 'SWARM';
  maxAgents?: number;
  budgetPerAgent?: number;
  requiredSkills?: string[];
  minReputation?: number;
  expiresAt?: string;
  createdAt: string;
  responseCount: number;
  acceptedCount: number;
  responseType?: 'TEXT' | 'FILE';
  description?: string;
}

export interface SeedstrJobsResponse {
  jobs: SeedstrJob[];
  total: number;
  page: number;
  limit: number;
}

export interface SeedstrUploadFile {
  name: string;
  content: string;
  type: string;
}

export interface SeedstrUploadResponse {
  files: {
    url: string;
    name: string;
    size: number;
    type: string;
  }[];
}

export interface SeedstrSubmitResponse {
  success: boolean;
  message: string;
  responseId?: string;
}

export interface AgentConfig {
  apiKey: string;
  seedstrApiKey?: string;
  openrouterApiKey?: string;
  models?: string[];
  pusherKey?: string;
  pusherCluster?: string;
  twitterHandle?: string;
  name?: string;
  bio?: string;
  pollInterval?: number;
  skills?: string[];
  reputation?: number;
  autonomyMode?: 'manual' | 'supervised' | 'autonomous';
  twitterVerificationRequired?: boolean;
}

export interface DesignSystem {
  name: string;
  tokens: DesignTokens;
  templates: Record<string, string>;
}

export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
}

export interface LLMProvider {
  name: 'groq' | 'openai' | 'anthropic';
  model: string;
  maxTokens?: number;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface TypedEventEmitter<T extends Record<string, unknown>> {
  emit<K extends keyof T>(event: K, data: T[K]): void;
  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): () => void;
  off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void;
}

export type EngineStage =
  | 'idle'
  | 'watching'
  | 'prompt_received'
  | 'generating'
  | 'building'
  | 'packing'
  | 'brain'
  | 'packer'
  | 'submitting'
  | 'completed'
  | 'error';

export interface BuildFile {
  path: string;
  content: string;
  type: 'html' | 'css' | 'js' | 'json' | 'other';
}

export interface BrainOutput {
  rawResponse: string;
  files: BuildFile[];
  llmModel: string;
  tokensUsed?: number;
  generationTimeMs?: number;
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


export interface AgentEventMap {
  system_start: { agent: string; timestamp: number };
  system_stop: { reason: string; timestamp: number };
  system_error: { error: string; stage: EngineStage; timestamp: number };

  job_tick: { timestamp: number };
  job_received: {
    id: string;
    prompt: string;
    budget: number;
    timestamp: number;
    jobType?: 'STANDARD' | 'SWARM';
    skills?: string[];
    description?: string;
    responseType?: 'TEXT' | 'FILE';
    isLocal?: boolean;
  };
  job_processing: {
    id: string;
    stage: EngineStage;
    timestamp: number;
  };
  job_completed: {
    id: string;
    output: string;
    outputTruncated: string;
    responseId: string;
    timestamp: number;
    responseType?: 'TEXT' | 'FILE';
    uploadedFiles?: Array<{ name: string; size: number }>;
  };
  job_failed: {
    id: string;
    error: string;
    stage: EngineStage;
    timestamp: number;
  };

  metrics_update: {
    stage: EngineStage;
    timelineMs: number;
  };

  job_metrics: {
    id: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
    profit: number;
    timestamp: number;
  };

  job_accepted: {
    id: string;
    prompt: string;
    budget: number;
    jobType: 'SWARM' | 'STANDARD';
    timestamp: number;
  };

  job_generated: {
    id: string;
    output: BrainOutput;
    responseType: 'TEXT' | 'FILE';
    timestamp: number;
  };
  job_approval_request: ApprovalEventData;
}

/**
 * SSEEventType - Union of all event types from AgentEventMap

/**
 * SSEEventType - Union of all event types from AgentEventMap
 * Used to type-check event broadcasting and listening
 */
export type SSEEventType = keyof AgentEventMap;

/**
 * Approval event data - SWARM or approval gate events
 * Structure matches what packer emits via bus.emit('job_approval_request', event)
 */
export type ApprovalEventData = 
  | {
      id: string;
      action: 'accept_swarm';
      job: { id: string; prompt: string; budget: number; skills: string[]; jobType: 'STANDARD' | 'SWARM' };
      autoApproved: true;
      timestamp: number;
    }
  | {
      id: string;
      action: 'submit_response';
      job: { id: string; prompt: string; budget: number; skills: string[]; jobType: 'STANDARD' | 'SWARM' };
      autoApproved: true;
      responseType: 'TEXT' | 'FILE';
      timestamp: number;
    };

export type AgentEvent =
  | { type: "startup" }
  | { type: "shutdown" }
  | { type: "websocket_connected" }
  | { type: "websocket_disconnected"; reason?: string }
  | { type: "websocket_job"; jobId: string }
  | { type: "polling"; jobCount: number }
  | { type: "job_found"; job: SeedstrJob }
  | { type: "job_accepted"; job: SeedstrJob; budgetPerAgent: number | null }
  | { type: "job_processing"; job: SeedstrJob }
  | { type: "job_skipped"; job: SeedstrJob; reason: string }
  | { type: "tool_call"; tool: string; args: unknown }
  | { type: "tool_result"; tool: string; result: any }
  | { type: "response_generated"; job: SeedstrJob; preview: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }
  | { type: "project_built"; job: SeedstrJob; files: string[]; zipPath: string }
  | { type: "files_uploading"; job: SeedstrJob; fileCount: number }
  | { type: "files_uploaded"; job: SeedstrJob; files: any[] }
  | { type: "response_submitted"; job: SeedstrJob; responseId: string; hasFiles?: boolean }
  | { type: "error"; message: string; error?: any };
