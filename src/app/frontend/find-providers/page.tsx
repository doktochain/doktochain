import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, SlidersHorizontal, ChevronDown, X, Map as MapIcon, List, MapPin,
} from 'lucide-react';
import {
  enhancedProviderSearchService,
  ProviderSearchFilters,
  ProviderSearchResult,
} from '../../../services/enhancedProviderSearchService';
import Searchbar from '../../../components/frontend/Searchbar';
import ProviderRow from '../../../components/providers/ProviderRow';
import BookingPopupModal from '../../../components/providers/BookingPopupModal';
import type { SearchResult, InsuranceProvider, LocationCoordinates } from '../../../services/unifiedSearchService';
import Footer from '../../../components/frontend/Footer';

export default function FindProvidersPage() {
  const { t } = useTranslation('frontend');
  const [searchParams, setSearchParams] = useSearchParams();

  const AVAILABILITY_OPTIONS = [
    { value: '', label: t('findProviders.anyTime') },
    { value: 'today', label: t('findProviders.today') },
    { value: 'tomorrow', label: t('findProviders.tomorrow') },
    { value: 'this_week', label: t('findProviders.thisWeek') },
    { value: 'next_week', label: t('findProviders.nextWeek') },
  ];
  const VISIT_TYPE_OPTIONS = [
    { value: 'both', label: t('findProviders.allVisitTypes') },
    { value: 'virtual', label: t('findProviders.telehealthVisit') },
    { value: 'in_person', label: t('findProviders.inPerson') },
  ];

  const [providers, setProviders] = useState<ProviderSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [cityQuery, setCityQuery] = useState(searchParams.get('city') || '');

  const [filters, setFilters] = useState<ProviderSearchFilters>({
    consultationType: 'both',
    acceptingNewPatients: false,
    specialty: searchParams.get('type') === 'specialty' ? (searchParams.get('q') || '') : '',
    city: searchParams.get('city') || '',
  });

  const [sortBy, setSortBy] = useState<'rating' | 'availability' | 'price' | 'experience'>('rating');

  const [specialties, setSpecialties] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [insuranceList, setInsuranceList] = useState<Array<{ id: string; name: string }>>([]);
  const [languageList, setLanguageList] = useState<string[]>([]);

  const [bookingProvider, setBookingProvider] = useState<ProviderSearchResult | null>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [specs, ins, langs] = await Promise.all([
          enhancedProviderSearchService.getSpecialties(),
          enhancedProviderSearchService.getInsuranceProviders(),
          enhancedProviderSearchService.getAvailableLanguages(),
        ]);
        setSpecialties(specs);
        setInsuranceList(ins);
        setLanguageList(langs);
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    };
    loadOptions();
  }, []);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await enhancedProviderSearchService.searchProviders(
        { ...filters, query: searchQuery, city: cityQuery || filters.city },
        page,
        20,
        sortBy
      );
      setProviders(result.providers);
      setTotal(result.total);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, cityQuery, page, sortBy]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const handleSearchbarSearch = (criteria: {
    searchResult: SearchResult | null;
    location: LocationCoordinates | null;
    insurance: InsuranceProvider | null;
  }) => {
    const newQuery = criteria.searchResult?.name || '';
    const newCity = criteria.location?.city || '';
    const newInsurance = criteria.insurance?.name || '';

    setSearchQuery(newQuery);
    setCityQuery(newCity);

    const updatedFilters: ProviderSearchFilters = {
      ...filters,
      city: newCity,
      specialty: criteria.searchResult?.type === 'specialty' ? newQuery : filters.specialty,
      insuranceProviders: newInsurance ? [newInsurance] : filters.insuranceProviders,
    };
    setFilters(updatedFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ consultationType: 'both', acceptingNewPatients: false });
    setSearchQuery('');
    setCityQuery('');
    setPage(1);
    setSearchParams({});
  };

  const activeFilterChips: Array<{ key: string; label: string }> = [];
  if (filters.specialty) activeFilterChips.push({ key: 'specialty', label: filters.specialty });
  if (cityQuery) activeFilterChips.push({ key: 'city', label: cityQuery });
  if (filters.availability) {
    const opt = AVAILABILITY_OPTIONS.find(o => o.value === filters.availability);
    if (opt) activeFilterChips.push({ key: 'availability', label: opt.label });
  }
  if (filters.consultationType && filters.consultationType !== 'both') {
    const opt = VISIT_TYPE_OPTIONS.find(o => o.value === filters.consultationType);
    if (opt) activeFilterChips.push({ key: 'consultationType', label: opt.label });
  }
  if (filters.acceptingNewPatients) activeFilterChips.push({ key: 'newPatients', label: t('findProviders.newPatients') });

  const removeChip = (key: string) => {
    switch (key) {
      case 'specialty':
        setFilters(f => ({ ...f, specialty: '' }));
        break;
      case 'city':
        setCityQuery('');
        setFilters(f => ({ ...f, city: '' }));
        break;
      case 'availability':
        setFilters(f => ({ ...f, availability: undefined }));
        break;
      case 'consultationType':
        setFilters(f => ({ ...f, consultationType: 'both' }));
        break;
      case 'newPatients':
        setFilters(f => ({ ...f, acceptingNewPatients: false }));
        break;
    }
    setPage(1);
  };

  const totalPages = Math.ceil(total / 20);

  const handleViewMore = (provider: ProviderSearchResult) => {
    setBookingProvider(provider);
  };

  return (
    <div className="min-h-screen bg-gray-50 mt-16">
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-6 px-4">
        <div className="max-w-7xl mx-auto mt-10">
          <Searchbar onSearch={handleSearchbarSearch} showSearchButton={true} />
        </div>
      </div>

      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition ${
                showFilters
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t('findProviders.filters')}
            </button>

            {activeFilterChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium whitespace-nowrap"
              >
                {chip.label}
                <button onClick={() => removeChip(chip.key)} className="hover:text-blue-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            {activeFilterChips.length > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium whitespace-nowrap"
              >
                {t('findProviders.clearAll')}
              </button>
            )}

            <div className="ml-auto flex items-center gap-3 flex-shrink-0">
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {loading ? t('findProviders.searching') : total === 1 ? t('findProviders.results', { count: total }) : t('findProviders.results_plural', { count: total })}
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setPage(1); }}
                  className="pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="rating">{t('findProviders.sortTopRated')}</option>
                  <option value="experience">{t('findProviders.sortMostExperienced')}</option>
                  <option value="availability">{t('findProviders.sortSoonestAvailable')}</option>
                  <option value="price">{t('findProviders.sortLowestPrice')}</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <button
                onClick={() => setShowMap(!showMap)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                  showMap
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {showMap ? <List className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
                {showMap ? t('findProviders.list') : t('findProviders.map')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-4">
          {showFilters && (
            <FiltersPanel
              filters={filters}
              setFilters={setFilters}
              specialties={specialties}
              insuranceList={insuranceList}
              languageList={languageList}
              onClear={clearFilters}
              setPage={setPage}
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex gap-4">
              <div className={`${showMap ? 'w-[70%]' : 'w-full'} space-y-4`}>
                {loading ? (
                  <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
                    <p className="mt-4 text-gray-500 text-sm">{t('findProviders.searchingProviders')}</p>
                  </div>
                ) : providers.length === 0 ? (
                  <EmptyState hasFilters={activeFilterChips.length > 0} onClear={clearFilters} />
                ) : (
                  providers.map((provider) => (
                    <ProviderRow
                      key={provider.id}
                      provider={provider}
                      onViewMore={handleViewMore}
                    />
                  ))
                )}

                {totalPages > 1 && !loading && (
                  <div className="flex items-center justify-center gap-2 pt-4 pb-8">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                    >
                      {t('findProviders.previous')}
                    </button>
                    <span className="text-sm text-gray-600 px-3">
                      {t('findProviders.pageOf', { page, totalPages })}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                    >
                      {t('findProviders.next')}
                    </button>
                  </div>
                )}
              </div>

              {showMap && (
                <div className="w-[30%] sticky top-24 h-[calc(100vh-120px)]">
                  <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-gray-100 relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <MapIcon className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">{t('findProviders.mapView')}</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {providers.length > 0
                              ? providers.length === 1 ? t('findProviders.providersInArea', { count: providers.length }) : t('findProviders.providersInArea_plural', { count: providers.length })
                              : t('findProviders.noProvidersToShow')}
                          </p>
                        </div>
                      </div>
                      {providers.map((p, i) => {
                        const xPos = 20 + ((i * 37) % 60);
                        const yPos = 15 + ((i * 23) % 60);
                        return (
                          <div
                            key={p.id}
                            className="absolute"
                            style={{ left: `${xPos}%`, top: `${yPos}%` }}
                          >
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
                              <MapPin className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {bookingProvider && (
        <BookingPopupModal
          provider={{
            id: bookingProvider.id,
            name: `Dr. ${bookingProvider.firstName} ${bookingProvider.lastName}`,
            title: bookingProvider.professionalTitle,
            specialty: bookingProvider.specialty,
            rating: bookingProvider.rating,
            reviewCount: bookingProvider.reviewCount,
            photoUrl: bookingProvider.photo || undefined,
            offersTelemedicine: bookingProvider.locations.some(l => l.acceptsVirtual),
            offersInPerson: bookingProvider.locations.some(l => l.acceptsInPerson),
          }}
          isOpen={true}
          onClose={() => setBookingProvider(null)}
          onBookSlot={(date, time) => {
            setBookingProvider(null);
            window.location.href = `/frontend/provider-profile/${bookingProvider.id}?book=true&date=${date}&time=${time}`;
          }}
        />
      )}

      <Footer />
    </div>
  );
}

function FiltersPanel({
  filters,
  setFilters,
  specialties,
  insuranceList,
  languageList,
  onClear,
  setPage,
}: {
  filters: ProviderSearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<ProviderSearchFilters>>;
  specialties: Array<{ id: string; name: string; slug: string }>;
  insuranceList: Array<{ id: string; name: string }>;
  languageList: string[];
  onClear: () => void;
  setPage: (p: number) => void;
}) {
  const { t } = useTranslation('frontend');
  const AVAILABILITY_OPTIONS = [
    { value: '', label: t('findProviders.anyTime') },
    { value: 'today', label: t('findProviders.today') },
    { value: 'tomorrow', label: t('findProviders.tomorrow') },
    { value: 'this_week', label: t('findProviders.thisWeek') },
    { value: 'next_week', label: t('findProviders.nextWeek') },
  ];
  const VISIT_TYPE_OPTIONS = [
    { value: 'both', label: t('findProviders.allVisitTypes') },
    { value: 'virtual', label: t('findProviders.telehealthVisit') },
    { value: 'in_person', label: t('findProviders.inPerson') },
  ];
  const hasActive = Boolean(
    filters.specialty || filters.availability ||
    (filters.insuranceProviders && filters.insuranceProviders.length > 0) ||
    (filters.languages && filters.languages.length > 0) ||
    filters.acceptingNewPatients || filters.gender ||
    (filters.consultationType && filters.consultationType !== 'both')
  );

  return (
    <div className="w-72 flex-shrink-0">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5 sticky top-24">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{t('findProviders.filters')}</h3>
          {hasActive && (
            <button onClick={onClear} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              {t('findProviders.clearAll')}
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('findProviders.specialty')}</label>
          <div className="relative">
            <select
              value={filters.specialty || ''}
              onChange={(e) => { setFilters(f => ({ ...f, specialty: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none bg-white"
            >
              <option value="">{t('findProviders.allSpecialties')}</option>
              {specialties.map((spec) => (
                <option key={spec.id} value={spec.name}>{spec.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('findProviders.availability')}</label>
          <div className="space-y-1.5">
            {AVAILABILITY_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="availability"
                  value={opt.value}
                  checked={(filters.availability || '') === opt.value}
                  onChange={(e) => {
                    setFilters(f => ({ ...f, availability: (e.target.value as ProviderSearchFilters['availability']) || undefined }));
                    setPage(1);
                  }}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('findProviders.visitType')}</label>
          <div className="space-y-1.5">
            {VISIT_TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="consultationType"
                  value={opt.value}
                  checked={filters.consultationType === opt.value}
                  onChange={(e) => {
                    setFilters(f => ({ ...f, consultationType: e.target.value as ProviderSearchFilters['consultationType'] }));
                    setPage(1);
                  }}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {insuranceList.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('findProviders.insurance')}</label>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {insuranceList.map((ins) => (
                <label key={ins.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.insuranceProviders?.includes(ins.name) || false}
                    onChange={(e) => {
                      const current = filters.insuranceProviders || [];
                      const updated = e.target.checked
                        ? [...current, ins.name]
                        : current.filter(i => i !== ins.name);
                      setFilters(f => ({ ...f, insuranceProviders: updated }));
                      setPage(1);
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{ins.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {languageList.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('findProviders.languages')}</label>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {languageList.map((lang) => (
                <label key={lang} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.languages?.includes(lang) || false}
                    onChange={(e) => {
                      const current = filters.languages || [];
                      const updated = e.target.checked
                        ? [...current, lang]
                        : current.filter(l => l !== lang);
                      setFilters(f => ({ ...f, languages: updated }));
                      setPage(1);
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{lang}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-gray-100">
          <input
            type="checkbox"
            checked={filters.acceptingNewPatients || false}
            onChange={(e) => {
              setFilters(f => ({ ...f, acceptingNewPatients: e.target.checked }));
              setPage(1);
            }}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">{t('findProviders.acceptingNewPatients')}</span>
        </label>
      </div>
    </div>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  const { t } = useTranslation('frontend');
  return (
    <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
      <Search className="w-14 h-14 text-gray-300 mx-auto mb-4" />
      <p className="text-xl text-gray-700 font-semibold">{t('findProviders.noProvidersFound')}</p>
      <p className="text-gray-400 mt-2 max-w-md mx-auto">
        {t('findProviders.noProvidersHint')}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="mt-6 px-6 py-2.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 font-medium transition"
        >
          {t('findProviders.clearAllFilters')}
        </button>
      )}
    </div>
  );
}
 