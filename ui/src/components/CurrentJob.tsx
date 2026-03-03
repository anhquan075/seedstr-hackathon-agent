import React, { useEffect, useState } from 'react';
import { CurrentJobState } from '../types/events';
import { formatCurrency, formatDuration } from '../utils/formatters';
import { Search, Cpu, Wrench, UploadCloud, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface CurrentJobProps {
  job: CurrentJobState | null;
}

const STAGES = ['fetching', 'generating', 'building', 'submitting', 'complete'];

export function CurrentJob({ job }: CurrentJobProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!job || job.stage === 'complete' || job.stage === 'failed') return;
    
    const interval = setInterval(() => {
      setElapsed(Date.now() - job.startTime);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [job]);

  if (!job) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg flex flex-col items-center justify-center h-48 text-gray-400">
        <Search className="w-8 h-8 mb-2 opacity-50" />
        <p>Waiting for next job...</p>
      </div>
    );
  }

  const currentStageIndex = STAGES.indexOf(job.stage);
  const isFailed = job.stage === 'failed';

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
            Current Job
            <span className="text-xs font-mono bg-gray-700 px-2 py-1 rounded text-gray-300">
              {job.id.substring(0, 8)}
            </span>
          </h2>
          <p className="text-gray-400 mt-1 max-w-2xl truncate">{job.prompt}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-400">{formatCurrency(job.budget)}</div>
          <div className="text-sm text-gray-400 flex items-center justify-end gap-1 mt-1">
            <Clock className="w-3 h-3" />
            {formatDuration(job.stage === 'complete' || job.stage === 'failed' ? job.progress : elapsed)}
          </div>
        </div>
      </div>

      <div className="relative pt-8 pb-4">
        {/* Progress Line */}
        <div className="absolute top-12 left-0 w-full h-1 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${isFailed ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ 
              width: isFailed ? '100%' : `${Math.max(5, (currentStageIndex / (STAGES.length - 1)) * 100)}%` 
            }}
          />
        </div>

        {/* Stages */}
        <div className="relative flex justify-between">
          {[
            { id: 'fetching', icon: Search, label: 'Fetching' },
            { id: 'generating', icon: Cpu, label: 'Generating' },
            { id: 'building', icon: Wrench, label: 'Building' },
            { id: 'submitting', icon: UploadCloud, label: 'Submitting' },
            { id: 'complete', icon: CheckCircle2, label: 'Complete' }
          ].map((stage, index) => {
            const Icon = isFailed && index === currentStageIndex ? XCircle : stage.icon;
            const isActive = index === currentStageIndex;
            const isPast = index < currentStageIndex || (job.stage === 'complete' && index === STAGES.length - 1);
            
            let colorClass = 'text-gray-500 bg-gray-800 border-gray-600';
            if (isFailed && isActive) {
              colorClass = 'text-red-400 bg-red-900/30 border-red-500';
            } else if (isActive) {
              colorClass = 'text-blue-400 bg-blue-900/30 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
            } else if (isPast) {
              colorClass = 'text-green-400 bg-gray-800 border-green-500';
            }

            return (
              <div key={stage.id} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 transition-colors duration-300 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs mt-2 font-medium ${isActive ? 'text-gray-200' : 'text-gray-500'}`}>
                  {stage.label}
                </span>
                {isActive && job.stage === 'building' && (
                  <span className="text-xs text-blue-400 mt-1">{job.progress}%</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}