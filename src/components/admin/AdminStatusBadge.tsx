import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface AdminStatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

const variantMap = {
  default: 'outline',
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
  info: 'info',
} as const;

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-4 py-1.5 text-sm',
} as const;

export default function AdminStatusBadge({
  status,
  variant = 'default',
  size = 'md',
}: AdminStatusBadgeProps) {
  return (
    <Badge
      variant={variantMap[variant]}
      className={cn(sizeClasses[size])}
    >
      {status}
    </Badge>
  );
}
