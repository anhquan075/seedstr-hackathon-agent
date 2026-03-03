import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, CheckCircle, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { AgentStats } from '../types/events';
import { formatCurrency, formatDuration } from '../utils/formatters';

interface StatisticsProps {
  stats: AgentStats;
}

export function Statistics({ stats }: StatisticsProps) {
  const successRate = stats.totalJobs > 0 
    ? Math.round((stats.successCount / stats.totalJobs) * 100) 
    : 0;

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-100">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        Statistics
      </h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
            <Briefcase className="w-4 h-4" /> Total Jobs
          </div>
          <motion.div 
            key={stats.totalJobs}
            initial={{ scale: 1.2, color: '#60A5FA' }}
            animate={{ scale: 1, color: '#F3F4F6' }}
            className="text-2xl font-bold text-gray-100"
          >
            {stats.totalJobs}
          </motion.div>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Success Rate
          </div>
          <div className="text-2xl font-bold text-green-400">
            {successRate}%
          </div>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
            <Clock className="w-4 h-4" /> Avg Time
          </div>
          <div className="text-2xl font-bold text-gray-100">
            {formatDuration(stats.averageTime)}
          </div>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
            <DollarSign className="w-4 h-4" /> Earnings
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {formatCurrency(stats.totalEarnings)}
          </div>
        </div>
      </div>
    </div>
  );
}