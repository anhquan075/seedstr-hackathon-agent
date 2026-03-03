import { motion } from 'framer-motion';
import { Briefcase, CheckCircle2, DollarSign, Timer } from 'lucide-react';
import { AgentStats } from '../types/events';
import { formatCurrency } from '../utils/formatters';

interface StatisticsProps {
  stats: AgentStats;
}

export function Statistics({ stats }: StatisticsProps) {
  const successRate = stats.totalJobs > 0 
    ? Math.round((stats.successfulJobs / stats.totalJobs) * 100) 
    : 0;

  const getSuccessRateColor = () => {
    if (successRate >= 90) return 'text-success';
    if (successRate >= 70) return 'text-warning';
    return 'text-error';
  };

  const cards = [
    {
      title: 'Total Jobs',
      value: stats.totalJobs,
      icon: Briefcase,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Success Rate',
      value: `${successRate}%`,
      icon: CheckCircle2,
      color: getSuccessRateColor(),
      bg: 'bg-success/10',
    },
    {
      title: 'Avg Time',
      value: `${Math.round(stats.averageCompletionTime)}s`,
      icon: Timer,
      color: 'text-secondary',
      bg: 'bg-secondary/10',
    },
    {
      title: 'Earnings',
      value: formatCurrency(stats.totalEarnings),
      icon: DollarSign,
      color: 'text-success',
      bg: 'bg-success/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-surface border border-border rounded-xl p-6 shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${card.bg}`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
          </div>
          <h3 className="text-muted text-sm font-medium mb-1">{card.title}</h3>
          <div className="text-3xl font-bold text-text font-heading">
            {card.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}