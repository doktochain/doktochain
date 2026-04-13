import { useTranslation } from 'react-i18next';

interface PricingToggleProps {
  billingCycle: 'monthly' | 'annual';
  onChange: (cycle: 'monthly' | 'annual') => void;
}

export default function PricingToggle({ billingCycle, onChange }: PricingToggleProps) {
  const { t } = useTranslation('pricing');

  return (
    <div className="flex items-center justify-center gap-4">
      <span
        className={`text-sm font-medium cursor-pointer transition-colors ${
          billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-400'
        }`}
        onClick={() => onChange('monthly')}
      >
        {t('toggle.monthly')}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={billingCycle === 'annual'}
        onClick={() => onChange(billingCycle === 'monthly' ? 'annual' : 'monthly')}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          billingCycle === 'annual' ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>

      <span
        className={`text-sm font-medium cursor-pointer transition-colors flex items-center gap-2 ${
          billingCycle === 'annual' ? 'text-gray-900' : 'text-gray-400'
        }`}
        onClick={() => onChange('annual')}
      >
        {t('toggle.annual')}
        <span className="inline-flex items-center bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
          {t('toggle.save15')}
        </span>
      </span>
    </div>
  );
}
