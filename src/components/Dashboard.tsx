"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Cpu, Terminal, Zap, Wifi, CheckCircle, Loader, AlertTriangle } from "lucide-react";

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
  timestamp: number;
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
  const [health, setHealth] = useState<AgentHealth>({ status: "offline", lastCheck: 0 });
  const [metrics, setMetrics] = useState<Metrics>({ uptime: 0, totalJobs: 0, completedJobs: 0, failedJobs: 0, avgResponseTime: 0, lastJobTime: 0 });
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const scrollRef = useRef<HTMLDivElement>(null);

  // SSE Connection
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      setConnectionStatus("connecting");
      eventSource = new EventSource("https://seedstr-hackathon-agent-production-ff74.up.railway.app/events");

      eventSource.onopen = () => {
        setConnectionStatus("connected");
        addLog("info", "Connected to Agent Event Stream");
      };

      eventSource.onerror = (err) => {
        setConnectionStatus("disconnected");
        addLog("error", "SSE Connection Error. Retrying...");
        eventSource?.close();
        setTimeout(connectSSE, 3000);
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
        } catch (e) { }
      });

      eventSource.addEventListener("job_processing", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          updateJob(data.id, "processing", data);
        } catch (e) { }
      });

      eventSource.addEventListener("job_completed", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          updateJob(data.id, "completed", data);
          addLog("info", `Job Completed: ${data.id}`);
        } catch (e) { }
      });
      
      eventSource.addEventListener("job_failed", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          updateJob(data.id, "failed", data);
          addLog("error", `Job Failed: ${data.id}`);
        } catch (e) { }
      });
    };

    connectSSE();

    return () => {
      eventSource?.close();
    };
  }, []);

  // Health Check Polling
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("https://seedstr-hackathon-agent-production-ff74.up.railway.app/health");
        if (res.ok) {
          const data = await res.json();
          setHealth({ status: "ok", lastCheck: Date.now(), details: data });
        } else {
          setHealth({ status: "error", lastCheck: Date.now() });
        }
      } catch (e) {
        setHealth({ status: "offline", lastCheck: Date.now() });
      }
    };

    const interval = setInterval(checkHealth, 5000);
    checkHealth();
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
      { id: Date.now().toString() + Math.random(), timestamp: new Date().toLocaleTimeString(), level, message },
    ]);
  };

  const updateJob = (id: string, status: Job["status"], data: any) => {
    setJobs((prev) => {
      const existing = prev.find((j) => j.id === id);
      let updated;
      if (existing) {
        updated = prev.map((j) => (j.id === id ? { ...j, status, ...data } : j));
      } else {
        updated = [{ id, type: "unknown", status, timestamp: Date.now(), ...data }, ...prev];
      }
      
      // Update metrics
      const completed = updated.filter(j => j.status === 'completed').length;
      const failed = updated.filter(j => j.status === 'failed').length;
      setMetrics(prev => ({
        uptime: Date.now() - (prev.uptime || Date.now()),
        totalJobs: updated.length,
        completedJobs: completed,
        failedJobs: failed,
        avgResponseTime: 150, // Placeholder - would need timing data
        lastJobTime: status === 'completed' || status === 'failed' ? Date.now() : prev.lastJobTime
      }));
      
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] font-mono p-4 md:p-8 overflow-hidden relative">
      {/* Background Effects */}
      <div className="scanlines absolute inset-0 pointer-events-none z-50 opacity-10"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f3ff] to-transparent opacity-50"></div>
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-[#00f3ff]/30 pb-4 relative">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Cpu className="w-10 h-10 text-[#00f3ff] animate-pulse" />
            <div className="absolute inset-0 bg-[#00f3ff] blur-lg opacity-40"></div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] to-[#bd00ff] uppercase" style={{ fontFamily: 'var(--font-orbitron)' }}>
              Nexus Log
            </h1>
            <p className="text-xs text-[#00f3ff]/70 tracking-widest uppercase">System Monitoring Interface v2.0</p>
          </div>
        </div>

        <div className="flex gap-4 mt-4 md:mt-0">
          <StatusBadge label="NET" status={connectionStatus === "connected" ? "active" : "error"} icon={Wifi} />
          <StatusBadge label="SYS" status={health.status === "ok" ? "active" : "error"} icon={Activity} />
          <StatusBadge label="AI" status={health.status === "ok" ? "active" : "warn"} icon={Zap} />
        </div>
      </header>

      {/* Production Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <MetricCard label="Uptime" value={formatUptime(Date.now() - metrics.uptime)} icon={Activity} color="cyan" />
        <MetricCard label="Total Jobs" value={metrics.totalJobs.toString()} icon={Zap} color="magenta" />
        <MetricCard label="Completed" value={metrics.completedJobs.toString()} icon={CheckCircle} color="green" />
        <MetricCard label="Failed" value={metrics.failedJobs.toString()} icon={AlertTriangle} color="red" />
        <MetricCard label="Success Rate" value={metrics.totalJobs > 0 ? `${Math.round((metrics.completedJobs / metrics.totalJobs) * 100)}%` : '0%'} icon={Activity} color="cyan" />
      </section>


      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
        {/* Left Column: Job Queue */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-hidden">
          {/* Active Jobs */}
          <section className="flex-1 bg-[#121212]/50 border border-[#00f3ff]/20 rounded-lg p-4 relative overflow-hidden backdrop-blur-sm box-glow-cyan">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#00f3ff]">
              <Loader className="w-5 h-5 animate-spin" /> ACTIVE OPERATIONS
            </h2>
            <div className="h-[calc(100%-3rem)] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              <AnimatePresence>
                {jobs.filter(j => j.status === 'processing' || j.status === 'received').length === 0 && (
                  <div className="text-center text-gray-500 py-10 italic">No active operations. Waiting for command...</div>
                )}
                {jobs.filter(j => j.status === 'processing' || j.status === 'received').map((job) => (
                  <JobCard key={job.id} job={job} active />
                ))}
              </AnimatePresence>
            </div>
          </section>

          {/* Completed Jobs */}
          <section className="flex-1 bg-[#121212]/30 border border-[#bd00ff]/20 rounded-lg p-4 relative overflow-hidden backdrop-blur-sm box-glow-magenta">
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#bd00ff]">
              <CheckCircle className="w-5 h-5" /> RECENTLY COMPLETED
            </h2>
            <div className="h-[calc(100%-3rem)] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
               {jobs.filter(j => j.status === 'completed' || j.status === 'failed').slice(0, 5).map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
                {jobs.filter(j => j.status === 'completed' || j.status === 'failed').length === 0 && (
                  <div className="text-center text-gray-500 py-10 italic">System idle. No recent history.</div>
                )}
            </div>
          </section>
        </div>

        {/* Right Column: Terminal Logs */}
        <div className="bg-[#050505] border border-[#00ff9f]/30 rounded-lg p-4 font-fira-code text-sm relative overflow-hidden flex flex-col h-full box-glow-green">
          <div className="absolute top-0 left-0 right-0 h-6 bg-[#00ff9f]/10 flex items-center px-2 gap-2 border-b border-[#00ff9f]/20">
            <Terminal className="w-3 h-3 text-[#00ff9f]" />
            <span className="text-xs text-[#00ff9f] uppercase tracking-wider">System Terminal</span>
          </div>
          <div className="mt-6 flex-1 overflow-y-auto space-y-1 p-2 custom-scrollbar" ref={scrollRef}>
            {logs.map((log) => (
              <motion.div 
                key={log.id} 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                className={`flex gap-2 ${log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-yellow-500' : 'text-[#00ff9f]'}`}
              >
                <span className="opacity-50">[{log.timestamp}]</span>
                <span className="uppercase font-bold text-xs w-12">{log.level}</span>
                <span>{log.message}</span>
              </motion.div>
            ))}
             <div className="animate-pulse text-[#00ff9f]">_</div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ label, status, icon: Icon }: { label: string, status: "active" | "warn" | "error", icon: any }) {
  const colors = {
    active: "text-[#00ff9f] border-[#00ff9f] bg-[#00ff9f]/10",
    warn: "text-yellow-500 border-yellow-500 bg-yellow-500/10",
    error: "text-red-500 border-red-500 bg-red-500/10"
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1 border rounded-full text-xs font-bold tracking-wider ${colors[status]}`}>
      <Icon className="w-3 h-3" />
      {label}
      <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-[#00ff9f] animate-pulse' : status === 'warn' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
    </div>
  );
}

function JobCard({ job, active = false }: { job: Job, active?: boolean }) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`p-4 rounded border-l-4 ${
        job.status === 'processing' ? 'border-[#00f3ff] bg-[#00f3ff]/5' : 
        job.status === 'completed' ? 'border-[#00ff9f] bg-[#00ff9f]/5' : 
        job.status === 'failed' ? 'border-red-500 bg-red-500/5' : 
        'border-gray-500 bg-gray-500/5'
      } relative overflow-hidden group hover:bg-white/5 transition-colors`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-2">
           {job.status === 'processing' && <Loader className="w-3 h-3 animate-spin" />}
           ID: {job.id.slice(0, 8)}...
        </span>
        <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${
          job.status === 'processing' ? 'text-[#00f3ff] bg-[#00f3ff]/20' : 
          job.status === 'completed' ? 'text-[#00ff9f] bg-[#00ff9f]/20' : 
          job.status === 'failed' ? 'text-red-500 bg-red-500/20' : 
          'text-gray-400 bg-gray-500/20'
        }`}>
          {job.status}
        </span>
      </div>
      
      {job.prompt && (
        <div className="mb-2 text-sm text-gray-300 line-clamp-2">
          <span className="text-[#bd00ff] font-bold mr-2">&gt;</span>
          {job.prompt}
        </div>
      )}
      
      {job.result && (
        <div className="text-xs text-gray-400 font-mono bg-black/30 p-2 rounded border border-white/5 mt-2">
          <span className="text-[#00ff9f] mr-2">$</span>
          {typeof job.result === 'string' ? job.result.slice(0, 100) + (job.result.length > 100 ? '...' : '') : JSON.stringify(job.result)}
        </div>
      )}

      {active && (
         <div className="absolute bottom-0 left-0 h-0.5 bg-[#00f3ff] animate-progress w-full"></div>
      )}
    </motion.div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: 'cyan' | 'magenta' | 'green' | 'red' }) {
  const colors = {
    cyan: 'from-[#00f3ff] to-[#00f3ff]/50 border-[#00f3ff]/30',
    magenta: 'from-[#bd00ff] to-[#bd00ff]/50 border-[#bd00ff]/30',
    green: 'from-[#00ff9f] to-[#00ff9f]/50 border-[#00ff9f]/30',
    red: 'from-red-500 to-red-500/50 border-red-500/30'
  };
  
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-lg p-4 relative overflow-hidden group hover:scale-105 transition-transform`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider opacity-70">{label}</span>
        <Icon className="w-4 h-4 opacity-50" />
      </div>
      <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron)' }}>{value}</div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
}

function formatUptime(ms: number): string {
  if (ms <= 0) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
