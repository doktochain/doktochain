import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, Video, Clock, MapPin, SlidersHorizontal, LayoutGrid, List, UserCheck, ChevronDown, X } from 'lucide-react';
import {
  enhancedProviderSearchService,
  ProviderSearchFilters,
  ProviderSearchResult,
} from '../../services/enhancedProviderSearchService';

interface Props {
  initialSpecialty?: string;
  onSelectProvider?: (provider: ProviderSearchResult) => void;
  compact?: boolean;
}

export default function EnhancedProviderSearch({ initialSpecialty, onSelectProvider, compact }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState<ProviderSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(!compact);
  const [page, setPage] = useState(1);

  const [specialties, setSpecialties] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [insuranceList, setInsuranceList] = useState<Array<{ id: string; name: string }>>([]);
  const [languageList, setLanguageList] = useState<string[]>([]);

  const [filters, setFilters] = useState<ProviderSearchFilters>({
    consultationType: 'both',
    acceptingNewPatients: false,
    specialty: initialSpecialty || '',
  });

  const [sortBy, setSortBy] = useState<'rating' | 'availability' | 'price' | 'experience'>('rating');

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [specs, ins, langs] = await Promise.all([
          enhancedProviderSearchService.getSpecialties(),
          enhancedProviderSearchService.getInsuranceProviders(),
          enhancedProviderSearchService.getAvailableLanguages(),
        ]);
        setSpecialties(specs);
        setInsuranceList(ins);
        setLanguageList(langs);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };
    loadFilterOptions();
  }, []);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await enhancedProviderSearchService.searchProviders(
        { ...filters, query: searchQuery },
        page,
        20,
        sortBy
      );
      setProviders(result.providers);
      setTotal(result.total);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, page, sortBy]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1);
      handleSearch();
    }
  };

  const clearFilters = () => {
    setFilters({ consultationType: 'both', acceptingNewPatients: false });
    setSearchQuery('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    filters.specialty || filters.city || filters.province || filters.availability ||
    (filters.insuranceProviders && filters.insuranceProviders.length > 0) ||
    (filters.languages && filters.languages.length > 0) ||
    filters.acceptingNewPatients || filters.gender ||
    (filters.consultationType && filters.consultationType !== 'both')
  );

  const totalPages = Math.ceil(total / 20);

  return (
    <div className={compact ? '' : 'min-h-screen bg-gray-50'}>
      {!compact && (
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Find a Healthcare Provider</h1>
            <p className="text-gray-500 mb-6">Search by name, specialty, or condition</p>

            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, specialty, or condition..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                />
              </div>

              <button
                onClick={() => { setPage(1); handleSearch(); }}
                className="px-6 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 font-medium transition"
              >
                Search
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 border rounded-xl flex items-center gap-2 transition ${
                  showFilters ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-sky-500 rounded-full" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {compact && (
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>
      )}

      <div className={compact ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'}>
        <div className="flex gap-6">
          {showFilters && (
            <div className={`${compact ? 'w-64' : 'w-80'} bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-fit space-y-5 flex-shrink-0`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Filters</h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-sky-600 hover:text-sky-700 font-medium">
                    Clear all
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Specialty</label>
                <div className="relative">
                  <select
                    value={filters.specialty || ''}
                    onChange={(e) => { setFilters({ ...filters, specialty: e.target.value }); setPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm appearance-none bg-white"
                  >
                    <option value="">All Specialties</option>
                    {specialties.map((spec) => (
                      <option key={spec.id} value={spec.name}>{spec.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <input
                  type="text"
                  placeholder="e.g. Toronto"
                  value={filters.city || ''}
                  onChange={(e) => { setFilters({ ...filters, city: e.target.value }); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Availability</label>
                <div className="space-y-1.5">
                  {[
                    { value: '', label: 'Any time' },
                    { value: 'today', label: 'Today' },
                    { value: 'tomorrow', label: 'Tomorrow' },
                    { value: 'this_week', label: 'This week' },
                    { value: 'next_week', label: 'Next week' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="availability"
                        value={opt.value}
                        checked={(filters.availability || '') === opt.value}
                        onChange={(e) => {
                          setFilters({ ...filters, availability: e.target.value as any || undefined });
                          setPage(1);
                        }}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Visit Type</label>
                <div className="space-y-1.5">
                  {[
                    { value: 'both', label: 'Both' },
                    { value: 'virtual', label: 'Virtual Only' },
                    { value: 'in_person', label: 'In-Person Only' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="consultationType"
                        value={opt.value}
                        checked={filters.consultationType === opt.value}
                        onChange={(e) => {
                          setFilters({ ...filters, consultationType: e.target.value as any });
                          setPage(1);
                        }}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {insuranceList.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Insurance</label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
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
                            setFilters({ ...filters, insuranceProviders: updated });
                            setPage(1);
                          }}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span className="text-sm text-gray-700">{ins.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {languageList.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Languages</label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
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
                            setFilters({ ...filters, languages: updated });
                            setPage(1);
                          }}
                          className="rounded text-sky-600 focus:ring-sky-500"
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
                    setFilters({ ...filters, acceptingNewPatients: e.target.checked });
                    setPage(1);
                  }}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm font-medium text-gray-700">Accepting new patients</span>
              </label>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {loading ? 'Searching...' : `${total} provider${total !== 1 ? 's' : ''} found`}
              </span>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
                    className="pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none bg-white"
                  >
                    <option value="rating">Top Rated</option>
                    <option value="experience">Most Experienced</option>
                    <option value="availability">Soonest Available</option>
                    <option value="price">Lowest Price</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 transition ${viewMode === 'grid' ? 'bg-sky-100 text-sky-700' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 transition ${viewMode === 'list' ? 'bg-sky-100 text-sky-700' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600 mx-auto" />
                <p className="mt-4 text-gray-500 text-sm">Searching providers...</p>
              </div>
            ) : providers.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No providers found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search terms</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-4 px-4 py-2 text-sm text-sky-600 border border-sky-300 rounded-lg hover:bg-sky-50">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
                {providers.map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    viewMode={viewMode}
                    onSelect={onSelectProvider}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 px-3">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  viewMode,
  onSelect,
}: {
  provider: ProviderSearchResult;
  viewMode: 'grid' | 'list';
  onSelect?: (provider: ProviderSearchResult) => void;
}) {
  const primaryLocation = provider.locations[0];
  const hasVirtual = provider.locations.some(l => l.acceptsVirtual);

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-sky-200 hover:shadow-md transition p-5">
      <div className={`flex ${viewMode === 'list' ? 'items-center' : 'items-start'} gap-4`}>
        <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {provider.photo ? (
            <img src={provider.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sky-700 font-bold text-lg">
              {provider.firstName[0]}{provider.lastName[0]}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                to={`/frontend/provider-profile/${provider.id}`}
                className="text-base font-bold text-gray-900 hover:text-sky-600 transition"
              >
                Dr. {provider.firstName} {provider.lastName}
              </Link>
              <p className="text-sm text-gray-500 mt-0.5">{provider.specialty}</p>
              {provider.professionalTitle && (
                <p className="text-xs text-gray-400">{provider.professionalTitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {provider.rating > 0 && (
              <span className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-semibold text-gray-900">{provider.rating.toFixed(1)}</span>
                <span className="text-gray-400">({provider.reviewCount})</span>
              </span>
            )}

            {provider.yearsExperience > 0 && (
              <span className="text-sm text-gray-500">{provider.yearsExperience}y exp.</span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {hasVirtual && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded-full font-medium">
                <Video className="w-3 h-3" /> Virtual
              </span>
            )}
            {provider.acceptingNewPatients && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium">
                <UserCheck className="w-3 h-3" /> New Patients
              </span>
            )}
            {primaryLocation && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                <MapPin className="w-3 h-3" /> {primaryLocation.city}, {primaryLocation.province}
              </span>
            )}
          </div>

          {provider.nextAvailable && (
            <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Next:{' '}
                {new Date(provider.nextAvailable).toLocaleDateString('en-CA', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            {onSelect ? (
              <button
                onClick={() => onSelect(provider)}
                className="flex-1 px-4 py-2 bg-sky-600 text-white text-center rounded-lg hover:bg-sky-700 font-medium text-sm transition"
              >
                Select Provider
              </button>
            ) : (
              <>
                <Link
                  to={`/frontend/provider-profile/${provider.id}`}
                  className="flex-1 px-4 py-2 bg-sky-600 text-white text-center rounded-lg hover:bg-sky-700 font-medium text-sm transition"
                >
                  View Profile
                </Link>
                <Link
                  to={`/frontend/provider-profile/${provider.id}?book=true`}
                  className="flex-1 px-4 py-2 border border-sky-600 text-sky-600 text-center rounded-lg hover:bg-sky-50 font-medium text-sm transition"
                >
                  Book Now
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
