interface MetricCardProps {
  label: string;
  value: string;
  icon: any;
  color: "cyan" | "magenta" | "green" | "red";
  suppressHydrationWarning?: boolean;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  suppressHydrationWarning,
}: MetricCardProps) {
  const colors = {
    cyan: "from-blue-400 to-blue-400/50 border-blue-400/30",
    magenta: "from-purple-500 to-purple-500/50 border-purple-500/30",
    green: "from-green-400 to-green-400/50 border-green-400/30",
    red: "from-red-500 to-red-500/50 border-red-500/30",
  };

  return (
    <div
      className={`bg-gradient-to-br ${colors[color]} border rounded-lg p-4 relative overflow-hidden group hover:scale-105 transition-transform`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider opacity-70">
          {label}
        </span>
        <Icon className="w-4 h-4 opacity-50" />
      </div>
      <div
        className="text-2xl font-bold"
        style={{ fontFamily: "var(--font-orbitron)" }}
        suppressHydrationWarning={suppressHydrationWarning}
      >
        {value}
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
}
