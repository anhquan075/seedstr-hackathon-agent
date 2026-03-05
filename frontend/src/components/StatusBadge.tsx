import { Activity, Wifi, Zap, CheckCircle, AlertTriangle } from "lucide-react";

interface StatusBadgeProps {
  label: string;
  status: "active" | "warn" | "error";
  icon: any;
}

export function StatusBadge({
  label,
  status,
  icon: Icon,
}: StatusBadgeProps) {
  const colors = {
    active: "text-green-400 border-green-400 bg-green-400/10",
    warn: "text-yellow-500 border-yellow-500 bg-yellow-500/10",
    error: "text-red-500 border-red-500 bg-red-500/10",
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 border rounded-full text-xs font-bold tracking-wider ${colors[status]}`}
    >
      <Icon className="w-3 h-3" />
      {label}
      <span
        className={`w-2 h-2 rounded-full ${status === "active" ? "bg-green-400 animate-pulse" : status === "warn" ? "bg-yellow-500" : "bg-red-500"}`}
      ></span>
    </div>
  );
}
