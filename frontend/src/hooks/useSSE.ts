import { useEffect, useState } from 'react';
import { useJobStore } from '../store/jobStore';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
}

export function useSSE(): { logs: LogEntry[]; connectionStatus: "connected" | "disconnected" | "connecting"; addLog: (level: "info" | "warn" | "error", message: string) => void } {
  const upsertJob = useJobStore((state) => state.upsertJob);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");

  const addLog = (level: "info" | "warn" | "error", message: string) => {
    setLogs((prev) => [
      ...prev.slice(-100),
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        timestamp: new Date().toISOString(),
        level,
        message,
      },
    ]);
  };

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      setConnectionStatus("connecting");
      // Auto-detect SSE URL based on current hostname
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");
      const sseUrl = isLocal
        ? "http://localhost:8080/events"
        : `${import.meta.env.VITE_API_URL || window.location.protocol + "//" + window.location.host}/events`;

      console.log("[SSE] Connecting to:", sseUrl);
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        setConnectionStatus("connected");
        addLog("info", "Connected to Agent Event Stream");
        console.log("[SSE] Connected successfully:", sseUrl);
      };

      eventSource.onerror = () => {
        // Don't log as error - this fires for normal disconnects (timeout, tab sleep, etc.)
        // Reconnection happens automatically after 3s
        setConnectionStatus("disconnected");
        addLog("info", "SSE disconnected. Reconnecting...");
        eventSource?.close();
        setTimeout(connectSSE, 3000);
        console.log("[SSE] Disconnected, reconnecting in 3s...");
      };

      eventSource.addEventListener("log", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          addLog(data.level || "info", data.message || JSON.stringify(data));
        } catch (e) {
          addLog("error", "Failed to parse log event");
        }
      });

      eventSource.addEventListener("job_received", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const jobId = data.jobId || data.id || Date.now().toString();
          
          upsertJob(jobId, "received", {
            id: jobId,
            prompt: data.prompt,
            budget: data.budget,
            status: "received",
            timestamp: data.timestamp || Date.now(),
          });
          
          addLog("info", `Job Received: ${jobId}`);
        } catch (e) {
          addLog("error", "Failed to parse job_received event");
        }
      });

      // Handle job_found from /api/jobs POST (different from polling job_received)
      eventSource.addEventListener("job_found", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const jobId = data.jobId || data.id || Date.now().toString();
          
          upsertJob(jobId, "received", {
            id: jobId,
            prompt: data.prompt,
            budget: data.budget,
            status: "received",
            timestamp: data.timestamp || Date.now(),
          });
          
          addLog("info", `Job Found: ${jobId}`);
        } catch (e) {
          addLog("error", "Failed to parse job_found event");
        }
      });

      eventSource.addEventListener("job_processing", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          upsertJob(data.id, "processing", data);
        } catch (e) {}
      });

      eventSource.addEventListener("job_completed", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          upsertJob(data.id, "completed", data);
          addLog("info", `Job Completed: ${data.id}`);
        } catch (e) {}
      });

      eventSource.addEventListener("job_failed", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          upsertJob(data.id, "failed", data);
          addLog("error", `Job Failed: ${data.id}`);
        } catch (e) {}
      });
    };

    connectSSE();

    return () => {
      eventSource?.close();
    };
  }, [upsertJob]);

  return { logs, connectionStatus, addLog };
}
