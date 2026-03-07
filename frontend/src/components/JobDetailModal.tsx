import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Job } from "../store/jobStore";
import FileList from "./FileList";

interface JobDetailModalProps {
 job: Job | null;
 isOpen: boolean;
 onClose: () => void;
}

export default function JobDetailModal({
 job,
 isOpen,
 onClose,
}: JobDetailModalProps) {
 if (!job || !isOpen) return null;

 return (
  <AnimatePresence>
   {isOpen && (
    <motion.div
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     exit={{ opacity: 0 }}
     onClick={onClose}
     className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    >
     <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-slate-950 border border-blue-400/30 rounded-lg p-4 md:p-6 max-w-6xl w-full max-h-[85vh] overflow-y-auto box-glow-cyan"
     >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
       <div>
        <h2
         className="text-2xl md:text-3xl font-bold text-blue-400 mb-2"
         style={{ fontFamily: "'Fira Code', monospace" }}
        >
         JOB DETAILS
        </h2>
        <p className="text-xs md:text-sm text-slate-400">ID: {job.id}</p>
       </div>
       <button
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors p-1"
       >
        <X className="w-6 h-6" />
       </button>
      </div>

      {/* Status Badge & Retry Count */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
       <span
        className={`text-sm px-3 py-1 rounded-full uppercase font-bold inline-block border ${
         job.status === "processing"
          ? "text-blue-400 bg-blue-400/20 border-blue-400/50"
          : job.status === "completed"
           ? "text-green-400 bg-green-400/20 border-green-400/50"
           : job.status === "failed"
            ? "text-red-500 bg-red-500/20 border-red-500/50"
            : "text-slate-400 bg-slate-400/20 border-slate-400/50"
        }`}
       >
        {job.status}
       </span>
       {job.retryCount !== undefined && job.retryCount > 0 && (
        <span className="text-xs px-2 py-1 rounded bg-orange-500/20 border border-orange-500/50 text-orange-400 font-bold">
         Retries: {job.retryCount}
        </span>
       )}
       {job.type && (
        <span className="text-xs px-2 py-1 rounded bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 font-mono">
         {job.type}
        </span>
       )}
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
       {/* Prompt */}
       {job.prompt && (
        <div>
         <h3 className="text-xs md:text-sm uppercase tracking-wider text-purple-400 mb-2 font-bold">
          Prompt
         </h3>
         <div className="bg-slate-900/50 border border-purple-400/20 rounded p-3 md:p-4 text-xs md:text-sm text-slate-300 font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
          {job.prompt}
         </div>
        </div>
       )}

       {/* Result */}
       {job.result && (
        <div>
         <h3 className="text-xs md:text-sm uppercase tracking-wider text-green-400 mb-2 font-bold">
          Result
         </h3>
         <div className="bg-slate-900/50 border border-green-400/20 rounded p-3 md:p-4 text-xs md:text-sm text-slate-300 font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
          {typeof job.result === "string"
           ? job.result
           : JSON.stringify(job.result, null, 2)}
         </div>
        </div>
       )}

       {/* Output - from backend output field */}
       {job.output && (
        <div>
         <h3 className="text-xs md:text-sm uppercase tracking-wider text-cyan-400 mb-2 font-bold">
          Output
         </h3>
         <div className="bg-slate-900/50 border border-cyan-400/20 rounded p-3 md:p-4 text-xs md:text-sm text-slate-300 font-mono whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
          {typeof job.output === "string"
           ? job.output
           : JSON.stringify(job.output, null, 2)}
         </div>
        </div>
       )}

       {/* NEW: Uploaded Files List */}
       {job.uploadedFiles && job.uploadedFiles.length > 0 && (
        <FileList files={job.uploadedFiles} />
       )}

       {/* Error */}
       {job.error && (
        <div>
         <h3 className="text-sm uppercase tracking-wider text-red-500 mb-2 font-bold">
          Error
         </h3>
         <div className="bg-red-500/5 border border-red-500/20 rounded p-4 text-sm text-red-300 font-mono whitespace-pre-wrap break-words">
          {job.error}
         </div>
        </div>
       )}

       {/* Detailed Metrics Section */}
       {(job.usage || job.cost) && (
        <div className="pt-4 border-t border-slate-700">
         <h3 className="text-xs md:text-sm uppercase tracking-wider text-amber-400 mb-3 font-bold">
          Cost & Token Usage
         </h3>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-900/30 p-4 rounded border border-amber-400/10">
          {job.usage && (
           <>
            <div>
             <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-bold">
              Prompt Tokens
             </p>
             <p className="text-xs md:text-sm text-slate-300 font-mono">
              {job.usage.promptTokens.toLocaleString()}
             </p>
            </div>
            <div>
             <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-bold">
              Completion Tokens
             </p>
             <p className="text-xs md:text-sm text-slate-300 font-mono">
              {job.usage.completionTokens.toLocaleString()}
             </p>
            </div>
            <div>
             <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-bold">
              Total Tokens
             </p>
             <p className="text-xs md:text-sm text-slate-300 font-mono">
              {job.usage.totalTokens.toLocaleString()}
             </p>
            </div>
           </>
          )}
          {job.cost && (
           <>
            <div>
             <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-bold">
              Input Cost
             </p>
             <p className="text-xs md:text-sm text-red-400/80 font-mono">
              ${job.cost.inputCost.toFixed(5)}
             </p>
            </div>
            <div>
             <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-bold">
              Output Cost
             </p>
             <p className="text-xs md:text-sm text-red-400/80 font-mono">
              ${job.cost.outputCost.toFixed(5)}
             </p>
            </div>
            <div>
             <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-bold">
              Total Cost
             </p>
             <p className="text-xs md:text-sm text-red-400 font-bold font-mono">
              ${job.cost.totalCost.toFixed(5)}
             </p>
            </div>
            {job.cost.profit !== undefined && (
             <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-bold">
               Net Profit
              </p>
              <p className="text-xs md:text-sm text-green-400 font-bold font-mono">
               ${job.cost.profit.toFixed(4)}
              </p>
             </div>
            )}
           </>
          )}
         </div>
        </div>
       )}

       {/* Detailed Metadata Grid */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700">
        <div>
         <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
          Created
         </p>
         <p className="text-xs md:text-sm text-slate-300">
          {new Date(job.timestamp || 0).toLocaleString()}
         </p>
        </div>
        {job.completedAt && (
         <>
          <div>
           <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Completed
           </p>
           <p className="text-xs md:text-sm text-slate-300">
            {new Date(job.completedAt).toLocaleString()}
           </p>
          </div>
          <div>
           <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Duration
           </p>
           <p className="text-xs md:text-sm text-slate-300 font-mono">
            {Math.round(
             (job.completedAt - (job.timestamp || 0)) / 1000
            )}
            s
           </p>
          </div>
         </>
        )}
        {job.budget && (
         <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
           Budget
          </p>
          <p className="text-xs md:text-sm text-amber-400 font-mono">
           ${job.budget}
          </p>
         </div>
        )}
       </div>

       {/* Skills Section */}
       {job.skills && job.skills.length > 0 && (
        <div className="pt-4 border-t border-slate-700">
         <h3 className="text-xs md:text-sm uppercase tracking-wider text-teal-400 mb-3 font-bold">
          Skills
         </h3>
         <div className="flex flex-wrap gap-2">
          {job.skills.map((skill, idx) => (
           <span
            key={idx}
            className="text-xs px-2 py-1 rounded bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono"
           >
            {skill}
           </span>
          ))}
         </div>
        </div>
       )}
      </div>

      {/* Close Button */}
      <div className="mt-6 flex gap-2">
       <button
        onClick={onClose}
        className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-400/50 rounded py-2 px-3 md:px-4 font-bold transition-colors"
       >
        Close
       </button>
      </div>
     </motion.div>
    </motion.div>
   )}
  </AnimatePresence>
 );
}
