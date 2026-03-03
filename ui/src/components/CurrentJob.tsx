import { motion } from 'framer-motion';
import { Code2, Cpu, Globe, Loader2, Send, CheckCircle2, XCircle } from 'lucide-react';
import { JobState } from '../types/events';
import { formatCurrency } from '../utils/formatters';

interface CurrentJobProps {
  job: JobState | null;
}

const STAGES = [
  { id: 'fetching', label: 'Fetching', icon: Globe },
  { id: 'generating', label: 'Generating', icon: Cpu },
  { id: 'building', label: 'Building', icon: Code2 },
  { id: 'submitting', label: 'Submitting', icon: Send },
  { id: 'complete', label: 'Complete', icon: CheckCircle2 },
];

export function CurrentJob({ job }: CurrentJobProps) {
  if (!job) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 shadow-lg flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="w-16 h-16 rounded-full bg-background border border-border flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-muted animate-spin" />
        </div>
        <h3 className="text-xl font-heading font-semibold text-text mb-2">Waiting for Jobs</h3>
        <p className="text-muted max-w-md">
          The agent is currently polling the network for new opportunities. 
          New jobs will appear here automatically.
        </p>
      </div>
    );
  }

  const currentStageIndex = STAGES.findIndex(s => s.id === job.stage);
  const isFailed = job.stage === 'failed';

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-heading font-semibold text-text flex items-center gap-2">
            Active Job
            <span className="text-xs font-mono bg-background px-2 py-1 rounded text-muted border border-border">
              {job.id.substring(0, 8)}
            </span>
          </h2>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-success">
            {formatCurrency(job.budget)}
          </div>
          <div className="text-sm text-muted">Budget</div>
        </div>
      </div>

      <div className="bg-background rounded-lg p-4 border border-border/50 mb-8">
        <p className="text-text/90 text-sm leading-relaxed line-clamp-2 italic">
          "{job.prompt}"
        </p>
      </div>

      <div className="relative">
        {/* Progress Bar Background */}
        <div className="absolute top-5 left-0 w-full h-1 bg-background rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${isFailed ? 'bg-error' : 'bg-primary'}`}
            initial={{ width: 0 }}
            animate={{ width: `${job.progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Stages */}
        <div className="relative flex justify-between">
          {STAGES.map((stage, index) => {
            const isPast = index < currentStageIndex || job.stage === 'complete';
            const isCurrent = index === currentStageIndex && !isFailed;
            const Icon = isFailed && index === currentStageIndex ? XCircle : stage.icon;

            return (
              <div key={stage.id} className="flex flex-col items-center gap-2 z-10">
                <motion.div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                    isFailed && index === currentStageIndex
                      ? 'bg-error/20 border-error text-error'
                      : isPast
                      ? 'bg-primary border-primary text-white'
                      : isCurrent
                      ? 'bg-surface border-primary text-primary shadow-[0_0_15px_rgba(15,118,110,0.5)]'
                      : 'bg-background border-border text-muted'
                  }`}
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Icon className="w-5 h-5" />
                </motion.div>
                <span className={`text-xs font-medium ${
                  isFailed && index === currentStageIndex
                    ? 'text-error'
                    : isCurrent || isPast 
                    ? 'text-text' 
                    : 'text-muted'
                }`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {job.error && (
        <div className="mt-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          <strong>Error:</strong> {job.error}
        </div>
      )}
    </div>
  );
}