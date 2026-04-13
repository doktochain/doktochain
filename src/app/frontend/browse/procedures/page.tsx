import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter } from 'lucide-react';
import { proceduresService, Procedure } from '../../../../services/proceduresService';
import LocalizedLink from '../../../../components/LocalizedLink';
import Footer from '../../../../components/frontend/Footer';

export default function ProceduresPage() {
  const { t } = useTranslation('frontend');
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadProcedures();
  }, []);

  const loadProcedures = async () => {
    setLoading(true);
    try {
      const data = await proceduresService.getAllProcedures();
      setProcedures(data);
    } catch (error) {
      console.error('Error loading procedures:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(procedures.map(p => p.category).filter(Boolean)));

  const filteredProcedures = procedures.filter((procedure) => {
    const matchesSearch =
      procedure.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      procedure.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      procedure.cpt_code?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || procedure.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 pt-24 sm:pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4 text-center">
            {t('browseProcedures.title')}
          </h1>
          <p className="text-xl text-blue-100 mb-8 text-center">
            {t('browseProcedures.subtitle')}
          </p>

          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={t('browseProcedures.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-lg border-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Filter size={20} className="mr-2" />
                {t('browseProcedures.filterByCategory')}
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3 py-2 rounded ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t('browseProcedures.allProcedures')}
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category || '')}
                    className={`w-full text-left px-3 py-2 rounded ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">{t('browseProcedures.loading')}</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {filteredProcedures.length === 1 ? t('browseProcedures.availableSingular', { count: filteredProcedures.length }) : t('browseProcedures.available', { count: filteredProcedures.length })}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredProcedures.map((procedure) => (
                    <LocalizedLink
                      key={procedure.id}
                      to={`/frontend/browse/procedures/${procedure.slug}`}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-semibold text-gray-900 flex-1">
                          {procedure.name}
                        </h3>
                        {procedure.cpt_code && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded ml-2">
                            {procedure.cpt_code}
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-4">{procedure.description}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {procedure.category && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {procedure.category}
                          </span>
                        )}
                        {procedure.average_duration_minutes && (
                          <span className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded">
                            {procedure.average_duration_minutes} min
                          </span>
                        )}
                      </div>

                      {(procedure.typical_cost_min || procedure.typical_cost_max) && (
                        <div className="text-sm text-gray-700">
                          <span className="font-semibold">{t('browseProcedures.typicalCost')}:</span> $
                          {Number(procedure.typical_cost_min)?.toFixed(0)} - $
{Number(procedure.typical_cost_max)?.toFixed(0)}
                        </div>
                      )}
                    </LocalizedLink>
                  ))}
                </div>

                {filteredProcedures.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-600">{t('browseProcedures.noResults')}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
