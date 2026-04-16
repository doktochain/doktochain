import { useState, useEffect, useCallback } from 'react';
import { SubscriptionService, type Subscription } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';

export function useSubscription() {
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await SubscriptionService.getSubscription(user.id);
      setSubscription(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const isActive = subscription?.status === 'active';
  const isTrialing = subscription?.status === 'trialing';
  const isPastDue = subscription?.status === 'past_due';
  const hasSubscription = isActive || isTrialing || isPastDue;

  const needsSubscription =
    profile?.role === 'provider' ||
    profile?.role === 'pharmacy' ||
    profile?.role === 'clinic';

  const daysLeft = subscription?.current_period_end
    ? Math.max(0, Math.ceil(
        (new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ))
    : 0;

  const trialDaysLeft = subscription?.trial_end
    ? Math.max(0, Math.ceil(
        (new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ))
    : 0;

  return {
    subscription,
    loading,
    error,
    refresh: load,
    isActive,
    isTrialing,
    isPastDue,
    hasSubscription,
    needsSubscription,
    daysLeft,
    trialDaysLeft,
    planName: subscription?.plan?.name || null,
    planKey: subscription?.plan?.plan_key || null,
  };
}
