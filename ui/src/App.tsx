import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { useSSE } from './hooks/useSSE';
import { AgentHealth } from './components/AgentHealth';
import { Statistics } from './components/Statistics';
import { CurrentJob } from './components/CurrentJob';
import { EventLog } from './components/EventLog';
import { Controls } from './components/Controls';
import { JobChart } from './components/JobChart';
import { AgentStats, JobState } from './types/events';

// Use environment variable or fallback to local mock server
const SSE_ENDPOINT = import.meta.env.VITE_SSE_ENDPOINT || '/api/sse';

function App() {
  const { events, status, error, clearEvents, reconnect } = useSSE(SSE_ENDPOINT);
  
  // Derived state
  const [stats, setStats] = useState<AgentStats>({
    totalJobs: 0,
    successfulJobs: 0,
    failedJobs: 0,
    totalEarnings: 0,
    averageCompletionTime: 0,
    uptime: 0,
    pollInterval: 30,
    isPaused: false,
  });

  const [currentJob, setCurrentJob] = useState<JobState | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(0);

  // Process events to update state
  useEffect(() => {
    if (events.length === 0) return;

    const latestEvent = events[0];
    setLastActivity(latestEvent.timestamp);

    // Update stats based on event type
    switch (latestEvent.type) {
      case 'agent_started':
        setStats(s => ({ ...s, uptime: latestEvent.data.uptime }));
        break;
      case 'polling':
        setStats(s => ({ ...s, pollInterval: latestEvent.data.interval }));
        break;
      case 'job_found':
        setCurrentJob({
          id: latestEvent.data.id,
          prompt: latestEvent.data.prompt,
          budget: latestEvent.data.budget,
          skills: latestEvent.data.skills,
          stage: 'fetching',
          progress: 20,
          startTime: latestEvent.timestamp,
        });
        break;
      case 'job_generating':
        setCurrentJob(prev => prev?.id === latestEvent.data.id ? {
          ...prev,
          stage: 'generating',
          progress: 40,
          model: latestEvent.data.model,
        } : prev);
        break;
      case 'job_building':
        setCurrentJob(prev => prev?.id === latestEvent.data.id ? {
          ...prev,
          stage: 'building',
          progress: 40 + (latestEvent.data.progress * 0.4), // 40-80%
        } : prev);
        break;
      case 'job_submitting':
        setCurrentJob(prev => prev?.id === latestEvent.data.id ? {
          ...prev,
          stage: 'submitting',
          progress: 90,
        } : prev);
        break;
      case 'job_success':
        setCurrentJob(prev => prev?.id === latestEvent.data.id ? {
          ...prev,
          stage: 'complete',
          progress: 100,
        } : prev);
        
        setStats(s => {
          const newTotal = s.totalJobs + 1;
          const newSuccess = s.successfulJobs + 1;
          const newAvgTime = ((s.averageCompletionTime * s.totalJobs) + latestEvent.data.duration) / newTotal;
          
          // Find the job to add its budget
          const jobEvent = events.find(e => e.type === 'job_found' && e.data.id === latestEvent.data.id);
          const budget = jobEvent && jobEvent.type === 'job_found' ? jobEvent.data.budget : 0;
          
          return {
            ...s,
            totalJobs: newTotal,
            successfulJobs: newSuccess,
            averageCompletionTime: newAvgTime,
            totalEarnings: s.totalEarnings + budget,
          };
        });
        
        // Clear current job after 5 seconds
        setTimeout(() => {
          setCurrentJob(prev => prev?.id === latestEvent.data.id ? null : prev);
        }, 5000);
        break;
      case 'job_failed':
        setCurrentJob(prev => prev?.id === latestEvent.data.id ? {
          ...prev,
          stage: 'failed',
          progress: 100,
          error: latestEvent.data.error,
        } : prev);
        
        setStats(s => ({
          ...s,
          totalJobs: s.totalJobs + 1,
          failedJobs: s.failedJobs + 1,
        }));
        
        // Clear current job after 10 seconds
        setTimeout(() => {
          setCurrentJob(prev => prev?.id === latestEvent.data.id ? null : prev);
        }, 10000);
        break;
    }
  }, [events]);

  // Update uptime every second
  useEffect(() => {
    if (status !== 'connected' || stats.isPaused) return;
    
    const interval = setInterval(() => {
      setStats(s => ({ ...s, uptime: s.uptime + 1 }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [status, stats.isPaused]);

  const handleTogglePause = () => {
    setStats(s => ({ ...s, isPaused: !s.isPaused }));
    // In a real app, this would send an API request to pause the agent
  };

  const handleStop = () => {
    if (window.confirm('Are you sure you want to emergency stop the agent? This will cancel any active jobs.')) {
      setStats(s => ({ ...s, isPaused: true }));
      setCurrentJob(null);
      // In a real app, this would send an API request to stop the agent
    }
  };

  return (
    <div className="min-h-screen bg-background text-text p-4 md:p-8 font-sans selection:bg-primary selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Seedstr Agent Monitor
            </h1>
            <p className="text-muted mt-1">Real-time autonomous agent telemetry</p>
          </div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-error/10 text-error px-4 py-2 rounded-lg border border-error/20"
            >
              <ShieldAlert className="w-5 h-5" />
              <span className="text-sm font-medium">{error}</span>
            </motion.div>
          )}
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Health & Controls */}
          <div className="space-y-6 lg:col-span-1">
            <AgentHealth 
              status={status} 
              stats={stats} 
              lastActivity={lastActivity} 
            />
            <Controls 
              stats={stats}
              onTogglePause={handleTogglePause}
              onStop={handleStop}
              onRefresh={reconnect}
            />
            <JobChart events={events} />
          </div>

          {/* Middle/Right Column - Stats, Job, Logs */}
          <div className="space-y-6 lg:col-span-2">
            <Statistics stats={stats} />
            <CurrentJob job={currentJob} />
            <EventLog events={events} onClear={clearEvents} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;