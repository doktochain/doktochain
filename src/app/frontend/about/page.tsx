import { useTranslation } from 'react-i18next';
import Brands from '../../../components/frontend/Brands';
import ForPatients from '../../../components/frontend/ForPatients';
import ForProviders from '../../../components/frontend/ForProviders';
import Footer from '../../../components/frontend/Footer';
import Searchbar from '../../../components/frontend/Searchbar';
import ScrollingText from '../../../components/frontend/ScrollingText';

export default function AboutPage() {
  const { t } = useTranslation('frontend');

  return (
    <div className="min-h-screen bg-gray-50 mt-10">
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            {t('about.welcomeTitle')}
          </h1>
          <p className="text-2xl text-blue-100 mb-4">
            {t('about.welcomeSubtitle')}
          </p>
          <p className="text-lg text-blue-200 max-w-3xl mx-auto mb-8">
            {t('about.welcomeDesc')}
          </p>

          <div className="mt-8">
            <Searchbar />
          </div>

          <div className="relative overflow-hidden py-6 mb-4">
            <ScrollingText />
          </div>
        </div>
      </div>

      <section id="brands" className="py-16">
        <Brands />
      </section>

      <section id="for-patients" className="py-16 bg-white">
        <ForPatients />
      </section>

      <section id="for-providers" className="py-16 bg-gray-50">
        <ForProviders />
      </section>

      <Footer />
    </div>
  );
}
