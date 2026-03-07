import { motion } from "framer-motion";
import { Loader } from "lucide-react";
import { Job } from "../store/jobStore"; // Use store export for now or types

interface JobCardProps {
  job: Job;
  active?: boolean;
  onClick?: () => void;
}

export default function JobCard({
  job,
  active = false,
  onClick,
}: JobCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={onClick}
      className={`p-4 rounded border-l-4 ${
        job.status === "processing"
          ? "border-blue-400 bg-blue-400/5"
          : job.status === "completed"
            ? "border-green-400 bg-green-400/5"
            : job.status === "failed"
              ? "border-red-500 bg-red-500/5"
              : "border-gray-500 bg-gray-500/5 cursor-pointer"
      } relative overflow-hidden group hover:bg-white/5 transition-colors cursor-pointer`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-2">
          {job.status === "processing" && (
            <Loader className="w-3 h-3 animate-spin" />
          )}
          ID: {job.id.slice(0, 8)}...
          {job.cost && (
            <span className="ml-2 text-[10px] text-gray-400">
              Cost: <span className="text-red-400/80">${job.cost.totalCost.toFixed(3)}</span>
              {job.cost.profit !== undefined && (
                <> | Profit: <span className="text-green-400/80">${job.cost.profit.toFixed(2)}</span></>
              )}
            </span>
          )}
        </span>
        <div className="flex flex-col items-end gap-1">
            <span
            className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${
                job.status === "processing"
                ? "text-blue-400 bg-blue-400/20"
                : job.status === "completed"
                    ? "text-green-400 bg-green-400/20"
                    : job.status === "failed"
                    ? "text-red-500 bg-red-500/20"
                    : "text-gray-400 bg-gray-500/20"
            }`}
            >
            {job.status}
            </span>
            {/* NEW: File Badge */}
            {job.uploadedFiles && job.uploadedFiles.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center gap-1 w-fit">
                    <span>📁</span> {job.uploadedFiles.length}
                </span>
            )}
        </div>
      </div>

      {job.prompt && (
        <div className="mb-2 text-sm text-gray-300 line-clamp-2">
          <span className="text-purple-500 font-bold mr-2">&gt;</span>
          {job.prompt}
        </div>
      )}

      {job.result && (
        <div className="text-xs text-gray-400 font-mono bg-black/30 p-2 rounded border border-white/5 mt-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-green-400 mr-2">$</span>
          {typeof job.result === "string"
              ? job.result.slice(0, 80)
              : JSON.stringify(job.result).slice(0, 80)}
        </div>
      )}

      {active && (
        <div className="absolute bottom-0 left-0 h-0.5 bg-blue-400 animate-progress w-full"></div>
      )}
    </motion.div>
  );
}
