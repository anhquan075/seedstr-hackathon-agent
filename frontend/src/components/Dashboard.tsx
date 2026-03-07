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
    <div className="min-h-screen bg-[#0a0a0c] text-slate-300 p-4 md:p-8 font-mono selection:bg-orange-500/30 crt-screen pixel-grid relative overflow-hidden">
      <div className="scanline"></div>
      
      {/* Cinematic Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-600/20 border border-orange-500/50 rounded flex items-center justify-center box-glow-fire relative group overflow-hidden cyber-border">
            <Cpu className="w-7 h-7 text-orange-500 animate-pulse relative z-10" />
            <div className="absolute inset-0 bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors"></div>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic flex items-center gap-2 neon-glow-fire">
              Prometheus <span className="text-orange-500">Core</span>
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-orange-500/70 font-bold uppercase tracking-[0.2em]">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
              Neural Network Active
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded cyber-border">
            <Wifi className={`w-3 h-3 ${connectionStatus === "connected" ? "text-green-400" : "text-red-400"}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">NET: {connectionStatus}</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded cyber-border">
            <Activity className={`w-3 h-3 ${health.status === "ok" ? "text-green-400" : "text-yellow-400"}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">SYS: {health.status}</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded cyber-border">
            <Zap className="w-3 h-3 text-orange-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest">AI: ONLINE</span>
          </div>
        </div>

        {/* Operator Console */}
        <div className="flex gap-2 mt-4 md:mt-0">
          <button
            onClick={abortCurrentJob}
            className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all hover:border-red-500/60 cyber-border flex items-center gap-2 group"
          >
            <StopCircle className="w-3 h-3 group-hover:scale-110 transition-transform" /> ABORT_OP
          </button>
          <button
            onClick={retryLastJob}
            className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-bold uppercase tracking-widest hover:bg-orange-500/20 transition-all hover:border-orange-500/60 cyber-border flex items-center gap-2 group"
          >
            <RotateCcw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" /> REPLAY_GEN
          </button>
          <button
            onClick={exportRun}
            className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-bold uppercase tracking-widest hover:bg-green-500/20 transition-all hover:border-green-500/60 cyber-border flex items-center gap-2 group"
          >
            <Download className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" /> EXPORT_DATA
          </button>
        </div>
      </header>

      {/* Production Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6 relative z-10">
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
        <MetricCard
          label="Total Cost"
          metricKey="totalCost"
          icon={Zap}
          color="red"
        />
        <MetricCard
          label="Net Profit"
          metricKey="totalProfit"
          icon={Zap}
          color="green"
        />
      </section>

      {/* Operations Layout */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-900px)] min-h-[500px] relative z-10">
        {/* Left Column: Job Queue */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-hidden">
          {/* Active Jobs */}
          <section className="flex-1 bg-slate-900/40 border border-orange-500/20 rounded p-4 relative overflow-hidden backdrop-blur-md box-glow-fire cyber-border">
            <h2 className="text-sm font-black mb-4 flex items-center gap-2 text-orange-500 uppercase tracking-[0.3em]">
              <Loader className="w-4 h-4 animate-spin" /> &gt;&gt; ACTIVE_OPERATIONS
            </h2>
            <div className="h-[calc(100%-3rem)] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              <AnimatePresence>
                {jobs.filter(
                  (j: Job) =>
                    j.status === "processing" || j.status === "received",
                ).length === 0 && (
                  <div className="text-center text-slate-600 py-10 italic text-xs uppercase tracking-widest">
                    No active operations. Standby mode...
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
          <section className="flex-1 bg-slate-900/20 border border-slate-800 rounded p-4 relative overflow-hidden backdrop-blur-sm cyber-border">
            <h2 className="text-sm font-black mb-4 flex items-center gap-2 text-slate-500 uppercase tracking-[0.3em]">
              <CheckCircle className="w-4 h-4" /> &gt;&gt; RECENTLY_COMPLETED
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
                <div className="text-center text-slate-700 py-10 italic text-xs uppercase tracking-widest">
                  System idle. No recent history.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Terminal Logs */}
        <div className="bg-[#050505] border border-orange-500/30 rounded p-4 font-mono text-xs relative overflow-hidden flex flex-col h-full box-glow-fire-intense cyber-border">
          <div className="absolute top-0 left-0 right-0 h-6 bg-orange-500/10 flex items-center px-2 gap-2 border-b border-orange-500/20">
            <Terminal className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] text-orange-500 uppercase font-black tracking-widest">
              PROM_KERN_LOG
            </span>
          </div>
          <div
            className="mt-6 flex-1 overflow-y-auto space-y-1 p-2 custom-scrollbar terminal-glitch"
            ref={scrollRef}
          >
            {logs.map((log: (typeof logs)[0]) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex gap-2 font-mono ${log.level === "error" ? "text-red-500" : log.level === "warn" ? "text-yellow-500" : "text-orange-400"}`}
              >
                <span className="opacity-30 shrink-0">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span className="uppercase font-bold shrink-0 w-10">
                  {log.level}
                </span>
                <span className="break-all">{log.message}</span>
              </motion.div>
            ))}
            <div className="animate-pulse text-orange-500">_</div>
          </div>
        </div>
      </main>

      {/* High-Tech Footer */}
      <footer className="mt-8 pt-6 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10 text-[10px] font-black uppercase tracking-widest text-slate-600">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
            PROMETHEUS_CORE_OS
          </div>
          <div className="hidden md:block opacity-50">
            ENGINE: GROK_4.1_FAST & GEMINI_2.0_PRO
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden lg:block text-slate-700">
            COORD: 37.7749° N, 122.4194° W
          </div>
          <div className="text-orange-500 flex items-center gap-2 font-mono">
            <Activity className="w-3 h-3" /> {new Date().toLocaleTimeString()} UTC
          </div>
        </div>
      </footer>

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
