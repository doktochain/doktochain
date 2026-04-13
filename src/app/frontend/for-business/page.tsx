import { useTranslation } from 'react-i18next';
import { Building2, Package, FileText, Users, TrendingUp, Shield, Clock, ArrowRight, CheckCircle2, CreditCard } from 'lucide-react';
import LocalizedLink from '../../../components/LocalizedLink';
import Footer from '../../../components/frontend/Footer';

export default function ForBusinessPage() {
  const { t } = useTranslation('frontend');

  const pharmacyFeatures = [
    { icon: FileText, title: t('forBusiness.pharm1Title'), description: t('forBusiness.pharm1Desc') },
    { icon: Package, title: t('forBusiness.pharm2Title'), description: t('forBusiness.pharm2Desc') },
    { icon: Users, title: t('forBusiness.pharm3Title'), description: t('forBusiness.pharm3Desc') },
    { icon: TrendingUp, title: t('forBusiness.pharm4Title'), description: t('forBusiness.pharm4Desc') },
  ];

  const clinicFeatures = [
    { icon: Users, title: t('forBusiness.clinic1Title'), description: t('forBusiness.clinic1Desc') },
    { icon: Clock, title: t('forBusiness.clinic2Title'), description: t('forBusiness.clinic2Desc') },
    { icon: FileText, title: t('forBusiness.clinic3Title'), description: t('forBusiness.clinic3Desc') },
    { icon: Shield, title: t('forBusiness.clinic4Title'), description: t('forBusiness.clinic4Desc') },
  ];

  return (
    <div className="min-h-screen bg-white pt-16">
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-40 w-80 h-80 bg-emerald-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-20 w-96 h-96 bg-sky-400 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-1.5 mb-6">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">{t('forBusiness.badge')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold text-white leading-tight mb-6">
              {t('forBusiness.heroTitle')}
            </h1>
            <p className="text-lg text-white max-w-2xl mb-8 leading-relaxed">
              {t('forBusiness.heroDesc')}
            </p>

            <div className="flex flex-wrap gap-4">
              <LocalizedLink
                to="/register?role=pharmacy"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
              >
                {t('forBusiness.registerBusiness')}
                <ArrowRight className="w-4 h-4" />
              </LocalizedLink>
              <LocalizedLink
                to="/pricing"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3 rounded-lg transition-colors border border-white/20"
              >
                <CreditCard className="w-4 h-4" />
                {t('forBusiness.viewPricing')}
              </LocalizedLink>
              <LocalizedLink
                to="/portal/login"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3 rounded-lg transition-colors border border-white/20"
              >
                {t('forBusiness.signInPortal')}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('forBusiness.pharmaciesTitle')}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              {t('forBusiness.pharmaciesSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pharmacyFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-emerald-200 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                    <Icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('forBusiness.clinicsTitle')}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              {t('forBusiness.clinicsSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {clinicFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-sky-200 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center mb-4 group-hover:bg-sky-100 transition-colors">
                    <Icon className="w-5 h-5 text-sky-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="bg-gradient-to-br from-blue-700 to-blue-800 rounded-2xl p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">{t('forBusiness.ctaTitle')}</h2>
            <p className="text-white mb-8 max-w-xl mx-auto">
              {t('forBusiness.ctaDesc')}
            </p>

            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {[
                { key: 'freeOnboarding', label: t('forBusiness.freeOnboarding') },
                { key: 'noSetupFees', label: t('forBusiness.noSetupFees') },
                { key: 'cancelAnytime', label: t('forBusiness.cancelAnytime') },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-white">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <LocalizedLink
                to="/register?role=pharmacy"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                {t('forBusiness.registerPharmacy')}
              </LocalizedLink>
              <LocalizedLink
                to="/register?role=clinic"
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                {t('forBusiness.registerClinic')}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
