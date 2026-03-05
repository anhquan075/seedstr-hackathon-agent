import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Download,
  Loader,
  RotateCcw,
  StopCircle,
  Terminal,
  Wifi,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSSE } from "../hooks/useSSE";
import { Job, useJobStore } from "../store/jobStore";
import JobCard from "./JobCard";
import JobDetailModal from "./JobDetailModal";
import { MetricCard } from "./MetricCard";
import { StatusBadge } from "./StatusBadge";

interface AgentHealth {
  status: "ok" | "error" | "offline";
  lastCheck: number;
  details?: any;
}

interface Metrics {
  uptime: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgResponseTime: number;
  lastJobTime: number;
}

interface Agent {
  id: string;
  name: string;
  status: "running" | "stopped" | "error";
  uptime: number;
  uptimeSeconds: number;
  clients: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  successRate: number;
  capabilities?: string[];
}

export default function Dashboard() {
  const { jobs, metrics: storeMetrics } = useJobStore();
  const sseHook = useSSE();
  const logs = (sseHook as any)?.logs || [];
  const connectionStatus = (sseHook as any)?.connectionStatus || "disconnected";
  const addLog = (sseHook as any)?.addLog || (() => {});

  const [health, setHealth] = useState<AgentHealth>({
    status: "offline",
    lastCheck: 0,
  });

  const [agentInfo, setAgentInfo] = useState<Agent | null>(null);
  const [agentLoading, setAgentLoading] = useState<boolean>(false);

  // Metrics from API polling
  const [apiMetrics, setApiMetrics] = useState<Metrics>({
    uptime: 0,
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    avgResponseTime: 0,
    lastJobTime: 0,
  });

  // Client-only rendering to prevent SSR/CSR mismatches
  const [mounted, setMounted] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Health Check & Metrics Polling
  useEffect(() => {
    const checkHealthAndMetrics = async () => {
      try {
        const isLocal =
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1");
        const apiUrl = isLocal
          ? "http://localhost:8080"
          : import.meta.env.VITE_API_URL ||
            `${window.location.protocol}//${window.location.host}`;

        // Fetch health check
        const healthRes = await fetch(`${apiUrl}/health`);
        if (healthRes.ok) {
          const data = await healthRes.json();
          setHealth({ status: "ok", lastCheck: Date.now(), details: data });
        } else {
          setHealth({ status: "error", lastCheck: Date.now() });
        }

        // Fetch real metrics from agents API
        setAgentLoading(true);
        const metricsRes = await fetch(`${apiUrl}/api/agents`);
        if (metricsRes.ok) {
          const { agents } = await metricsRes.json();
          if (agents && agents.length > 0) {
            const agent = agents[0];
            setAgentInfo(agent);
            const newMetrics = {
              uptime: agent.uptime || 0,
              totalJobs: agent.totalJobs || 0,
              completedJobs: agent.completedJobs || 0,
              failedJobs: agent.failedJobs || 0,
              avgResponseTime: agent.avgResponseTime || 0,
              lastJobTime: agent.lastJobTime || 0,
            };
            setApiMetrics(newMetrics);
          }
        }
        setAgentLoading(false);
      } catch (e) {
        setHealth({ status: "offline", lastCheck: Date.now() });
        setAgentLoading(false);
      }
    };

    const interval = setInterval(checkHealthAndMetrics, 5000);
    checkHealthAndMetrics();
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const abortCurrentJob = async () => {
    const processingJob = jobs.find((j: Job) => j.status === "processing");
    if (!processingJob) return;
    try {
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");
      const apiUrl = isLocal
        ? "http://localhost:8080"
        : import.meta.env.VITE_API_URL || window.location.origin;
      await fetch(`${apiUrl}/control/stop`, { method: "POST" });
      addLog("info", "Job aborted by operator");

      useJobStore
        .getState()
        .upsertJob(processingJob.id, "failed", {
          result: "Aborted by operator",
        });
    } catch (e) {
      addLog("error", "Failed to abort job");
    }
  };

  const retryLastJob = async () => {
    const lastCompleted = [...jobs]
      .reverse()
      .find((j: Job) => j.status === "completed");
    if (!lastCompleted) return;
    try {
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");
      const apiUrl = isLocal
        ? "http://localhost:8080"
        : import.meta.env.VITE_API_URL || window.location.origin;
      await fetch(`${apiUrl}/control/replay`, { method: "POST" });
      addLog("info", "Retrying last job");
    } catch (e) {
      addLog("error", "Failed to retry job");
    }
  };

  const exportRun = () => {
    const runData = {
      timestamp: new Date().toISOString(),
      jobs: jobs.slice(0, 10).map((j: Job) => ({
        id: j.id,
        prompt: j.prompt,
        result: j.result,
        status: j.status,
        timestamp: j.timestamp,
        manual: j.manual,
        uploadedFiles: j.uploadedFiles,
      })),
    };
    const blob = new Blob([JSON.stringify(runData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `run-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("info", "Run exported");
  };

  // Combine metrics: store has realtime counts, api has uptime/avg
  const displayMetrics = {
    uptime: apiMetrics.uptime,
    totalJobs: storeMetrics.totalJobs || apiMetrics.totalJobs,
    completedJobs: storeMetrics.completedJobs || apiMetrics.completedJobs,
    failedJobs: storeMetrics.failedJobs || apiMetrics.failedJobs,
    avgResponseTime: apiMetrics.avgResponseTime,
    lastJobTime: storeMetrics.lastJobTime || apiMetrics.lastJobTime,
    successRate:
      (storeMetrics.totalJobs || apiMetrics.totalJobs) > 0
        ? Math.round(
            ((storeMetrics.completedJobs || apiMetrics.completedJobs) /
              (storeMetrics.totalJobs || apiMetrics.totalJobs)) *
              100,
          )
        : 0,
  };

  // Show loading state during SSR/hydration
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">
          Loading Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono p-4 md:p-8 overflow-hidden relative">
      {/* Background Effects */}
      <div className="scanlines absolute inset-0 pointer-events-none z-50 opacity-10"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-50"></div>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-blue-400/30 pb-4 relative">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Cpu className="w-10 h-10 text-blue-400 animate-pulse" />
            <div className="absolute inset-0 bg-blue-400 blur-lg opacity-40"></div>
          </div>
          <div>
            <h1
              className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 uppercase"
              style={{ fontFamily: "var(--font-orbitron)" }}
            >
              Dashboard
            </h1>
            <p className="text-xs text-blue-400/70 tracking-widest uppercase">
              System Monitoring Interface
            </p>
          </div>
        </div>

        <div className="flex gap-4 mt-4 md:mt-0">
          <StatusBadge
            label="NET"
            status={connectionStatus === "connected" ? "active" : "error"}
            icon={Wifi}
          />
          <StatusBadge
            label="SYS"
            status={health.status === "ok" ? "active" : "error"}
            icon={Activity}
          />
          <StatusBadge
            label="AI"
            status={health.status === "ok" ? "active" : "warn"}
            icon={Zap}
          />
        </div>

        {/* Operator Console */}
        <div className="flex gap-2 mt-4 md:mt-0">
          <button
            onClick={abortCurrentJob}
            className="px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-xs uppercase tracking-wider hover:bg-red-500/30 transition-colors flex items-center gap-2"
          >
            <StopCircle className="w-3 h-3" /> Abort
          </button>
          <button
            onClick={retryLastJob}
            className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/50 rounded text-purple-500 text-xs uppercase tracking-wider hover:bg-purple-500/30 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-3 h-3" /> Retry
          </button>
          <button
            onClick={exportRun}
            className="px-3 py-1.5 bg-green-400/20 border border-green-400/50 rounded text-green-400 text-xs uppercase tracking-wider hover:bg-green-400/30 transition-colors flex items-center gap-2"
          >
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </header>

      {/* Production Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <MetricCard
          label="Uptime"
          metricKey="uptime"
          icon={Activity}
          color="cyan"
          suppressHydrationWarning
        />
        <MetricCard
          label="Total Jobs"
          metricKey="totalJobs"
          icon={Zap}
          color="magenta"
        />
        <MetricCard
          label="Completed"
          metricKey="completedJobs"
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          label="Failed"
          metricKey="failedJobs"
          icon={AlertTriangle}
          color="red"
        />
        <MetricCard
          label="Success Rate"
          metricKey="successRate"
          icon={Activity}
          color="cyan"
        />
      </section>

      {/* Operations Layout */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-900px)] min-h-[500px]">
        {/* Left Column: Job Queue */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-hidden">
          {/* Active Jobs */}
          <section className="flex-1 bg-slate-900/50 border border-blue-400/20 rounded-lg p-4 relative overflow-hidden backdrop-blur-sm box-glow-cyan">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
              <Loader className="w-5 h-5 animate-spin" /> ACTIVE OPERATIONS
            </h2>
            <div className="h-[calc(100%-3rem)] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              <AnimatePresence>
                {jobs.filter(
                  (j: Job) =>
                    j.status === "processing" || j.status === "received",
                ).length === 0 && (
                  <div className="text-center text-gray-500 py-10 italic">
                    No active operations. Waiting for command...
                  </div>
                )}
                {jobs
                  .filter(
                    (j: Job) =>
                      j.status === "processing" || j.status === "received",
                  )
                  .map((job: Job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      active
                      onClick={() => setSelectedJob(job)}
                    />
                  ))}
              </AnimatePresence>
            </div>
          </section>

          {/* Completed Jobs */}
          <section className="flex-1 bg-slate-800/30 border border-purple-500/20 rounded-lg p-4 relative overflow-hidden backdrop-blur-sm box-glow-magenta">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-500">
              <CheckCircle className="w-5 h-5" /> RECENTLY COMPLETED
            </h2>
            <div className="h-[calc(100%-3rem)] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {jobs
                .filter(
                  (j: Job) => j.status === "completed" || j.status === "failed",
                )
                .slice(0, 5)
                .map((job: Job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onClick={() => setSelectedJob(job)}
                  />
                ))}
              {jobs.filter(
                (j: Job) => j.status === "completed" || j.status === "failed",
              ).length === 0 && (
                <div className="text-center text-gray-500 py-10 italic">
                  System idle. No recent history.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Terminal Logs */}
        <div className="bg-slate-950 border border-green-400/30 rounded-lg p-4 font-fira-code text-sm relative overflow-hidden flex flex-col h-full box-glow-green">
          <div className="absolute top-0 left-0 right-0 h-6 bg-green-400/10 flex items-center px-2 gap-2 border-b border-green-400/20">
            <Terminal className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400 uppercase tracking-wider">
              System Terminal
            </span>
          </div>
          <div
            className="mt-6 flex-1 overflow-y-auto space-y-1 p-2 custom-scrollbar"
            ref={scrollRef}
          >
            {logs.map((log: (typeof logs)[0]) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex gap-2 ${log.level === "error" ? "text-red-500" : log.level === "warn" ? "text-yellow-500" : "text-green-400"}`}
              >
                <span className="opacity-50" suppressHydrationWarning>
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span className="uppercase font-bold text-xs w-12">
                  {log.level}
                </span>
                <span>{log.message}</span>
              </motion.div>
            ))}
            <div className="animate-pulse text-green-400">_</div>
          </div>
        </div>
      </main>
      <JobDetailModal
        job={selectedJob}
        isOpen={selectedJob !== null}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  );
}

function formatUptime(ms: number): string {
  if (ms <= 0) return "0s";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
