import React, { useState, useEffect } from 'react';
import { useSSE } from './hooks/useSSE';
import { AgentHealth } from './components/AgentHealth';
import { Statistics } from './components/Statistics';
import { CurrentJob } from './components/CurrentJob';
import { EventLog } from './components/EventLog';
import { Controls } from './components/Controls';
import { AgentStats, CurrentJobState } from './types/events';
import { Activity } from 'lucide-react';

function App() {
  const { events, connected } = useSSE();
  
  const [stats, setStats] = useState<AgentStats>({
    totalJobs: 0,
    successCount: 0,
    failureCount: 0,
    totalEarnings: 0,
    averageTime: 0
  });
  
  const [currentJob, setCurrentJob] = useState<CurrentJobState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [pollInterval, setPollInterval] = useState(30000);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Process events
  useEffect(() => {
    if (events.length === 0) return;
    
    const latestEvent = events[0];
    setLastActivity(latestEvent.timestamp);
    
    switch (latestEvent.type) {
      case 'agent_started':
        setUptime(latestEvent.data.uptime);
        break;
      case 'polling':
        setPollInterval(latestEvent.data.interval);
        break;
      case 'job_found':
        setCurrentJob({
          id: latestEvent.data.id,
          prompt: latestEvent.data.prompt,
          budget: latestEvent.data.budget,
          stage: 'fetching',
          progress: 20,
          startTime: latestEvent.timestamp
        });
        break;
      case 'job_generating':
        setCurrentJob(prev => prev ? { ...prev, stage: 'generating', progress: 40 } : null);
        break;
      case 'job_building':
        setCurrentJob(prev => prev ? { ...prev, stage: 'building', progress: 40 + (latestEvent.data.progress * 0.4) } : null);
        break;
      case 'job_submitting':
        setCurrentJob(prev => prev ? { ...prev, stage: 'submitting', progress: 90 } : null);
        break;
      case 'job_success':
        setCurrentJob(prev => prev ? { ...prev, stage: 'complete', progress: 100 } : null);
        setStats(s => ({
          ...s,
          totalJobs: s.totalJobs + 1,
          successCount: s.successCount + 1,
          totalEarnings: s.totalEarnings + (currentJob?.budget || 0),
          averageTime: ((s.averageTime * s.successCount) + latestEvent.data.duration) / (s.successCount + 1)
        }));
        setTimeout(() => setCurrentJob(null), 5000);
        break;
      case 'job_failed':
        setCurrentJob(prev => prev ? { ...prev, stage: 'failed', progress: 100 } : null);
        setStats(s => ({
          ...s,
          totalJobs: s.totalJobs + 1,
          failureCount: s.failureCount + 1
        }));
        setTimeout(() => setCurrentJob(null), 5000);
        break;
    }
  }, [events]);

  // Uptime counter
  useEffect(() => {
    if (!connected || isPaused) return;
    const interval = setInterval(() => setUptime(u => u + 1), 1000);
    return () => clearInterval(interval);
  }, [connected, isPaused]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Seedstr Monitor</h1>
              <p className="text-sm text-gray-400">Autonomous Agent Telemetry</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full border border-gray-700">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-medium text-gray-300">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-1">
            <AgentHealth 
              status={!connected ? 'Error' : isPaused ? 'Paused' : 'Running'}
              uptime={uptime}
              pollInterval={pollInterval}
              lastActivity={lastActivity}
            />
            <Controls 
              isPaused={isPaused}
              onTogglePause={() => setIsPaused(!isPaused)}
              onStop={() => { setIsPaused(true); setCurrentJob(null); }}
              onRefresh={() => window.location.reload()}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:col-span-2">
            <Statistics stats={stats} />
            <CurrentJob job={currentJob} />
            <EventLog events={events} />
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default App;