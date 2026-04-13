import { useTranslation } from 'react-i18next';
import ForProviders from '../../../components/frontend/ForProviders';
import Footer from '../../../components/frontend/Footer';

export default function ForProvidersPage() {
  const { t } = useTranslation('frontend');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            {t('forProviders.pageTitle')}
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            {t('forProviders.pageSubtitle')}
          </p>
        </div>
      </div>

      <ForProviders />
      <Footer />
    </div>
  );
}
