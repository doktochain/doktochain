import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield, Lock, FileCheck, ArrowRight, Building2, Stethoscope, Pill,
  CheckCircle2, Phone, Crown,
} from 'lucide-react';
import LocalizedLink from '../../../components/LocalizedLink';
import Footer from '../../../components/frontend/Footer';
import PricingCard from '../../../components/pricing/PricingCard';
import PricingToggle from '../../../components/pricing/PricingToggle';
import PricingFAQ from '../../../components/pricing/PricingFAQ';
import { SubscriptionService, type SubscriptionPlan } from '../../../services/subscriptionService';

type TabKey = 'provider' | 'clinic' | 'pharmacy';

export default function PricingPage() {
  const { t } = useTranslation('pricing');
  const [activeTab, setActiveTab] = useState<TabKey>('provider');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [foundingSlotsLeft, setFoundingSlotsLeft] = useState<number | null>(null);

  const tabs: { key: TabKey; label: string; icon: React.ElementType; description: string }[] = [
    { key: 'provider', label: t('page.tabProvider'), icon: Stethoscope, description: t('page.tabProviderDesc') },
    { key: 'clinic', label: t('page.tabClinic'), icon: Building2, description: t('page.tabClinicDesc') },
    { key: 'pharmacy', label: t('page.tabPharmacy'), icon: Pill, description: t('page.tabPharmacyDesc') },
  ];

  const trustBadges = [
    { icon: Shield, label: t('page.trustPipeda') },
    { icon: Lock, label: t('page.trustEncryption') },
    { icon: FileCheck, label: t('page.trustFhir') },
  ];

  const features = [
    { title: t('page.feat1Title'), desc: t('page.feat1Desc') },
    { title: t('page.feat2Title'), desc: t('page.feat2Desc') },
    { title: t('page.feat3Title'), desc: t('page.feat3Desc') },
    { title: t('page.feat4Title'), desc: t('page.feat4Desc') },
  ];

  useEffect(() => {
    loadPlans();
    SubscriptionService.getFoundingSlotsRemaining().then(setFoundingSlotsLeft).catch(() => setFoundingSlotsLeft(null));
  }, []);

  const loadPlans = async () => {
    try {
      const data = await SubscriptionService.getPlans();
      setPlans(data);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter((p) => p.target_role === activeTab && p.plan_key !== 'founding_pro');
  const activeTabMeta = tabs.find((t) => t.key === activeTab)!;

  return (
    <div className="min-h-screen bg-white pt-16">
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-50 rounded-full blur-3xl opacity-40" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-blue-700">{t('page.badge')}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            {t('page.heroTitle1')}
            <br />
            <span className="text-blue-600">{t('page.heroTitle2')}</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {t('page.heroDesc')}
          </p>

          <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
            {trustBadges.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-gray-500">
                <Icon className="w-4 h-4 text-emerald-500" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 sm:px-8 pb-24">
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-100 rounded-xl p-1.5 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mb-8">
          {activeTabMeta.description}
        </p>

        <div className="mb-10">
          <PricingToggle billingCycle={billingCycle} onChange={setBillingCycle} />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[560px] bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div
            className={`grid gap-8 ${
              filteredPlans.length === 2
                ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
                : 'grid-cols-1 md:grid-cols-3'
            }`}
          >
            {filteredPlans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} billingCycle={billingCycle} />
            ))}
          </div>
        )}

        {activeTab === 'provider' && (
          <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full" />
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-4">
                <Crown className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-medium text-blue-100">{t('page.foundingBadge')}</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{t('page.foundingTitle')}</h3>
              <p className="text-blue-100 max-w-xl mx-auto mb-6">
                {t('page.foundingDesc1')}
                <span className="font-bold text-white"> {t('page.foundingPrice')}</span>.
                {' '}{t('page.foundingDesc2')}
              </p>

              {foundingSlotsLeft !== null && (
                <div className="max-w-sm mx-auto mb-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-blue-200">
                      {foundingSlotsLeft > 0
                        ? t('page.foundingSpotsLeft', { count: foundingSlotsLeft, defaultValue: '{{count}} of 30 spots remaining' })
                        : t('page.foundingSoldOut', 'All spots claimed')}
                    </span>
                    <span className="text-white font-semibold">{30 - foundingSlotsLeft}/30</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${((30 - foundingSlotsLeft) / 30) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {foundingSlotsLeft === null || foundingSlotsLeft > 0 ? (
                <LocalizedLink
                  to="/register?role=provider&promo=founding"
                  className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
                >
                  {t('page.foundingCta')}
                  <ArrowRight className="w-4 h-4" />
                </LocalizedLink>
              ) : (
                <span className="inline-flex items-center gap-2 bg-white/20 text-white font-semibold px-8 py-3 rounded-xl cursor-not-allowed">
                  {t('page.foundingSoldOut', 'All Spots Claimed')}
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            {t('page.transactionTitle')}
          </h2>
          <p className="text-center text-gray-500 max-w-2xl mx-auto mb-12">
            {t('page.transactionDesc')}
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <Stethoscope className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('page.providerConsultations')}</h3>
              <p className="text-2xl font-bold text-gray-900 mb-1">{t('page.providerCommission')}</p>
              <p className="text-sm text-gray-500">{t('page.providerCommissionDesc')}</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-4">
                <Pill className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('page.pharmacyOtcOrders')}</h3>
              <p className="text-2xl font-bold text-gray-900 mb-1">{t('page.pharmacyCommission')}</p>
              <p className="text-sm text-gray-500">{t('page.pharmacyCommissionDesc')}</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('page.provincialInsurance')}</h3>
              <p className="text-2xl font-bold text-emerald-600 mb-1">{t('page.provincialCommission')}</p>
              <p className="text-sm text-gray-500">{t('page.provincialCommissionDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            {t('page.whyTitle')}
          </h2>
          <p className="text-center text-gray-500 max-w-xl mx-auto mb-12">
            {t('page.whyDesc')}
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((item) => (
              <div key={item.title} className="text-center p-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            {t('page.faqTitle')}
          </h2>
          <PricingFAQ />
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t('page.ctaTitle')}
          </h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">
            {t('page.ctaDesc')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <LocalizedLink
              to="/register"
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
            >
              {t('page.startFreeTrial')}
              <ArrowRight className="w-4 h-4" />
            </LocalizedLink>
            <a
              href="#"
              className="inline-flex items-center gap-2 border-2 border-gray-300 text-gray-700 font-semibold px-8 py-3.5 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <Phone className="w-4 h-4" />
              {t('page.talkToSales')}
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
