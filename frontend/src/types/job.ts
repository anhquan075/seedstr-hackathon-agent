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
