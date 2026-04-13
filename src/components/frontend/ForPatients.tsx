import { motion } from 'framer-motion';
import { Search, Calendar, FileText, Video, Activity, Smartphone } from 'lucide-react';
import LocalizedLink from '../LocalizedLink';
import { useTranslation } from 'react-i18next';

export default function ForPatients() {
  const { t } = useTranslation('frontend');

  const patientBenefits = [
    {
      icon: Search,
      title: t('forPatients.benefit1Title'),
      description: t('forPatients.benefit1Desc'),
      image: '🔍'
    },
    {
      icon: Calendar,
      title: t('forPatients.benefit2Title'),
      description: t('forPatients.benefit2Desc'),
      image: '📅'
    },
    {
      icon: FileText,
      title: t('forPatients.benefit3Title'),
      description: t('forPatients.benefit3Desc'),
      image: '📋'
    },
    {
      icon: Video,
      title: t('forPatients.benefit4Title'),
      description: t('forPatients.benefit4Desc'),
      image: '💻'
    },
    {
      icon: Activity,
      title: t('forPatients.benefit5Title'),
      description: t('forPatients.benefit5Desc'),
      image: '📊'
    },
    {
      icon: Smartphone,
      title: t('forPatients.benefit6Title'),
      description: t('forPatients.benefit6Desc'),
      image: '💊'
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-16">
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wide">{t('forPatients.label')}</span>
          <h2 className="text-4xl font-bold text-gray-900 mb-4 mt-2">{t('forPatients.heading')}</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('forPatients.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {patientBenefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-blue-100"
            >
              <div className="text-5xl mb-4">{benefit.image}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
              <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
            </motion.div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-center text-white shadow-xl">
          <h3 className="text-3xl font-bold mb-4">{t('forPatients.ctaTitle')}</h3>
          <p className="text-xl mb-8 text-blue-100">{t('forPatients.ctaDesc')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LocalizedLink to="/frontend/find-providers" className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors duration-300 shadow-lg">
              {t('forPatients.findDoctor')}
            </LocalizedLink>
            <button className="bg-blue-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-400 transition-colors duration-300 border-2 border-white">
              {t('forPatients.downloadApp')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
