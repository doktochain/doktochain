import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Calendar, X, Stethoscope } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { providerReviewService, ReviewStats } from '../../services/providerReviewService';
import { usePageSeo } from '../../hooks/usePageSeo';
import { absoluteUrl } from '../../lib/seo';
import ComprehensiveBookingWizard from '../booking/ComprehensiveBookingWizard';
import ProviderReviews from './ProviderReviews';
import ProviderProfileHeader from './ProviderProfileHeader';
import ProviderAboutTab from './ProviderAboutTab';
import ProviderLocationsTab from './ProviderLocationsTab';
import ProviderServicesTab from './ProviderServicesTab';

type ActiveTab = 'about' | 'locations' | 'services' | 'reviews';

const TABS: { key: ActiveTab; label: string }[] = [
  { key: 'about', label: 'About' },
  { key: 'locations', label: 'Locations' },
  { key: 'services', label: 'Services & Pricing' },
  { key: 'reviews', label: 'Reviews' },
];

export default function EnhancedProviderProfile() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const showBooking = searchParams.get('book') === 'true';

  const [provider, setProvider] = useState<any>(null);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [insuranceAccepted, setInsuranceAccepted] = useState<any[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('about');
  const [showBookingModal, setShowBookingModal] = useState(showBooking);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) loadProviderDetails(slug);
  }, [slug]);

  const providerName = provider?.user_profiles
    ? `${provider.user_profiles.first_name ?? ''} ${provider.user_profiles.last_name ?? ''}`.trim()
    : '';
  const providerTitle = provider?.professional_title || 'Healthcare provider';
  const primarySpecialty = specialties?.[0]?.specialties_master?.name || provider?.specialty || '';

  usePageSeo(
    provider
      ? {
          title: `${providerName || providerTitle} | ${primarySpecialty || 'DoktoChain provider'} | DoktoChain`,
          description: `Book appointments with ${providerName || providerTitle}${primarySpecialty ? ` (${primarySpecialty})` : ''} on DoktoChain. View credentials, locations, services, and reviews.`.slice(0, 300),
          robots: 'index,follow',
          image: provider.user_profiles?.profile_photo_url || undefined,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Physician',
            name: providerName || providerTitle,
            image: provider.user_profiles?.profile_photo_url,
            medicalSpecialty: primarySpecialty || undefined,
            url: absoluteUrl(`/frontend/provider-profile/${slug}`),
            aggregateRating:
              reviewStats && reviewStats.totalReviews > 0
                ? {
                    '@type': 'AggregateRating',
                    ratingValue: reviewStats.averageRating,
                    reviewCount: reviewStats.totalReviews,
                  }
                : undefined,
          },
        }
      : null,
    [provider?.id, providerName, primarySpecialty, reviewStats?.totalReviews]
  );

  const loadProviderDetails = async (providerId: string) => {
    try {
      setLoading(true);

      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select(`*, user_profiles!inner(first_name, last_name, profile_photo_url, phone, gender)`)
        .eq('id', providerId)
        .maybeSingle();

      if (providerError) throw providerError;
      if (!providerData) { setLoading(false); return; }
      setProvider(providerData);

      const [credRes, locRes, servRes, langRes, specRes, procRes, insRes, timeRes] = await Promise.all([
        supabase.from('provider_credentials').select('*').eq('provider_id', providerId).order('issue_date', { ascending: false }),
        supabase.from('provider_locations').select('*').eq('provider_id', providerId).order('is_primary', { ascending: false }),
        supabase.from('provider_services').select('*').eq('provider_id', providerId),
        supabase.from('provider_languages').select('*').eq('provider_id', providerId),
        supabase.from('provider_specialties').select('*, specialties_master(name)').eq('provider_id', providerId),
        supabase.from('provider_procedures').select('*').eq('provider_id', providerId),
        supabase.from('provider_insurance_plans').select('*, insurance_providers_master(id, name, provider_type)').eq('provider_id', providerId),
        supabase.from('provider_time_blocks').select('*').eq('provider_id', providerId).eq('block_type', 'available').order('day_of_week').order('start_time'),
      ]);

      setCredentials(credRes.data || []);
      setLocations(locRes.data || []);
      setServices(servRes.data || []);
      setLanguages(langRes.data || []);
      setSpecialties(specRes.data || []);
      setProcedures(procRes.data || []);
      setInsuranceAccepted(insRes.data || []);
      setTimeBlocks(timeRes.data || []);

      try {
        const stats = await providerReviewService.getReviewStats(providerId);
        setReviewStats(stats);
      } catch {
        setReviewStats(null);
      }
    } catch (error) {
      console.error('Error loading provider:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Stethoscope className="w-16 h-16 text-gray-300" />
        <p className="text-gray-600 text-lg">Provider not found</p>
      </div>
    );
  }

  const primaryLocation = locations.find((l) => l.is_primary) || locations[0];
  const hasVirtualVisits = locations.some((l) => l.accepts_virtual);
  const profile = provider.user_profiles;
  const photoUrl = provider.professional_photo_url || profile?.profile_photo_url;

  return (
    <div className="min-h-screen bg-gray-50">
      <ProviderProfileHeader
        provider={provider}
        profile={profile}
        photoUrl={photoUrl}
        primaryLocation={primaryLocation}
        hasVirtualVisits={hasVirtualVisits}
        reviewStats={reviewStats}
        onBook={() => setShowBookingModal(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-4 font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'about' && (
              <ProviderAboutTab
                provider={provider}
                specialties={specialties}
                credentials={credentials}
                languages={languages}
                procedures={procedures}
                insuranceAccepted={insuranceAccepted}
                timeBlocks={timeBlocks}
                hasVirtualVisits={hasVirtualVisits}
              />
            )}
            {activeTab === 'locations' && (
              <ProviderLocationsTab locations={locations} timeBlocks={timeBlocks} />
            )}
            {activeTab === 'services' && <ProviderServicesTab services={services} />}
            {activeTab === 'reviews' && (
              <ProviderReviews providerId={provider.id} reviewStats={reviewStats} />
            )}
          </div>
        </div>

        <div className="sticky bottom-4 bg-white rounded-xl shadow-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Ready to book with {provider.professional_title || 'Dr.'} {profile?.last_name}?
              </p>
              {provider.consultation_fee_cents > 0 && (
                <p className="text-xs text-gray-500">
                  Starting at ${(provider.consultation_fee_cents / 100).toFixed(2)}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowBookingModal(true)}
              className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-semibold flex items-center gap-2 transition-all"
            >
              <Calendar className="w-5 h-5" />
              Book Appointment
            </button>
          </div>
        </div>
      </div>

      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 py-8">
            <div className="relative bg-white rounded-xl max-w-5xl mx-auto shadow-2xl">
              <button
                onClick={() => setShowBookingModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
              <ComprehensiveBookingWizard
                providerId={provider.id}
                onComplete={() => setShowBookingModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
