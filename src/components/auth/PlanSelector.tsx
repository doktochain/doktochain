import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Crown, Star, Zap } from 'lucide-react';
import { SubscriptionService, type SubscriptionPlan } from '../../services/subscriptionService';

interface PlanSelectorProps {
  role: string;
  initialPlanKey?: string;
  initialBilling?: 'monthly' | 'annual';
  promoCode?: string;
  onSelect: (plan: SubscriptionPlan, billing: 'monthly' | 'annual') => void;
}

export default function PlanSelector({ role, initialPlanKey, initialBilling, promoCode, onSelect }: PlanSelectorProps) {
  const { t } = useTranslation('auth');
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(initialPlanKey || '');
  const [billing, setBilling] = useState<'monthly' | 'annual'>(initialBilling || 'monthly');
  const [foundingSlotsLeft, setFoundingSlotsLeft] = useState<number | null>(null);

  const isFoundingPromo = promoCode === 'founding' && role === 'provider';

  const foundingPlan = allPlans.find((p) => p.plan_key === 'founding_pro');
  const displayPlans = allPlans.filter((p) => p.plan_key !== 'founding_pro');

  useEffect(() => {
    loadPlans();
  }, [role]);

  useEffect(() => {
    if (isFoundingPromo) {
      SubscriptionService.getFoundingSlotsRemaining().then(setFoundingSlotsLeft).catch(() => setFoundingSlotsLeft(null));
    }
  }, [isFoundingPromo]);

  const resolveSelection = (planKey: string, plans: SubscriptionPlan[], billingVal: 'monthly' | 'annual') => {
    if (isFoundingPromo && planKey === 'solo_pro' && foundingPlan) {
      onSelect(foundingPlan, 'monthly');
    } else {
      const match = plans.find((p) => p.plan_key === planKey);
      if (match) onSelect(match, billingVal);
    }
  };

  const loadPlans = async () => {
    try {
      const data = await SubscriptionService.getPlans(role);
      setAllPlans(data);

      const visible = data.filter((p) => p.plan_key !== 'founding_pro');
      const founding = data.find((p) => p.plan_key === 'founding_pro');

      if (!selectedKey && visible.length > 0) {
        const defaultKey = isFoundingPromo ? 'solo_pro' : undefined;
        const popular = visible.find((p) => p.is_popular);
        const initial = visible.find((p) => p.plan_key === (defaultKey || initialPlanKey)) || popular || visible[0];
        setSelectedKey(initial.plan_key);

        if (isFoundingPromo && initial.plan_key === 'solo_pro' && founding) {
          onSelect(founding, 'monthly');
        } else {
          onSelect(initial, billing);
        }
      } else {
        resolveSelection(selectedKey, visible, billing);
      }
    } catch {
      setAllPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (plan: SubscriptionPlan) => {
    setSelectedKey(plan.plan_key);
    if (isFoundingPromo && plan.plan_key === 'solo_pro' && foundingPlan) {
      onSelect(foundingPlan, 'monthly');
    } else {
      onSelect(plan, billing);
    }
  };

  const handleBillingChange = (newBilling: 'monthly' | 'annual') => {
    setBilling(newBilling);
    const match = displayPlans.find((p) => p.plan_key === selectedKey);
    if (match) {
      if (isFoundingPromo && match.plan_key === 'solo_pro' && foundingPlan) {
        onSelect(foundingPlan, 'monthly');
      } else {
        onSelect(match, newBilling);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (displayPlans.length === 0) return null;

  const hasPaidPlans = displayPlans.some((p) => !p.is_free && !p.is_custom_pricing);

  return (
    <div className="space-y-4">
      {isFoundingPromo && foundingPlan && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-1.5">
            <Crown className="w-4 h-4 text-yellow-300" />
            <span className="text-sm font-bold">{t('planSelector.foundingBadge', 'Limited Offer')}</span>
          </div>
          <p className="text-xs text-blue-100 leading-relaxed">
            {t('planSelector.foundingBannerText', 'You\'re registering as a Founding Member. Solo Pro is locked at $69/month for life.')}
          </p>
          {foundingSlotsLeft !== null && foundingSlotsLeft > 0 && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-blue-200">
                  {t('planSelector.foundingSlotsLeft', { count: foundingSlotsLeft, defaultValue: '{{count}} of 30 spots remaining' })}
                </span>
                <span className="text-white font-medium">{30 - foundingSlotsLeft}/30</span>
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${((30 - foundingSlotsLeft) / 30) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">{t('planSelector.chooseYourPlan')}</p>
        {hasPaidPlans && (
          <div className="inline-flex bg-gray-100 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => handleBillingChange('monthly')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                billing === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t('planSelector.monthly')}
            </button>
            <button
              type="button"
              onClick={() => handleBillingChange('annual')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                billing === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t('planSelector.annual')}
              <span className="ml-1 text-emerald-600">{t('planSelector.annualDiscount')}</span>
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {displayPlans.filter((p) => !p.is_custom_pricing).map((plan) => {
          const isSelected = selectedKey === plan.plan_key;
          const showFoundingPrice = isFoundingPromo && plan.plan_key === 'solo_pro' && foundingPlan;
          const price = billing === 'annual' && plan.annual_price_cad
            ? plan.annual_price_cad
            : plan.monthly_price_cad;

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => handleSelect(plan)}
              className={`w-full text-left rounded-lg border-2 p-3.5 transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{plan.name}</span>
                      {showFoundingPrice && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                          <Crown className="w-2.5 h-2.5" />
                          $69/mo
                        </span>
                      )}
                      {plan.is_popular && !showFoundingPrice && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          {t('planSelector.popular')}
                        </span>
                      )}
                      {plan.is_free && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                          {t('planSelector.free')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  {plan.is_free ? (
                    <span className="text-sm font-bold text-gray-900">$0</span>
                  ) : showFoundingPrice ? (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 line-through">
                          {SubscriptionService.formatPrice(price)}
                        </span>
                        <span className="text-sm font-bold text-blue-700">
                          {SubscriptionService.formatPrice(foundingPlan.monthly_price_cad)}
                        </span>
                      </div>
                      <span className="text-[10px] text-blue-600 font-medium">{t('planSelector.foundingForLife', '/mo for life')}</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-sm font-bold text-gray-900">
                        {SubscriptionService.formatPrice(price)}
                      </span>
                      <span className="text-xs text-gray-500">/mo</span>
                    </div>
                  )}
                </div>
              </div>

              {isSelected && !plan.is_free && !plan.is_custom_pricing && (
                <div className="mt-2.5 pt-2.5 border-t border-blue-100 flex items-center gap-1.5 text-xs text-blue-700">
                  <Zap className="w-3 h-3" />
                  <span>{t('planSelector.trialNote')}</span>
                </div>
              )}

              {isSelected && plan.features.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-1">
                  {plan.features.slice(0, 4).map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                      <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
