import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  DollarSign,
  Users,
  MapPin,
  Star,
  Info,
} from 'lucide-react';
import { proceduresService, Procedure } from '../../../../../services/proceduresService';
import LocalizedLink from '../../../../../components/LocalizedLink';
import Footer from '../../../../../components/frontend/Footer';
import { usePageSeo } from '../../../../../hooks/usePageSeo';
import { absoluteUrl } from '../../../../../lib/seo';

export default function ProcedureDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation('frontend');
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  usePageSeo(
    procedure
      ? {
          title: `${procedure.name} procedure | DoktoChain`,
          description: (procedure.description || `Learn about ${procedure.name}, find qualified providers, and compare typical costs on DoktoChain.`).slice(0, 300),
          robots: 'index,follow',
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'MedicalProcedure',
            name: procedure.name,
            description: procedure.long_description || procedure.description,
            code: procedure.cpt_code
              ? { '@type': 'MedicalCode', codeValue: procedure.cpt_code, codingSystem: 'CPT' }
              : undefined,
            url: absoluteUrl(`/frontend/browse/procedures/${slug}`),
          },
        }
      : null,
    [procedure?.id, slug]
  );

  useEffect(() => {
    getUserLocation();
    if (slug) {
      loadProcedureData();
    }
  }, [slug]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  };

  const loadProcedureData = async () => {
    if (!slug) return;

    setLoading(true);
    try {
      const procedureData = await proceduresService.getProcedureBySlug(slug);

      if (!procedureData) {
        setLoading(false);
        return;
      }

      setProcedure(procedureData);

      const providersData = await proceduresService.getProvidersByProcedure(
        procedureData.id,
        userLocation || undefined
      );

      setProviders(providersData);
    } catch (error) {
      console.error('Error loading procedure data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">{t('procedureDetail.loading')}</p>
        </div>
      </div>
    );
  }

  if (!procedure) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('procedureDetail.notFound')}</h1>
          <LocalizedLink to="/frontend/browse/procedures" className="text-blue-600 hover:text-blue-800">
            {t('procedureDetail.browseAll')}
          </LocalizedLink>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 pt-24 sm:pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{procedure.name}</h1>
              <p className="text-xl text-blue-100 mb-4">{procedure.description}</p>
              {procedure.cpt_code && (
                <span className="inline-block bg-blue-500 text-white px-3 py-1 rounded text-sm">
                  {t('procedureDetail.cptCode')}: {procedure.cpt_code}
                </span>
              )}
            </div>

            {(procedure.typical_cost_min || procedure.typical_cost_max) && (
              <div className="mt-4 md:mt-0 bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">{t('procedureDetail.typicalCost')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${procedure.typical_cost_min?.toFixed(0)} - ${procedure.typical_cost_max?.toFixed(0)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Info className="mr-2 text-blue-600" size={24} />
                {t('procedureDetail.aboutProcedure')}
              </h2>
              <p className="text-gray-700 mb-4">
                {procedure.long_description || procedure.description}
              </p>

              {procedure.what_to_expect && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('procedureDetail.whatToExpect')}</h3>
                  <p className="text-gray-700">{procedure.what_to_expect}</p>
                </div>
              )}
            </div>

            {procedure.preparation_info && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('procedureDetail.preparation')}</h2>
                <p className="text-gray-700">{procedure.preparation_info}</p>
              </div>
            )}

            {procedure.recovery_info && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('procedureDetail.recovery')}</h2>
                <p className="text-gray-700">{procedure.recovery_info}</p>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Users className="mr-2 text-blue-600" size={24} />
                {t('procedureDetail.providersOffering')}
                {userLocation && <span className="text-sm font-normal text-gray-600 ml-2">({t('procedureDetail.sortedByDistance')})</span>}
              </h2>

              {providers.length === 0 ? (
                <p className="text-gray-600">{t('procedureDetail.noProviders')}</p>
              ) : (
                <div className="space-y-4">
                  {providers.map((pp) => {
                    const provider = pp.providers;
                    return (
                      <div key={pp.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {provider.user_profiles?.first_name} {provider.user_profiles?.last_name}
                            </h3>
                            <p className="text-gray-600 text-sm">{provider.professional_title}</p>
                            <p className="text-gray-600 text-sm">{provider.specialty}</p>

                            {pp.distance && (
                              <div className="flex items-center mt-2 text-sm text-gray-600">
                                <MapPin className="mr-1" size={16} />
                                {pp.distance.toFixed(1)} {t('procedureDetail.kmAway')}
                              </div>
                            )}

                            <div className="flex items-center mt-2">
                              <Star className="text-yellow-400 fill-current" size={20} />
                              <span className="ml-1 text-sm text-gray-700">
                                {provider.rating_average?.toFixed(1) || 'N/A'} ({provider.rating_count || 0} {t('procedureDetail.reviews')})
                              </span>
                            </div>

                            {pp.estimated_cost && (
                              <p className="text-sm text-gray-700 mt-2">
                                <span className="font-semibold">{t('procedureDetail.estimatedCost')}:</span> ${pp.estimated_cost.toFixed(2)}
                              </p>
                            )}
                          </div>

                          <LocalizedLink
                            to={`/frontend/provider-profile/${provider.id}`}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 ml-4"
                          >
                            {t('procedureDetail.bookNow')}
                          </LocalizedLink>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('procedureDetail.details')}</h3>

              <div className="space-y-4">
                {procedure.average_duration_minutes && (
                  <div className="flex items-start">
                    <Clock className="text-gray-400 mr-3 mt-0.5" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('procedureDetail.averageDuration')}</p>
                      <p className="text-sm text-gray-600">{procedure.average_duration_minutes} {t('procedureDetail.minutes')}</p>
                    </div>
                  </div>
                )}

                {(procedure.typical_cost_min || procedure.typical_cost_max) && (
                  <div className="flex items-start">
                    <DollarSign className="text-gray-400 mr-3 mt-0.5" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('procedureDetail.costRange')}</p>
                      <p className="text-sm text-gray-600">
                        ${procedure.typical_cost_min?.toFixed(0)} - ${procedure.typical_cost_max?.toFixed(0)}
                      </p>
                    </div>
                  </div>
                )}

                {procedure.category && (
                  <div className="flex items-start">
                    <Info className="text-gray-400 mr-3 mt-0.5" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('procedureDetail.category')}</p>
                      <p className="text-sm text-gray-600">{procedure.category}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <LocalizedLink
                  to="/frontend/find-providers"
                  className="block w-full bg-blue-600 text-white text-center px-4 py-3 rounded-lg hover:bg-blue-700 font-medium"
                >
                  {t('procedureDetail.findMoreProviders')}
                </LocalizedLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
