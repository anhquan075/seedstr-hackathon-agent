import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Job {
  id: string;
  type: string;
  status: "received" | "processing" | "completed" | "failed";
  prompt?: string;
  result?: string;
  output?: string | object;
  error?: string;
  timestamp: number;
  completedAt?: number;
  manual?: boolean;
  retryCount?: number;
  budget?: number;
  skills?: string[];
  uploadedFiles?: { name: string; size: number }[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    profit?: number;
  };
}

interface JobStore {
  jobs: Job[];
  upsertJob: (id: string, status: Job["status"], data: any) => void;
  setJobs: (jobs: Job[]) => void;
  metrics: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    lastJobTime: number;
    avgResponseTime: number; // Placeholder
    totalCost: number;
    totalProfit: number;
  };
}

export const useJobStore = create<JobStore>(
  persist(
    (set) => ({
      jobs: [],
      metrics: {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        lastJobTime: 0,
        avgResponseTime: 0,
        totalCost: 0,
        totalProfit: 0,
      },
      upsertJob: (id, status, data) => set((state) => {
        const existing = state.jobs.find((j) => j.id === id);
        let updatedJobs;

        const jobData = {
            ...data,
            ...(status === "completed" || status === "failed" ? { completedAt: Date.now() } : {}),
        };

        if (existing) {
            updatedJobs = state.jobs.map((j) =>
                j.id === id ? { ...j, status, ...jobData } : j
            );
        } else {
            updatedJobs = [
                { id, type: "unknown", status, timestamp: Date.now(), ...jobData } as Job,
                ...state.jobs,
            ];
        }
        
        // Update metrics
        const completed = updatedJobs.filter((j) => j.status === "completed").length;
        const failed = updatedJobs.filter((j) => j.status === "failed").length;
        
        // Calculate aggregate cost and profit
        const totalCost = updatedJobs.reduce((acc, j) => acc + (j.cost?.totalCost || 0), 0);
        const totalProfit = updatedJobs.reduce((acc, j) => acc + (j.cost?.profit || 0), 0);
        
        return {
            jobs: updatedJobs,
            metrics: {
                ...state.metrics,
                totalJobs: updatedJobs.length,
                completedJobs: completed,
                failedJobs: failed,
                totalCost,
                totalProfit,
                lastJobTime: (status === "completed" || status === "failed") ? Date.now() : state.metrics.lastJobTime,
            }
        };
      }),
      setJobs: (jobs) => set((state) => {
         const completed = jobs.filter((j) => j.status === "completed").length;
         const failed = jobs.filter((j) => j.status === "failed").length;
         return {
            jobs,
            metrics: {
                ...state.metrics,
                totalJobs: jobs.length,
                completedJobs: completed,
                failedJobs: failed,
            }
         }
      }),
    }),
    {
      name: 'job-store',
      partialize: (state) => ({
        jobs: state.jobs,
        metrics: state.metrics,
      }),
    }
  )
);
