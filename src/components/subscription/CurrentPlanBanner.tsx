import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, ArrowRight, Sparkles } from 'lucide-react';
import { SubscriptionService, type Subscription } from '../../services/subscriptionService';
import { useAuth } from '../../contexts/AuthContext';

export default function CurrentPlanBanner() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadSubscription();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadSubscription = async () => {
    try {
      const data = await SubscriptionService.getSubscription(user!.id);
      setSubscription(data);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (!subscription) {
    return (
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">No active subscription</p>
            <p className="text-xs text-gray-500">Upgrade to unlock telemedicine, prescriptions, and more</p>
          </div>
        </div>
        <Link
          to="/dashboard/select-plan"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          View Plans
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  const plan = subscription.plan;
  const daysLeft = Math.ceil(
    (new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isTrialing = subscription.status === 'trialing';
  const isPastDue = subscription.status === 'past_due';

  return (
    <div
      className={`rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap border ${
        isPastDue
          ? 'bg-amber-50 border-amber-200'
          : isTrialing
            ? 'bg-blue-50 border-blue-100'
            : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          isPastDue ? 'bg-amber-100' : 'bg-emerald-50'
        }`}>
          <CreditCard className={`w-4.5 h-4.5 ${isPastDue ? 'text-amber-600' : 'text-emerald-600'}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{plan?.name || 'Unknown Plan'}</p>
            {isTrialing && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Trial</span>
            )}
            {isPastDue && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Past Due</span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {subscription.billing_interval === 'annual' ? 'Annual' : 'Monthly'} billing
            {' -- '}
            {daysLeft > 0
              ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} until renewal`
              : 'Renewal pending'}
          </p>
        </div>
      </div>
      <Link
        to="/dashboard/select-plan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
      >
        Manage Plan
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
