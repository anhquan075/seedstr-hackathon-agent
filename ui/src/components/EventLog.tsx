import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Filter, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { AgentEvent } from '../types/events';
import { formatTimestamp } from '../utils/formatters';

interface EventLogProps {
  events: AgentEvent[];
  onClear: () => void;
}

export function EventLog({ events, onClear }: EventLogProps) {
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    if (filter === 'success') return events.filter(e => e.type === 'job_success');
    if (filter === 'error') return events.filter(e => e.type === 'job_failed' || e.type === 'error');
    if (filter === 'info') return events.filter(e => !['job_success', 'job_failed', 'error'].includes(e.type));
    return events;
  }, [events, filter]);

  const getEventColor = (type: string) => {
    if (type === 'job_success') return 'text-success border-success/20 bg-success/5';
    if (type === 'job_failed' || type === 'error') return 'text-error border-error/20 bg-error/5';
    if (type === 'job_found') return 'text-secondary border-secondary/20 bg-secondary/5';
    return 'text-primary border-primary/20 bg-primary/5';
  };

  const getEventIcon = (type: string) => {
    if (type === 'job_success') return '✓';
    if (type === 'job_failed' || type === 'error') return '✗';
    if (type === 'job_found') return '★';
    return 'ℹ';
  };

  return (
    <div className="bg-surface border border-border rounded-xl shadow-lg flex flex-col h-[500px]">
      <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50 rounded-t-xl">
        <h2 className="text-lg font-heading font-semibold text-text flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          Neural Log
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-background rounded-lg p-1 border border-border">
            <Filter className="w-4 h-4 text-muted ml-2" />
            <select 
              className="bg-transparent text-sm text-text outline-none border-none focus:ring-0 cursor-pointer py-1 pr-2"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all" className="bg-surface">All Events</option>
              <option value="info" className="bg-surface">Info</option>
              <option value="success" className="bg-surface">Success</option>
              <option value="error" className="bg-surface">Errors</option>
            </select>
          </div>
          <button 
            onClick={onClear}
            className="p-2 text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
            title="Clear Log"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        <AnimatePresence initial={false}>
          {filteredEvents.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted py-8"
            >
              No events found
            </motion.div>
          ) : (
            filteredEvents.map((event, index) => {
              const eventId = `${event.timestamp}-${index}`;
              const isExpanded = expandedId === eventId;
              const colorClass = getEventColor(event.type);

              return (
                <motion.div
                  key={eventId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`border rounded-lg overflow-hidden ${colorClass}`}
                >
                  <div 
                    className="p-3 flex items-start gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : eventId)}
                  >
                    <div className="font-mono text-xs opacity-70 mt-0.5 whitespace-nowrap">
                      [{formatTimestamp(event.timestamp)}]
                    </div>
                    <div className="font-mono text-sm font-bold w-4 text-center">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm capitalize">
                        {event.type.replace('_', ' ')}
                      </div>
                      {event.type === 'job_found' && 'data' in event && (
                        <div className="text-xs opacity-80 mt-1 truncate max-w-md">
                          {event.data.prompt}
                        </div>
                      )}
                    </div>
                    <div className="text-muted">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-current/10 bg-black/20"
                      >
                        <pre className="p-3 text-xs font-mono overflow-x-auto text-text/80">
                          {JSON.stringify(event.data, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}