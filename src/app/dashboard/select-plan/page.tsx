import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Star, Zap, Loader2, ExternalLink } from 'lucide-react';
import { SubscriptionService, type SubscriptionPlan } from '../../../services/subscriptionService';
import { useSubscription } from '../../../hooks/useSubscription';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'sonner';

export default function SelectPlanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { subscription, hasSubscription, refresh } = useSubscription();

  const role = profile?.role || 'provider';
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, [role]);

  const loadPlans = async () => {
    try {
      const data = await SubscriptionService.getPlans(role);
      setPlans(data.filter((p) => !p.is_custom_pricing));
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan.is_free) {
      try {
        setCheckoutLoading(plan.id);
        await SubscriptionService.createSubscription({
          subscriber_id: profile!.id,
          subscriber_type: role as 'provider' | 'clinic' | 'pharmacy',
          plan_id: plan.id,
          billing_interval: billingCycle,
        });
        toast.success('Free plan activated successfully');
        await refresh();
        const dashboardMap: Record<string, string> = {
          provider: '/dashboard/provider/dashboard',
          pharmacy: '/dashboard/pharmacy/dashboard',
          clinic: '/dashboard/clinic/dashboard',
        };
        navigate(dashboardMap[role] || '/dashboard', { replace: true });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to activate plan');
      } finally {
        setCheckoutLoading(null);
      }
      return;
    }

    try {
      setCheckoutLoading(plan.id);

      if (!hasSubscription) {
        await SubscriptionService.createSubscription({
          subscriber_id: profile!.id,
          subscriber_type: role as 'provider' | 'clinic' | 'pharmacy',
          plan_id: plan.id,
          billing_interval: billingCycle,
          trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      const result = await SubscriptionService.initiateSubscriptionCheckout({
        plan_id: plan.id,
        billing_interval: billingCycle,
        success_url: `${window.location.origin}/dashboard/select-plan?success=true`,
        cancel_url: `${window.location.origin}/dashboard/select-plan`,
      });

      if (result.setup_required) {
        toast.error('Stripe is not configured yet. Your trial has been started.');
        await refresh();
        const dashboardMap: Record<string, string> = {
          provider: '/dashboard/provider/dashboard',
          pharmacy: '/dashboard/pharmacy/dashboard',
          clinic: '/dashboard/clinic/dashboard',
        };
        navigate(dashboardMap[role] || '/dashboard', { replace: true });
        return;
      }

      if (result.checkout_url) {
        try {
          const url = new URL(result.checkout_url);
          if (url.hostname.endsWith('.stripe.com')) {
            window.location.href = result.checkout_url;
          } else {
            toast.error('Invalid checkout URL received');
          }
        } catch {
          toast.error('Invalid checkout URL received');
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription payment method saved successfully');
      refresh();
    }
  }, [searchParams]);

  const currentPlanKey = subscription?.plan?.plan_key;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {hasSubscription ? 'Manage Your Plan' : 'Choose Your Plan'}
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          {hasSubscription
            ? 'Upgrade or change your subscription plan'
            : 'Select a plan to unlock all features for your practice'}
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-gray-100 rounded-lg p-1 text-sm">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              billingCycle === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Annual
            <span className="ml-1.5 text-emerald-600 text-xs font-bold">Save 20%</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className={`grid gap-6 ${
          plans.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto' : 'grid-cols-1 md:grid-cols-3'
        }`}>
          {plans.map((plan) => {
            const isCurrent = currentPlanKey === plan.plan_key;
            const price = billingCycle === 'annual' && plan.annual_price_cad
              ? plan.annual_price_cad
              : plan.monthly_price_cad;
            const isLoading = checkoutLoading === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-xl border-2 bg-white transition-all ${
                  isCurrent
                    ? 'border-emerald-500 shadow-md'
                    : plan.is_popular
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}
                {!isCurrent && plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      <Star className="w-3 h-3 fill-current" />
                      Popular
                    </span>
                  </div>
                )}

                <div className="p-6 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 min-h-[32px]">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    {plan.is_free ? (
                      <span className="text-3xl font-bold text-gray-900">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-gray-900">
                          {SubscriptionService.formatPrice(price)}
                        </span>
                        <span className="text-sm text-gray-500">/mo</span>
                      </>
                    )}
                  </div>
                  {!plan.is_free && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-blue-600">
                      <Zap className="w-3 h-3" />
                      <span>7-day free trial included</span>
                    </div>
                  )}
                </div>

                <div className="px-6 pb-4 flex-1">
                  <ul className="space-y-2">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 pt-2">
                  {isCurrent ? (
                    <div className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-center bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isLoading || checkoutLoading !== null}
                      className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                        plan.is_popular
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : plan.is_free
                            ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                            : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : plan.is_free ? (
                        'Select Free Plan'
                      ) : hasSubscription ? (
                        <>
                          Switch to {plan.name}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          Start Free Trial
                          <ExternalLink className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-gray-400 mt-8">
        All prices in Canadian Dollars (CAD). Paid plans include a 7-day free trial.
        Cancel anytime before your trial ends and you will not be charged.
      </p>
    </div>
  );
}
