import React from 'react';
import { PlayCircle, PauseCircle, StopCircle, Settings, RefreshCw } from 'lucide-react';

interface ControlsProps {
  isPaused: boolean;
  onTogglePause: () => void;
  onStop: () => void;
  onRefresh: () => void;
}

export function Controls({ isPaused, onTogglePause, onStop, onRefresh }: ControlsProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={onTogglePause}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            isPaused 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
          }`}
        >
          {isPaused ? <PlayCircle className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        
        <button
          onClick={onStop}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
        >
          <StopCircle className="w-5 h-5" />
          Emergency Stop
        </button>
        
        <div className="flex-1 sm:flex-none flex justify-end gap-4 ml-auto">
          <button
            onClick={onRefresh}
            className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
            title="Refresh Connection"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          <button
            className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}