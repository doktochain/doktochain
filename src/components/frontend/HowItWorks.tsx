import { motion } from 'framer-motion';
import { Search, Users, Calendar, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function HowItWorks() {
  const { t } = useTranslation('frontend');

  const steps = [
    {
      icon: Search,
      title: t('howItWorks.step1Title'),
      description: t('howItWorks.step1Desc'),
      time: t('howItWorks.step1Time'),
      color: 'bg-blue-500'
    },
    {
      icon: Users,
      title: t('howItWorks.step2Title'),
      description: t('howItWorks.step2Desc'),
      time: t('howItWorks.step2Time'),
      color: 'bg-green-500'
    },
    {
      icon: Calendar,
      title: t('howItWorks.step3Title'),
      description: t('howItWorks.step3Desc'),
      time: t('howItWorks.step3Time'),
      color: 'bg-teal-500'
    },
    {
      icon: Video,
      title: t('howItWorks.step4Title'),
      description: t('howItWorks.step4Desc'),
      time: t('howItWorks.step4Time'),
      color: 'bg-orange-500'
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('howItWorks.title')}</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                <div className={`${step.color} w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto`}>
                  <step.icon className="w-8 h-8 text-white" />
                </div>

                <div className="absolute top-4 right-4 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
                  {step.time}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">{step.title}</h3>
                <p className="text-gray-600 text-center leading-relaxed">{step.description}</p>
              </div>

              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden shadow-lg group"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src="/image/appointment.png"
                alt="Book appointments easily"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h4 className="font-bold text-lg">{t('howItWorks.inPersonVisits')}</h4>
                <p className="text-sm text-white/80">{t('howItWorks.inPersonDesc')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden shadow-lg group"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src="/image/telehealth.png"
                alt="Virtual healthcare consultations"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h4 className="font-bold text-lg">{t('howItWorks.telehealth')}</h4>
                <p className="text-sm text-white/80">{t('howItWorks.telehealthDesc')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden shadow-lg group"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src="/image/pharmacy.png"
                alt="Pharmacy services"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h4 className="font-bold text-lg">{t('howItWorks.pharmacy')}</h4>
                <p className="text-sm text-white/80">{t('howItWorks.pharmacyDesc')}</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-6">{t('howItWorks.readyToStart')}</p>
          <button className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors duration-300 shadow-lg hover:shadow-xl">
            {t('howItWorks.findDoctorNow')}
          </button>
        </div>
      </div>
    </section>
  );
}
