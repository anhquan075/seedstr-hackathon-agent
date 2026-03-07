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
   className={`p-4 rounded border cyber-border relative overflow-hidden group transition-all cursor-pointer ${
    job.status === "processing"
     ? "border-orange-500/50 bg-orange-500/10 box-glow-fire"
     : job.status === "completed"
      ? "border-green-500/30 bg-green-500/5"
      : job.status === "failed"
       ? "border-red-500/30 bg-red-500/5"
       : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
   }`}
  >
   <div className="flex justify-between items-start mb-2 relative z-10">
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
     {job.status === "processing" && (
      <Loader className="w-3 h-3 animate-spin text-orange-500" />
     )}
     OP_ID: {job.id.slice(0, 8)}
     {job.cost && (
      <span className="ml-2 px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 text-[9px]">
       COST: <span className="text-red-400/80">${job.cost.totalCost.toFixed(3)}</span>
       {job.cost.profit !== undefined && (
        <> | <span className="text-green-400/80">PROFIT: ${job.cost.profit.toFixed(2)}</span></>
       )}
      </span>
     )}
    </span>
    <div className="flex flex-col items-end gap-1">
      <span
      className={`text-[9px] px-2 py-0.5 rounded-sm uppercase font-black tracking-widest ${
        job.status === "processing"
        ? "text-orange-400 bg-orange-400/20"
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
        <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-orange-500/10 border border-orange-500/20 text-orange-300 flex items-center gap-1 w-fit font-bold">
          DATA_PACK: {job.uploadedFiles.length}
        </span>
      )}
    </div>
   </div>

   {job.prompt && (
    <div className="mb-2 text-xs text-slate-400 line-clamp-2 font-mono relative z-10 leading-relaxed">
     <span className="text-orange-500 font-black mr-2">&gt;&gt;</span>
     {job.prompt}
    </div>
   )}

   {job.result && (
    <div className="text-[10px] text-slate-500 font-mono bg-black/50 p-2 rounded-sm border border-slate-800 mt-2 overflow-hidden text-ellipsis whitespace-nowrap relative z-10">
     <span className="text-orange-500/50 mr-2">$</span>
     {typeof job.result === "string"
       ? job.result.slice(0, 80)
       : JSON.stringify(job.result).slice(0, 80)}
    </div>
   )}

   {active && (
    <div className="absolute bottom-0 left-0 h-0.5 bg-orange-500 animate-pulse w-full"></div>
   )}
   
   <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
  </motion.div>
 );
}
