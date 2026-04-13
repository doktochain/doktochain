import { Video as LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: LucideIcon;
  onClick?: () => void;
}

const changeColors = {
  increase: 'text-emerald-600 dark:text-emerald-400',
  decrease: 'text-red-600 dark:text-red-400',
  neutral: 'text-muted-foreground',
};

export default function AdminStatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  onClick,
}: AdminStatsCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-6 rounded-lg border bg-card transition-all',
        onClick && 'cursor-pointer hover:shadow-lg'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium mb-1 text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mb-2">{value}</p>
          {change && (
            <p className={cn('text-sm', changeColors[changeType])}>{change}</p>
          )}
        </div>
        <div className="p-4 rounded-full bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
