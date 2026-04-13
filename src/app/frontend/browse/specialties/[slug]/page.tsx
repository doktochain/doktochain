import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Users,
  ShieldCheck,
  Calendar,
  Star,
} from 'lucide-react';
import { specialtiesService, Specialty } from '../../../../../services/specialtiesService';
import LocalizedLink from '../../../../../components/LocalizedLink';
import Footer from '../../../../../components/frontend/Footer';

export default function SpecialtyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation('frontend');
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [insurances, setInsurances] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'providers' | 'locations' | 'insurance' | 'faq'>('providers');

  useEffect(() => {
    if (slug) {
      loadSpecialtyData();
    }
  }, [slug]);

  const loadSpecialtyData = async () => {
    if (!slug) return;

    setLoading(true);
    try {
      const specialtyData = await specialtiesService.getSpecialtyBySlug(slug);

      if (!specialtyData) {
        setLoading(false);
        return;
      }

      setSpecialty(specialtyData);

      const [providersData, locationsData, insurancesData] = await Promise.all([
        specialtiesService.getProvidersBySpecialty(specialtyData.name),
        specialtiesService.getLocationsBySpecialty(specialtyData.name),
        specialtiesService.getInsurancesBySpecialty(specialtyData.name),
      ]);

      setProviders(providersData);
      setLocations(locationsData);
      setInsurances(insurancesData);
    } catch (error) {
      console.error('Error loading specialty data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">{t('specialtyDetail.loading')}</p>
        </div>
      </div>
    );
  }

  if (!specialty) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('specialtyDetail.notFound')}</h1>
          <LocalizedLink to="/frontend/browse/specialties" className="text-blue-600 hover:text-blue-800">
            {t('specialtyDetail.browseAll')}
          </LocalizedLink>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 pt-24 sm:pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-4">
            <span className="text-6xl mr-4">{specialty.icon || '🏥'}</span>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{specialty.name}</h1>
              <p className="text-xl text-blue-100">{specialty.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('specialtyDetail.about', { name: specialty.name })}</h2>
          <p className="text-gray-700 mb-4">
            {specialty.long_description || specialty.description}
          </p>

          {specialty.common_conditions && specialty.common_conditions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('specialtyDetail.commonConditions')}</h3>
              <div className="flex flex-wrap gap-2">
                {specialty.common_conditions.map((condition, index) => (
                  <span
                    key={index}
                    className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
                  >
                    {condition}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('providers')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'providers'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="inline mr-2" size={20} />
                {t('specialtyDetail.tabProviders', { count: providers.length })}
              </button>
              <button
                onClick={() => setActiveTab('locations')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'locations'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MapPin className="inline mr-2" size={20} />
                {t('specialtyDetail.tabLocations', { count: locations.length })}
              </button>
              <button
                onClick={() => setActiveTab('insurance')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'insurance'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ShieldCheck className="inline mr-2" size={20} />
                {t('specialtyDetail.tabInsurance', { count: insurances.length })}
              </button>
              <button
                onClick={() => setActiveTab('faq')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'faq'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('specialtyDetail.tabFaq')}
              </button>
            </nav>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'providers' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('specialtyDetail.availableProviders')}</h2>
              {providers.length === 0 ? (
                <p className="text-gray-600">{t('specialtyDetail.noProviders')}</p>
              ) : (
                <div className="space-y-4">
                  {providers.map((provider) => (
                    <div key={provider.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {provider.user_profiles?.first_name} {provider.user_profiles?.last_name}
                          </h3>
                          <p className="text-gray-600">{provider.professional_title}</p>
                          <div className="flex items-center mt-2">
                            <Star className="text-yellow-400 fill-current" size={20} />
                            <span className="ml-1 text-sm text-gray-700">
                              {provider.rating_average?.toFixed(1) || 'N/A'} ({provider.rating_count || 0} {t('specialtyDetail.reviews')})
                            </span>
                          </div>
                        </div>
                        <LocalizedLink
                          to={`/frontend/provider-profile/${provider.id}`}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                          {t('specialtyDetail.viewProfile')}
                        </LocalizedLink>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'locations' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('specialtyDetail.practiceLocations')}</h2>
              {locations.length === 0 ? (
                <p className="text-gray-600">{t('specialtyDetail.noLocations')}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {locations.map((location) => (
                    <div key={location.id} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{location.location_name}</h3>
                      <p className="text-gray-600 text-sm">{location.address_line1}</p>
                      {location.address_line2 && <p className="text-gray-600 text-sm">{location.address_line2}</p>}
                      <p className="text-gray-600 text-sm">
                        {location.city}, {location.province} {location.postal_code}
                      </p>
                      {location.phone && <p className="text-gray-600 text-sm mt-2">{location.phone}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'insurance' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('specialtyDetail.acceptedInsurance')}</h2>
              {insurances.length === 0 ? (
                <p className="text-gray-600">{t('specialtyDetail.noInsurance')}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {insurances.map((insurance, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 text-center">
                      <ShieldCheck className="text-blue-600 mx-auto mb-2" size={32} />
                      <p className="font-semibold text-gray-900">{insurance}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'faq' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('specialtyDetail.faqTitle')}</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {t('specialtyDetail.faqQ1', { name: specialty.name })}
                  </h3>
                  <p className="text-gray-700">
                    {t('specialtyDetail.faqA1', { name: specialty.name, conditions: specialty.common_conditions?.slice(0, 3).join(', ') || '' })}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {t('specialtyDetail.faqQ2', { name: specialty.name })}
                  </h3>
                  <p className="text-gray-700">
                    {t('specialtyDetail.faqA2')}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {t('specialtyDetail.faqQ3')}
                  </h3>
                  <p className="text-gray-700">
                    {t('specialtyDetail.faqA3')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
