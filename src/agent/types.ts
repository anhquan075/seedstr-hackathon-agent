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
}

export interface SeedstrJobsResponse {
  jobs: SeedstrJob[];
  total: number;
  page: number;
  limit: number;
}

export interface SeedstrUploadFile {
  name: string;
  content: string; // base64
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
  pusherKey?: string;
  pusherCluster?: string;
  twitterHandle?: string;

  skills?: string[];
  reputation?: number;
  pollInterval?: number; // ms
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
