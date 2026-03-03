import React from 'react';
import { Activity, Clock, RefreshCw } from 'lucide-react';
import { formatDuration, formatRelativeTime } from '../utils/formatters';

interface AgentHealthProps {
  status: 'Running' | 'Paused' | 'Error';
  uptime: number;
  pollInterval: number;
  lastActivity: number;
}

export function AgentHealth({ status, uptime, pollInterval, lastActivity }: AgentHealthProps) {
  const statusColor = 
    status === 'Running' ? 'text-green-400' : 
    status === 'Paused' ? 'text-yellow-400' : 'text-red-400';

  const statusIcon = 
    status === 'Running' ? '●' : 
    status === 'Paused' ? '⏸️' : '❌';

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-100">
        <Activity className="w-5 h-5 text-blue-400" />
        Agent Health
      </h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Status</div>
          <div className={`text-lg font-medium flex items-center gap-2 ${statusColor}`}>
            <span>{statusIcon}</span> {status}
          </div>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
            <Clock className="w-4 h-4" /> Uptime
          </div>
          <div className="text-lg font-medium text-gray-100">
            {formatDuration(uptime * 1000)}
          </div>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> Poll Interval
          </div>
          <div className="text-lg font-medium text-gray-100">
            {pollInterval / 1000}s
          </div>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Last Activity</div>
          <div className="text-lg font-medium text-gray-100">
            {lastActivity > 0 ? formatRelativeTime(lastActivity) : 'Never'}
          </div>
        </div>
      </div>
    </div>
  );
}