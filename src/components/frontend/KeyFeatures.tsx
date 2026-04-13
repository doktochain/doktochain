import { motion } from 'framer-motion';
import { Shield, Clock, Star, Video, FolderLock, Pill } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function KeyFeatures() {
  const { t } = useTranslation('frontend');

  const features = [
    {
      icon: Shield,
      title: t('keyFeatures.feat1Title'),
      description: t('keyFeatures.feat1Desc'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Clock,
      title: t('keyFeatures.feat2Title'),
      description: t('keyFeatures.feat2Desc'),
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: Star,
      title: t('keyFeatures.feat3Title'),
      description: t('keyFeatures.feat3Desc'),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      icon: Video,
      title: t('keyFeatures.feat4Title'),
      description: t('keyFeatures.feat4Desc'),
      color: 'text-teal-600',
      bgColor: 'bg-teal-50'
    },
    {
      icon: FolderLock,
      title: t('keyFeatures.feat5Title'),
      description: t('keyFeatures.feat5Desc'),
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      icon: Pill,
      title: t('keyFeatures.feat6Title'),
      description: t('keyFeatures.feat6Desc'),
      color: 'text-teal-600',
      bgColor: 'bg-teal-50'
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('keyFeatures.heading')}</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('keyFeatures.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300"
            >
              <div className={`${feature.bgColor} w-16 h-16 rounded-full flex items-center justify-center mb-6`}>
                <feature.icon className={`w-8 h-8 ${feature.color}`} />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
