import { ShieldCheck, ShieldOff, AlertTriangle, Clock } from 'lucide-react';

interface ConsentStatusBadgeProps {
  status: 'active' | 'expired' | 'revoked' | 'none' | 'expiring_soon';
  endDate?: string | null;
  compact?: boolean;
}

export default function ConsentStatusBadge({ status, endDate, compact = false }: ConsentStatusBadgeProps) {
  const now = new Date();
  const daysRemaining = endDate
    ? Math.max(0, Math.ceil((new Date(endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const effectiveStatus = status === 'active' && daysRemaining !== null && daysRemaining <= 7
    ? 'expiring_soon'
    : status;

  const config = {
    active: {
      icon: ShieldCheck,
      label: endDate ? `Access until ${new Date(endDate).toLocaleDateString()}` : 'Access granted',
      shortLabel: 'Consented',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      text: 'text-teal-700',
      iconColor: 'text-teal-500',
    },
    expiring_soon: {
      icon: AlertTriangle,
      label: `Access expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
      shortLabel: `${daysRemaining}d left`,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      iconColor: 'text-amber-500',
    },
    expired: {
      icon: Clock,
      label: 'Consent expired',
      shortLabel: 'Expired',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-600',
      iconColor: 'text-gray-400',
    },
    revoked: {
      icon: ShieldOff,
      label: 'Access revoked by patient',
      shortLabel: 'Revoked',
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      iconColor: 'text-red-400',
    },
    none: {
      icon: ShieldOff,
      label: 'No active consent - request access from patient',
      shortLabel: 'No consent',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-600',
      iconColor: 'text-gray-400',
    },
  };

  const c = config[effectiveStatus];
  const Icon = c.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
        <Icon className="w-3 h-3" />
        {c.shortLabel}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${c.bg} ${c.border}`}>
      <Icon className={`w-4 h-4 flex-shrink-0 ${c.iconColor}`} />
      <span className={`text-sm ${c.text}`}>{c.label}</span>
    </div>
  );
}
