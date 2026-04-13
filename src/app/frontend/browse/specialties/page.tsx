import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { specialtiesService, Specialty } from '../../../../services/specialtiesService';
import LocalizedLink from '../../../../components/LocalizedLink';
import Footer from '../../../../components/frontend/Footer';

export default function SpecialtiesPage() {
  const { t } = useTranslation('frontend');
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSpecialties();
  }, []);

  const loadSpecialties = async () => {
    setLoading(true);
    try {
      const data = await specialtiesService.getAllSpecialties();
      setSpecialties(data);
    } catch (error) {
      console.error('Error loading specialties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSpecialties = specialties.filter((specialty) =>
    specialty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    specialty.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 pt-24 sm:pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4 text-center">
            {t('browseSpecialties.title')}
          </h1>
          <p className="text-xl text-blue-100 mb-8 text-center">
            {t('browseSpecialties.subtitle')}
          </p>

          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={t('browseSpecialties.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-lg border-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">{t('browseSpecialties.loading')}</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {filteredSpecialties.length === 1 ? t('browseSpecialties.availableSingular', { count: filteredSpecialties.length }) : t('browseSpecialties.available', { count: filteredSpecialties.length })}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpecialties.map((specialty) => (
                <LocalizedLink
                  key={specialty.id}
                  to={`/frontend/browse/specialties/${specialty.slug}`}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
                >
                  <div className="flex items-start">
                    <div className="text-4xl mr-4">{specialty.icon || '🏥'}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {specialty.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        {specialty.description}
                      </p>
                      {specialty.common_conditions && specialty.common_conditions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {specialty.common_conditions.slice(0, 3).map((condition, index) => (
                            <span
                              key={index}
                              className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                            >
                              {condition}
                            </span>
                          ))}
                          {specialty.common_conditions.length > 3 && (
                            <span className="text-xs text-gray-500">
                              {t('browseSpecialties.more', { count: specialty.common_conditions.length - 3 })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </LocalizedLink>
              ))}
            </div>

            {filteredSpecialties.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">{t('browseSpecialties.noResults')}</p>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
