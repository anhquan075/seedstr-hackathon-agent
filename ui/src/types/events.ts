export type AgentEvent = 
  | { type: 'agent_started'; timestamp: number; data: { uptime: number } }
  | { type: 'polling'; timestamp: number; data: { interval: number } }
  | { type: 'job_found'; timestamp: number; data: { id: string; prompt: string; budget: number; skills?: string[] } }
  | { type: 'job_generating'; timestamp: number; data: { id: string; model: string } }
  | { type: 'job_building'; timestamp: number; data: { id: string; progress: number } }
  | { type: 'job_submitting'; timestamp: number; data: { id: string } }
  | { type: 'job_success'; timestamp: number; data: { id: string; duration: number } }
  | { type: 'job_failed'; timestamp: number; data: { id: string; error: string } }
  | { type: 'error'; timestamp: number; data: { message: string } };

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface JobState {
  id: string;
  prompt: string;
  budget: number;
  skills?: string[];
  stage: 'fetching' | 'generating' | 'building' | 'submitting' | 'complete' | 'failed';
  progress: number;
  startTime: number;
  model?: string;
  error?: string;
}

export interface AgentStats {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  totalEarnings: number;
  averageCompletionTime: number;
  uptime: number;
  pollInterval: number;
  isPaused: boolean;
}