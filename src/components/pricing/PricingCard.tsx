import { useTranslation } from 'react-i18next';
import { Check, ArrowRight, Star } from 'lucide-react';
import LocalizedLink from '../LocalizedLink';
import type { SubscriptionPlan } from '../../services/subscriptionService';
import { SubscriptionService } from '../../services/subscriptionService';

interface PricingCardProps {
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'annual';
}

export default function PricingCard({ plan, billingCycle }: PricingCardProps) {
  const { t } = useTranslation('pricing');

  const price = billingCycle === 'annual' && plan.annual_price_cad
    ? plan.annual_price_cad
    : plan.monthly_price_cad;

  const monthlySavings = billingCycle === 'annual' && plan.annual_price_cad && plan.monthly_price_cad > 0
    ? plan.monthly_price_cad - plan.annual_price_cad
    : 0;

  const registerPath = `/register?role=${plan.target_role}&plan=${plan.plan_key}&billing=${billingCycle}`;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${
        plan.is_popular
          ? 'border-blue-600 shadow-lg shadow-blue-100 scale-[1.02]'
          : 'border-gray-200 hover:border-gray-300'
      } bg-white`}
    >
      {plan.is_popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
            <Star className="w-3.5 h-3.5 fill-current" />
            {t('card.mostPopular')}
          </span>
        </div>
      )}

      <div className="p-8 pb-0">
        <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
        <p className="mt-1.5 text-sm text-gray-500 min-h-[40px]">{plan.description}</p>

        <div className="mt-6 flex items-baseline gap-1">
          {plan.is_free ? (
            <span className="text-4xl font-bold text-gray-900">{t('card.free')}</span>
          ) : plan.is_custom_pricing ? (
            <span className="text-3xl font-bold text-gray-900">{t('card.custom')}</span>
          ) : (
            <>
              <span className="text-4xl font-bold text-gray-900">
                {SubscriptionService.formatPrice(price)}
              </span>
              <span className="text-sm text-gray-500">{t('card.perMonth')}</span>
            </>
          )}
        </div>

        {monthlySavings > 0 && (
          <p className="mt-1.5 text-sm text-emerald-600 font-medium">
            {t('card.saveWithAnnual', { amount: SubscriptionService.formatPrice(monthlySavings) })}
          </p>
        )}

        {plan.seats_included && (
          <p className="mt-2 text-sm text-gray-600">
            {t('card.seatsIncluded', { count: plan.seats_included })}
            {plan.per_extra_seat_cad && (
              <span className="text-gray-400">
                {' '} -- {t('card.extraSeat', { price: SubscriptionService.formatPrice(plan.per_extra_seat_cad) })}
              </span>
            )}
          </p>
        )}

        {plan.transaction_commission_pct > 0 && (
          <p className="mt-1 text-xs text-gray-400">
            {t('card.transactionFee', { pct: plan.transaction_commission_pct })}
          </p>
        )}
      </div>

      <div className="p-8 pt-6 flex-1">
        <ul className="space-y-3">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <Check className="w-4.5 h-4.5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-8 pt-0">
        {plan.is_custom_pricing ? (
          <LocalizedLink
            to="/frontend/help"
            className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl text-sm font-semibold border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-all duration-200"
          >
            {t('card.contactSales')}
            <ArrowRight className="w-4 h-4" />
          </LocalizedLink>
        ) : (
          <LocalizedLink
            to={registerPath}
            className={`flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-200 ${
              plan.is_popular
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
                : plan.is_free
                  ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {plan.is_free ? t('card.getStartedFree') : t('card.startFreeTrial')}
            <ArrowRight className="w-4 h-4" />
          </LocalizedLink>
        )}
      </div>
    </div>
  );
}
