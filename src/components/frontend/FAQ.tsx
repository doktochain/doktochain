import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

export default function FAQ() {
  const { t } = useTranslation('frontend');

  const faqs = [
    {
      key: 'general',
      category: t('faq.catGeneral'),
      questions: [
        { q: t('faq.generalQ1'), a: t('faq.generalA1') },
        { q: t('faq.generalQ2'), a: t('faq.generalA2') },
        { q: t('faq.generalQ3'), a: t('faq.generalA3') },
      ]
    },
    {
      key: 'booking',
      category: t('faq.catBooking'),
      questions: [
        { q: t('faq.bookingQ1'), a: t('faq.bookingA1') },
        { q: t('faq.bookingQ2'), a: t('faq.bookingA2') },
        { q: t('faq.bookingQ3'), a: t('faq.bookingA3') },
      ]
    },
    {
      key: 'insurance',
      category: t('faq.catInsurance'),
      questions: [
        { q: t('faq.insuranceQ1'), a: t('faq.insuranceA1') },
        { q: t('faq.insuranceQ2'), a: t('faq.insuranceA2') },
      ]
    },
    {
      key: 'telemedicine',
      category: t('faq.catTelemedicine'),
      questions: [
        { q: t('faq.telemedQ1'), a: t('faq.telemedA1') },
        { q: t('faq.telemedQ2'), a: t('faq.telemedA2') },
        { q: t('faq.telemedQ3'), a: t('faq.telemedA3') },
      ]
    },
  ];

  const [activeCategory, setActiveCategory] = useState('general');
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);

  const activeFAQs = faqs.find(f => f.key === activeCategory)?.questions || [];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-16">
          <div className="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-full mb-4">
            <HelpCircle className="w-5 h-5 inline mr-2" />
            <span className="font-semibold">FAQ</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('faq.title')}</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('faq.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-4 shadow-md sticky top-8">
              <h3 className="font-semibold text-gray-900 mb-4">{t('faq.categories')}</h3>
              <div className="space-y-2">
                {faqs.map((faq) => (
                  <button
                    key={faq.key}
                    onClick={() => {
                      setActiveCategory(faq.key);
                      setOpenQuestion(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 ${
                      activeCategory === faq.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {faq.category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="space-y-4">
              {activeFAQs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white rounded-xl shadow-md overflow-hidden"
                >
                  <button
                    onClick={() => setOpenQuestion(openQuestion === index ? null : index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors duration-200"
                  >
                    <span className="font-semibold text-gray-900 pr-8">{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-300 ${
                        openQuestion === index ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {openQuestion === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 bg-blue-50 rounded-xl p-8 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('faq.stillHaveQuestions')}</h3>
              <p className="text-gray-600 mb-6">{t('faq.supportTeamHelp')}</p>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300">
                {t('faq.contactSupport')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
