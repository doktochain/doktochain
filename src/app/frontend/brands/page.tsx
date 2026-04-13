import { useTranslation } from 'react-i18next';
import Brands from '../../../components/frontend/Brands';
import Footer from '../../../components/frontend/Footer';

export default function BrandsPage() {
  const { t } = useTranslation('frontend');
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            {t('brandsPage.title')}
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            {t('brandsPage.subtitle')}
          </p>
        </div>
      </div>

      <Brands />
      <Footer />
    </div>
  );
}
