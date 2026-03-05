import { useEffect, useState } from 'react';

export type MetricKey = 'uptime' | 'totalJobs' | 'completedJobs' | 'failedJobs' | 'successRate' | 'avgResponseTime';

interface MetricDataResult {
  value: string;
  isLoading: boolean;
  error: string | null;
}

const getApiUrl = (): string => {
  if (typeof window === 'undefined') return 'http://localhost:8080';
  
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal
    ? 'http://localhost:8080'
    : import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.host}`;
};

const formatUptime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

export function useMetricData(metricKey: MetricKey): MetricDataResult {
  const [value, setValue] = useState<string>('--');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetric = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/agents`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }

        const { agents } = await response.json();
        
        if (!agents || agents.length === 0) {
          throw new Error('No agents available');
        }

        const agent = agents[0];
        let metricValue: string = '--';

        switch (metricKey) {
          case 'uptime':
            metricValue = formatUptime(agent.uptime || 0);
            break;
          case 'totalJobs':
            metricValue = (agent.totalJobs || 0).toString();
            break;
          case 'completedJobs':
            metricValue = (agent.completedJobs || 0).toString();
            break;
          case 'failedJobs':
            metricValue = (agent.failedJobs || 0).toString();
            break;
          case 'successRate':
            const total = agent.totalJobs || 0;
            const completed = agent.completedJobs || 0;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
            metricValue = `${rate}%`;
            break;
          case 'avgResponseTime':
            metricValue = `${(agent.avgResponseTime || 0).toFixed(2)}ms`;
            break;
          default:
            metricValue = '--';
        }

        setValue(metricValue);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setValue('--');
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchMetric();

    // Set up polling interval (5 seconds)
    const interval = setInterval(fetchMetric, 5000);
    
    return () => clearInterval(interval);
  }, [metricKey]);

  return { value, isLoading, error };
}
