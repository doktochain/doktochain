import { motion } from 'framer-motion';
import { Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Newsletter() {
  const { t } = useTranslation('frontend');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => {
        setSubscribed(false);
        setEmail('');
      }, 3000);
    }
  };

  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600">
      <div className="max-w-4xl mx-auto px-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="inline-block bg-white/10 backdrop-blur-sm p-4 rounded-full mb-6">
            <Mail className="w-12 h-12 text-white" />
          </div>

          <h2 className="text-4xl font-bold text-white mb-4">{t('newsletter.title')}</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {t('newsletter.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsletter.placeholder')}
                required
                className="flex-1 px-6 py-4 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                disabled={subscribed}
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subscribed ? (
                  <>
                    <span>{t('newsletter.subscribed')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('newsletter.subscribe')}</span>
                    <Send className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="text-sm text-blue-100 mt-6">
            {t('newsletter.privacy')}
          </p>

          <div className="mt-8 flex items-center justify-center space-x-8 text-white">
            <div>
              <div className="text-3xl font-bold">20K+</div>
              <div className="text-sm text-blue-100">{t('newsletter.subscribers')}</div>
            </div>
            <div className="h-12 w-px bg-white/30"></div>
            <div>
              <div className="text-3xl font-bold">{t('newsletter.weeklyLabel')}</div>
              <div className="text-sm text-blue-100">{t('newsletter.healthTips')}</div>
            </div>
            <div className="h-12 w-px bg-white/30"></div>
            <div>
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-blue-100">{t('newsletter.free')}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
