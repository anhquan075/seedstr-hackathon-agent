"use client";

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
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
}

interface Job {
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
}

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

export default function Dashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [health, setHealth] = useState<AgentHealth>({
    status: "offline",
    lastCheck: 0,
  });
  const [metrics, setMetrics] = useState<Metrics>({
    uptime: 0,
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    avgResponseTime: 0,
    lastJobTime: 0,
  });
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("connecting");

  // Client-only rendering to prevent SSR/CSR mismatches
  const [mounted, setMounted] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  useEffect(() => {
    setMounted(true);
  }, []);
  const scrollRef = useRef<HTMLDivElement>(null);

  // SSE Connection
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
        setConnectionStatus("disconnected");
        addLog("error", "SSE Connection Error. Retrying...");
        eventSource?.close();
        setTimeout(connectSSE, 3000);
        console.error("[SSE] Connection failed:", sseUrl);
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
          updateJob(data.id || Date.now().toString(), "received", data);
          addLog("info", `Job Received: ${data.id}`);
        } catch (e) {}
      });

      eventSource.addEventListener("job_processing", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          updateJob(data.id, "processing", data);
        } catch (e) {}
      });

      eventSource.addEventListener("job_completed", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          updateJob(data.id, "completed", data);
          addLog("info", `Job Completed: ${data.id}`);
        } catch (e) {}
      });

      eventSource.addEventListener("job_failed", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          updateJob(data.id, "failed", data);
          addLog("error", `Job Failed: ${data.id}`);
        } catch (e) {}
      });
    };

    connectSSE();

    return () => {
      eventSource?.close();
    };
  }, []);

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
        const metricsRes = await fetch(`${apiUrl}/api/agents`);
        if (metricsRes.ok) {
          const { agents } = await metricsRes.json();
          if (agents && agents.length > 0) {
            const agent = agents[0];
            setMetrics({
              uptime: agent.uptime || 0,
              totalJobs: agent.totalJobs || 0,
              completedJobs: agent.completedJobs || 0,
              failedJobs: agent.failedJobs || 0,
              avgResponseTime: agent.avgResponseTime || 0,
              lastJobTime: agent.lastJobTime || 0,
            });
          }
        }
      } catch (e) {
        setHealth({ status: "offline", lastCheck: Date.now() });
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

  const addLog = (level: "info" | "warn" | "error", message: string) => {
    setLogs((prev) => [
      ...prev.slice(-100), // Keep last 100 logs
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        timestamp: new Date().toISOString(), // Use ISO format for consistency
        level,
        message,
      },
    ]);
  };

  const abortCurrentJob = async () => {
    const processingJob = jobs.find((j) => j.status === "processing");
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
      setJobs((prev) =>
        prev.map((j) =>
          j.id === processingJob.id
            ? { ...j, status: "failed", result: "Aborted by operator" }
            : j,
        ),
      );
    } catch (e) {
      addLog("error", "Failed to abort job");
    }
  };

  const retryLastJob = async () => {
    const lastCompleted = [...jobs]
      .reverse()
      .find((j) => j.status === "completed");
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
      jobs: jobs.slice(0, 10).map((j) => ({
        id: j.id,
        prompt: j.prompt,
        result: j.result,
        status: j.status,
        timestamp: j.timestamp,
        manual: j.manual,
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

  const updateJob = (id: string, status: Job["status"], data: any) => {
    setJobs((prev) => {
      const existing = prev.find((j) => j.id === id);
      let updated;
      
      // Add completedAt when job finishes
      const jobData = {
        ...data,
        ...(status === "completed" || status === "failed" ? { completedAt: Date.now() } : {}),
      };
      
      if (existing) {
        updated = prev.map((j) =>
          j.id === id ? { ...j, status, ...jobData } : j,
        );
      } else {
        updated = [
          { id, type: "unknown", status, timestamp: Date.now(), ...jobData },
          ...prev,
        ];
      }

      // Update metrics
      const completed = updated.filter((j) => j.status === "completed").length;
      const failed = updated.filter((j) => j.status === "failed").length;
      setMetrics((prev) => ({
        uptime: Date.now() - (prev.uptime || Date.now()),
        totalJobs: updated.length,
        completedJobs: completed,
        failedJobs: failed,
        avgResponseTime: 150, // Placeholder - would need timing data
        lastJobTime:
          status === "completed" || status === "failed"
            ? Date.now()
            : prev.lastJobTime,
      }));

      return updated;
    });
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
          value={formatUptime(Date.now() - metrics.uptime)}
          icon={Activity}
          color="cyan"
          suppressHydrationWarning
        />
        <MetricCard
          label="Total Jobs"
          value={metrics.totalJobs.toString()}
          icon={Zap}
          color="magenta"
        />
        <MetricCard
          label="Completed"
          value={metrics.completedJobs.toString()}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          label="Failed"
          value={metrics.failedJobs.toString()}
          icon={AlertTriangle}
          color="red"
        />
        <MetricCard
          label="Success Rate"
          value={
            metrics.totalJobs > 0
              ? `${Math.round((metrics.completedJobs / metrics.totalJobs) * 100)}%`
              : "0%"
          }
          icon={Activity}
          color="cyan"
        />
      </section>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
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
                  (j) => j.status === "processing" || j.status === "received",
                ).length === 0 && (
                  <div className="text-center text-gray-500 py-10 italic">
                    No active operations. Waiting for command...
                  </div>
                )}
                {jobs
                  .filter(
                    (j) => j.status === "processing" || j.status === "received",
                  )
                  .map((job) => (
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
                  (j) => j.status === "completed" || j.status === "failed",
                )
                .slice(0, 5)
                .map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onClick={() => setSelectedJob(job)}
                  />
                ))}
              {jobs.filter(
                (j) => j.status === "completed" || j.status === "failed",
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
            {logs.map((log) => (
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

function StatusBadge({
  label,
  status,
  icon: Icon,
}: {
  label: string;
  status: "active" | "warn" | "error";
  icon: any;
}) {
  const colors = {
    active: "text-green-400 border-green-400 bg-green-400/10",
    warn: "text-yellow-500 border-yellow-500 bg-yellow-500/10",
    error: "text-red-500 border-red-500 bg-red-500/10",
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 border rounded-full text-xs font-bold tracking-wider ${colors[status]}`}
    >
      <Icon className="w-3 h-3" />
      {label}
      <span
        className={`w-2 h-2 rounded-full ${status === "active" ? "bg-green-400 animate-pulse" : status === "warn" ? "bg-yellow-500" : "bg-red-500"}`}
      ></span>
    </div>
  );
}

function JobCard({
  job,
  active = false,
  onClick,
}: {
  job: Job;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={onClick}
      className={`p-4 rounded border-l-4 ${
        job.status === "processing"
          ? "border-blue-400 bg-blue-400/5"
          : job.status === "completed"
            ? "border-green-400 bg-green-400/5"
            : job.status === "failed"
              ? "border-red-500 bg-red-500/5"
              : "border-gray-500 bg-gray-500/5 cursor-pointer"
      } relative overflow-hidden group hover:bg-white/5 transition-colors`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-2">
          {job.status === "processing" && (
            <Loader className="w-3 h-3 animate-spin" />
          )}
          ID: {job.id.slice(0, 8)}...
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${
            job.status === "processing"
              ? "text-blue-400 bg-blue-400/20"
              : job.status === "completed"
                ? "text-green-400 bg-green-400/20"
                : job.status === "failed"
                  ? "text-red-500 bg-red-500/20"
                  : "text-gray-400 bg-gray-500/20"
          }`}
        >
          {job.status}
        </span>
      </div>

      {job.prompt && (
        <div className="mb-2 text-sm text-gray-300 line-clamp-2">
          <span className="text-purple-500 font-bold mr-2">&gt;</span>
          {job.prompt}
        </div>
      )}

      {job.result && (
        <div className="text-xs text-gray-400 font-mono bg-black/30 p-2 rounded border border-white/5 mt-2">
          <span className="text-green-400 mr-2">$</span>
          {job.manual || active
            ? typeof job.result === "string"
              ? job.result.slice(0, 80) + (job.result.length > 80 ? "..." : "")
              : JSON.stringify(job.result).slice(0, 80)
            : "[Click to view output]"}
        </div>
      )}

      {active && (
        <div className="absolute bottom-0 left-0 h-0.5 bg-blue-400 animate-progress w-full"></div>
      )}
    </motion.div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  suppressHydrationWarning,
}: {
  label: string;
  value: string;
  icon: any;
  color: "cyan" | "magenta" | "green" | "red";
  suppressHydrationWarning?: boolean;
}) {
  const colors = {
    cyan: "from-blue-400 to-blue-400/50 border-blue-400/30",
    magenta: "from-purple-500 to-purple-500/50 border-purple-500/30",
    green: "from-green-400 to-green-400/50 border-green-400/30",
    red: "from-red-500 to-red-500/50 border-red-500/30",
  };

  return (
    <div
      className={`bg-gradient-to-br ${colors[color]} border rounded-lg p-4 relative overflow-hidden group hover:scale-105 transition-transform`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider opacity-70">
          {label}
        </span>
        <Icon className="w-4 h-4 opacity-50" />
      </div>
      <div
        className="text-2xl font-bold"
        style={{ fontFamily: "var(--font-orbitron)" }}
        suppressHydrationWarning={suppressHydrationWarning}
      >
        {value}
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
}

function JobDetailModal({
  job,
  isOpen,
  onClose,
}: {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!job || !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-950 border border-blue-400/30 rounded-lg p-4 md:p-6 max-w-6xl w-full max-h-[85vh] overflow-y-auto box-glow-cyan"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-blue-400 mb-2" style={{ fontFamily: "'Fira Code', monospace" }}>
                  JOB DETAILS
                </h2>
                <p className="text-xs md:text-sm text-slate-400">ID: {job.id}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Status Badge & Retry Count */}
            <div className="mb-6 flex items-center gap-3 flex-wrap">
              <span
                className={`text-sm px-3 py-1 rounded-full uppercase font-bold inline-block border ${
                  job.status === "processing"
                    ? "text-blue-400 bg-blue-400/20 border-blue-400/50"
                    : job.status === "completed"
                      ? "text-green-400 bg-green-400/20 border-green-400/50"
                      : job.status === "failed"
                        ? "text-red-500 bg-red-500/20 border-red-500/50"
                        : "text-slate-400 bg-slate-400/20 border-slate-400/50"
                }`}
              >
                {job.status}
              </span>
              {job.retryCount !== undefined && job.retryCount > 0 && (
                <span className="text-xs px-2 py-1 rounded bg-orange-500/20 border border-orange-500/50 text-orange-400 font-bold">
                  Retries: {job.retryCount}
                </span>
              )}
              {job.type && (
                <span className="text-xs px-2 py-1 rounded bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 font-mono">
                  {job.type}
                </span>
              )}
            </div>

            {/* Content Sections */}
            <div className="space-y-6">
              {/* Prompt */}
              {job.prompt && (
                <div>
                  <h3 className="text-xs md:text-sm uppercase tracking-wider text-purple-400 mb-2 font-bold">
                    Prompt
                  </h3>
                  <div className="bg-slate-900/50 border border-purple-400/20 rounded p-3 md:p-4 text-xs md:text-sm text-slate-300 font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                    {job.prompt}
                  </div>
                </div>
              )}

              {/* Result */}
              {job.result && (
                <div>
                  <h3 className="text-xs md:text-sm uppercase tracking-wider text-green-400 mb-2 font-bold">
                    Result
                  </h3>
                  <div className="bg-slate-900/50 border border-green-400/20 rounded p-3 md:p-4 text-xs md:text-sm text-slate-300 font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                    {typeof job.result === "string" ? job.result : JSON.stringify(job.result, null, 2)}
                  </div>
                </div>
              )}
              {/* Output - from backend output field */}
              {job.output && (
                <div>
                  <h3 className="text-xs md:text-sm uppercase tracking-wider text-cyan-400 mb-2 font-bold">
                    Output
                  </h3>
                  <div className="bg-slate-900/50 border border-cyan-400/20 rounded p-3 md:p-4 text-xs md:text-sm text-slate-300 font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                    {typeof job.output === "string" ? job.output : JSON.stringify(job.output, null, 2)}
                  </div>
                </div>
              )}

              {/* Error */}
              {job.error && (
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-red-500 mb-2 font-bold">
                    Error
                  </h3>
                  <div className="bg-red-500/5 border border-red-500/20 rounded p-4 text-sm text-red-300 font-mono whitespace-pre-wrap break-words">
                    {job.error}
                  </div>
                </div>
              )}

              {/* Detailed Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
                    Created
                  </p>
                  <p className="text-xs md:text-sm text-slate-300">
                    {new Date(job.timestamp || 0).toLocaleString()}
                  </p>
                </div>
                {job.completedAt && (
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
                        Completed
                      </p>
                      <p className="text-xs md:text-sm text-slate-300">
                        {new Date(job.completedAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
                        Duration
                      </p>
                      <p className="text-xs md:text-sm text-slate-300 font-mono">
                        {Math.round((job.completedAt - (job.timestamp || 0)) / 1000)}s
                      </p>
                    </div>
                  </>
                )}
                {job.budget && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
                      Budget
                    </p>
                    <p className="text-xs md:text-sm text-amber-400 font-mono">
                      ${job.budget}
                    </p>
                  </div>
                )}
              </div>

              {/* Skills Section */}
              {job.skills && job.skills.length > 0 && (
                <div className="pt-4 border-t border-slate-700">
                  <h3 className="text-xs md:text-sm uppercase tracking-wider text-teal-400 mb-3 font-bold">
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 rounded bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="mt-6 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-400/50 rounded py-2 px-3 md:px-4 font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
