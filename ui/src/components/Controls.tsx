import { Play, Pause, Square, RefreshCw, Settings } from 'lucide-react';
import { AgentStats } from '../types/events';

interface ControlsProps {
  stats: AgentStats;
  onTogglePause: () => void;
  onStop: () => void;
  onRefresh: () => void;
}

export function Controls({ stats, onTogglePause, onStop, onRefresh }: ControlsProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold text-text flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Command Center
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onTogglePause}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all cursor-pointer ${
            stats.isPaused
              ? 'bg-success/20 text-success hover:bg-success/30 border border-success/30'
              : 'bg-warning/20 text-warning hover:bg-warning/30 border border-warning/30'
          }`}
        >
          {stats.isPaused ? (
            <>
              <Play className="w-5 h-5" />
              Resume Polling
            </>
          ) : (
            <>
              <Pause className="w-5 h-5" />
              Pause Polling
            </>
          )}
        </button>

        <button
          onClick={onStop}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium bg-error/10 text-error hover:bg-error/20 border border-error/30 transition-all cursor-pointer"
        >
          <Square className="w-5 h-5" />
          Emergency Stop
        </button>

        <button
          onClick={onRefresh}
          className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium bg-background text-text hover:bg-surface border border-border transition-all cursor-pointer"
        >
          <RefreshCw className="w-5 h-5" />
          Reconnect SSE
        </button>
      </div>
    </div>
  );
}