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
        
        return {
            jobs: updatedJobs,
            metrics: {
                ...state.metrics,
                totalJobs: updatedJobs.length,
                completedJobs: completed,
                failedJobs: failed,
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
