import { Loader } from "lucide-react";
import { MetricKey, useMetricData } from "../hooks/useMetricData";

interface MetricCardProps {
 label: string;
 value?: string;
 metricKey?: MetricKey;
 icon: any;
 color: "cyan" | "magenta" | "green" | "red";
 suppressHydrationWarning?: boolean;
}

export function MetricCard({
 label,
 value: staticValue,
 metricKey,
 icon: Icon,
 color,
 suppressHydrationWarning,
}: MetricCardProps) {
 const { value: liveValue, isLoading } = useMetricData(
  metricKey || "totalJobs",
 );

 // Use live data if metricKey is provided, otherwise use static value
 const displayValue = metricKey ? liveValue : staticValue;
 const isMetricLoading = metricKey ? isLoading : false;

 const colors = {
  cyan: "border-cyan-500/30 text-cyan-400",
  magenta: "border-magenta-500/30 text-magenta-400",
  green: "border-green-500/30 text-green-400",
  red: "border-red-500/30 text-red-400",
 };

 return (
  <div
   className={`bg-slate-900/40 border ${colors[color].split(' ')[0]} rounded cyber-border p-4 relative overflow-hidden group transition-all box-glow-fire hover:bg-slate-900/60`}
  >
   <div className="flex items-center justify-between mb-2 relative z-10">
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-400 transition-colors">
     {label}
    </span>
    {isMetricLoading ? (
     <Loader className="w-3.5 h-3.5 opacity-50 animate-spin text-orange-500" />
    ) : (
     <Icon className={`w-3.5 h-3.5 opacity-50 ${colors[color].split(' ')[1]}`} />
    )}
   </div>
   <div
    className={`text-xl font-black tracking-tighter relative z-10 ${colors[color].split(' ')[1]}`}
    suppressHydrationWarning={suppressHydrationWarning}
   >
    {displayValue}
   </div>
   <div className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-white/5 to-transparent pointer-events-none"></div>
  </div>
 );
}
