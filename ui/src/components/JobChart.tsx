import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AgentEvent } from '../types/events';


interface JobChartProps {
  events: AgentEvent[];
}

export function JobChart({ events }: JobChartProps) {
  const chartData = useMemo(() => {
    // Group jobs by minute for the last 30 minutes
    const now = Date.now();
    const thirtyMinsAgo = now - 30 * 60 * 1000;
    
    const successEvents = events.filter(e => e.type === 'job_success' && e.timestamp > thirtyMinsAgo);
    const failedEvents = events.filter(e => e.type === 'job_failed' && e.timestamp > thirtyMinsAgo);
    
    // Create buckets for each minute
    const buckets = new Map<string, { time: string; success: number; failed: number; timestamp: number }>();
    
    for (let i = 0; i < 30; i++) {
      const t = now - i * 60 * 1000;
      const date = new Date(t);
      const key = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      buckets.set(key, { time: key, success: 0, failed: 0, timestamp: t });
    }
    
    successEvents.forEach(e => {
      const date = new Date(e.timestamp);
      const key = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      if (buckets.has(key)) {
        buckets.get(key)!.success += 1;
      }
    });
    
    failedEvents.forEach(e => {
      const date = new Date(e.timestamp);
      const key = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      if (buckets.has(key)) {
        buckets.get(key)!.failed += 1;
      }
    });
    
    return Array.from(buckets.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [events]);

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-lg h-[300px] flex flex-col">
      <h2 className="text-lg font-heading font-semibold text-text mb-4">Activity (Last 30m)</h2>
      <div className="flex-1 w-full h-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#94A3B8" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis 
              stroke="#94A3B8" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '8px' }}
              itemStyle={{ color: '#F8FAFC' }}
            />
            <Line 
              type="monotone" 
              dataKey="success" 
              stroke="#10B981" 
              strokeWidth={2} 
              dot={false} 
              activeDot={{ r: 4, fill: '#10B981', stroke: '#020617', strokeWidth: 2 }}
              name="Successful"
            />
            <Line 
              type="monotone" 
              dataKey="failed" 
              stroke="#EF4444" 
              strokeWidth={2} 
              dot={false} 
              activeDot={{ r: 4, fill: '#EF4444', stroke: '#020617', strokeWidth: 2 }}
              name="Failed"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}