import { getFileIcon, formatBytes, truncateFilename } from "../utils/file-helpers";

interface FileListProps {
  files: { name: string; size: number }[];
}

export default function FileList({ files }: FileListProps) {
  if (!files || files.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-xs md:text-sm uppercase tracking-wider text-blue-400 mb-2 font-bold flex items-center gap-2">
        <span>📁</span>
        <span>Generated Files</span>
        <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded text-blue-300 border border-blue-500/30">
          {files.length} files
        </span>
      </h3>
      <div className="bg-slate-900/50 border border-blue-400/20 rounded-lg overflow-hidden">
        <div className="max-h-60 overflow-y-auto custom-scrollbar">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 border-b border-blue-400/10 last:border-0 hover:bg-blue-400/5 transition-colors"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-xl shrink-0" role="img" aria-label="file icon">
                  {getFileIcon(file.name)}
                </span>
                <span className="text-sm text-slate-300 font-mono truncate" title={file.name}>
                  {truncateFilename(file.name, 40)}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono shrink-0 ml-4">
                {formatBytes(file.size)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
