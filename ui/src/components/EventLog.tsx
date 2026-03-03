import React, { useState, useRef, useEffect } from 'react';
import { AgentEvent } from '../types/events';
import { formatTimestamp } from '../utils/formatters';
import { Terminal, Search, Filter } from 'lucide-react';

interface EventLogProps {
  events: AgentEvent[];
}

type FilterType = 'all' | 'info' | 'success' | 'error';

export function EventLog({ events }: EventLogProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const getEventColor = (type: string) => {
    if (type.includes('success')) return 'text-green-400';
    if (type.includes('error') || type.includes('failed')) return 'text-red-400';
    if (type.includes('generating') || type.includes('building')) return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getEventCategory = (type: string): FilterType => {
    if (type.includes('success')) return 'success';
    if (type.includes('error') || type.includes('failed')) return 'error';
    return 'info';
  };

  const filteredEvents = events.filter(event => {
    if (filter !== 'all' && getEventCategory(event.type) !== filter) return false;
    if (search && !JSON.stringify(event).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg flex flex-col h-[400px]">
      <div className="p-4 border-b border-gray-700 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-100">
          <Terminal className="w-5 h-5 text-blue-400" />
          Event Log
        </h2>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500 w-48"
            />
          </div>
          
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
            {(['all', 'info', 'success', 'error'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                  filter === f 
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
            />
            Auto-scroll
          </label>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2"
      >
        {filteredEvents.length === 0 ? (
          <div className="text-gray-500 text-center mt-8">No events found</div>
        ) : (
          filteredEvents.map((event, i) => (
            <div key={`${event.timestamp}-${i}`} className="flex items-start gap-3 hover:bg-gray-700/30 p-1 rounded">
              <span className="text-gray-500 shrink-0">
                [{formatTimestamp(event.timestamp)}]
              </span>
              <span className={`font-semibold shrink-0 ${getEventColor(event.type)}`}>
                {event.type.padEnd(15)}
              </span>
              <span className="text-gray-300 break-all">
                {JSON.stringify(event.data)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}