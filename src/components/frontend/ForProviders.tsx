import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Bell, Video, DollarSign, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ForProviders() {
  const { t } = useTranslation('frontend');

  const providerBenefits = [
    {
      icon: TrendingUp,
      title: t('forProviders.benefit1Title'),
      description: t('forProviders.benefit1Desc'),
      image: '📈'
    },
    {
      icon: Calendar,
      title: t('forProviders.benefit2Title'),
      description: t('forProviders.benefit2Desc'),
      image: '🗓️'
    },
    {
      icon: Bell,
      title: t('forProviders.benefit3Title'),
      description: t('forProviders.benefit3Desc'),
      image: '🔔'
    },
    {
      icon: Video,
      title: t('forProviders.benefit4Title'),
      description: t('forProviders.benefit4Desc'),
      image: '🎥'
    },
    {
      icon: DollarSign,
      title: t('forProviders.benefit5Title'),
      description: t('forProviders.benefit5Desc'),
      image: '💰'
    },
    {
      icon: MessageSquare,
      title: t('forProviders.benefit6Title'),
      description: t('forProviders.benefit6Desc'),
      image: '💬'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-16">
          <span className="text-green-600 font-semibold text-sm uppercase tracking-wide">{t('forProviders.label')}</span>
          <h2 className="text-4xl font-bold text-gray-900 mb-4 mt-2">{t('forProviders.heading')}</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('forProviders.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {providerBenefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              <div className="text-5xl mb-4">{benefit.image}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
              <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-12 shadow-xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="text-white">
              <h3 className="text-3xl font-bold mb-4">{t('forProviders.ctaTitle')}</h3>
              <p className="text-xl mb-6 text-green-100">
                {t('forProviders.ctaDesc')}
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <svg className="w-6 h-6 mr-3 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('forProviders.noSetupFees')}</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-6 h-6 mr-3 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('forProviders.freeTraining')}</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-6 h-6 mr-3 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('forProviders.support247')}</span>
                </li>
              </ul>
            </div>
            <div className="text-center lg:text-right">
              <button className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors duration-300 shadow-lg inline-block">
                {t('forProviders.joinButton')}
              </button>
              <p className="text-green-100 mt-4 text-sm">{t('forProviders.alreadyMember')} <a href="#" className="underline hover:text-white">{t('forProviders.signInHere')}</a></p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
