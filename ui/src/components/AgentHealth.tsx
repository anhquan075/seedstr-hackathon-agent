import { Activity, Clock, Server, Zap } from 'lucide-react';
import { AgentStats, ConnectionStatus } from '../types/events';
import { formatUptime, formatTimeAgo } from '../utils/formatters';

interface AgentHealthProps {
  status: ConnectionStatus;
  stats: AgentStats;
  lastActivity: number;
}

export function AgentHealth({ status, stats, lastActivity }: AgentHealthProps) {
  const getStatusColor = () => {
    if (status === 'error' || status === 'disconnected') return 'bg-error';
    if (stats.isPaused) return 'bg-warning';
    return 'bg-success';
  };

  const getStatusText = () => {
    if (status === 'error') return 'Error';
    if (status === 'disconnected') return 'Disconnected';
    if (status === 'connecting') return 'Connecting...';
    if (stats.isPaused) return 'Paused';
    return 'Running';
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold text-text flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          Agent Health
        </h2>
        <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-full border border-border">
          <div className="relative flex h-3 w-3">
            {status === 'connected' && !stats.isPaused && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${getStatusColor()}`}></span>
          </div>
          <span className="text-sm font-medium text-text">{getStatusText()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-background p-4 rounded-lg border border-border/50">
          <div className="flex items-center gap-2 text-muted mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Uptime</span>
          </div>
          <div className="text-2xl font-semibold text-text">
            {formatUptime(stats.uptime)}
          </div>
        </div>

        <div className="bg-background p-4 rounded-lg border border-border/50">
          <div className="flex items-center gap-2 text-muted mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Poll Interval</span>
          </div>
          <div className="text-2xl font-semibold text-text">
            {stats.pollInterval}s
          </div>
        </div>

        <div className="col-span-2 bg-background p-4 rounded-lg border border-border/50">
          <div className="flex items-center gap-2 text-muted mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Last Activity</span>
          </div>
          <div className="text-lg font-medium text-text">
            {lastActivity > 0 ? formatTimeAgo(lastActivity) : 'Waiting for events...'}
          </div>
        </div>
      </div>
    </div>
  );
}