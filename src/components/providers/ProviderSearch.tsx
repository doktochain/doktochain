import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { providerSearchService, ProviderSearchFilters, ProviderSearchResult } from '../../services/providerSearchService';
import { Search, MapPin, Star, Filter, Video, Languages, UserCog, CalendarDays, X } from 'lucide-react';

export default function ProviderSearch() {
  const [providers, setProviders] = useState<ProviderSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);

  const [filters, setFilters] = useState<ProviderSearchFilters>({
    searchQuery: '',
    specialty: '',
    postalCode: '',
    appointmentType: undefined,
    languages: [],
    acceptingNewPatients: false,
    minRating: 0,
  });

  const [appliedFilters, setAppliedFilters] = useState<ProviderSearchFilters>({});

  useEffect(() => {
    loadSpecialties();
    handleSearch();
  }, []);

  const loadSpecialties = async () => {
    try {
      const specialtiesList = await providerSearchService.getAllSpecialties();
      setSpecialties(specialtiesList);
    } catch (error) {
      console.error('Error loading specialties:', error);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      let searchFilters = { ...filters };

      // Geocode postal code if provided
      if (filters.postalCode && filters.postalCode.length >= 3) {
        const coords = await providerSearchService.geocodePostalCode(filters.postalCode);
        if (coords) {
          searchFilters.location = {
            ...coords,
            radius: 25, // 25km radius
          };
        }
      }

      const results = await providerSearchService.searchProviders(searchFilters);

      // Get next available slots for each provider
      const resultsWithSlots = await Promise.all(
        results.map(async (provider) => {
          const nextSlot = await providerSearchService.getNextAvailableSlot(provider.id);
          return { ...provider, next_available_slot: nextSlot };
        })
      );

      setProviders(resultsWithSlots);
      setAppliedFilters(filters);
    } catch (error) {
      console.error('Error searching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    const location = await providerSearchService.getCurrentLocation();
    if (location) {
      setFilters({
        ...filters,
        location: { ...location, radius: 25 },
        postalCode: '',
      });
    }
  };

  const toggleLanguage = (language: string) => {
    const languages = filters.languages || [];
    if (languages.includes(language)) {
      setFilters({
        ...filters,
        languages: languages.filter((l) => l !== language),
      });
    } else {
      setFilters({
        ...filters,
        languages: [...languages, language],
      });
    }
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: '',
      specialty: '',
      postalCode: '',
      appointmentType: undefined,
      languages: [],
      acceptingNewPatients: false,
      minRating: 0,
    });
  };

  const activeFiltersCount = Object.values(appliedFilters).filter((v) => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v > 0;
    if (typeof v === 'string') return v.length > 0;
    return false;
  }).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Find a Healthcare Provider</h1>
        <p className="text-gray-600">Search by specialty, location, or provider name</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by condition, procedure, or specialty..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1">
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Postal code or city..."
                value={filters.postalCode}
                onChange={(e) => setFilters({ ...filters, postalCode: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-24 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleUseCurrentLocation}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Use current
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 justify-center relative"
          >
            <Filter />
            Filters
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
                <select
                  value={filters.specialty}
                  onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Specialties</option>
                  {specialties.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Appointment Type</label>
                <select
                  value={filters.appointmentType || ''}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      appointmentType: e.target.value as 'in-person' | 'virtual' | undefined,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Both Virtual & In-Person</option>
                  <option value="virtual">Virtual Only</option>
                  <option value="in-person">In-Person Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">Any Rating</option>
                  <option value="3">3+ Stars</option>
                  <option value="4">4+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
                <div className="flex flex-wrap gap-2">
                  {['English', 'French', 'Spanish', 'Mandarin', 'Arabic'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        filters.languages?.includes(lang)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.acceptingNewPatients}
                    onChange={(e) =>
                      setFilters({ ...filters, acceptingNewPatients: e.target.checked })
                    }
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Accepting new patients only
                  </span>
                </label>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2"
                >
                  <X />
                  Clear all filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-gray-600">
              {providers.length} provider{providers.length !== 1 ? 's' : ''} found
            </p>
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
              <option>Sort by: Relevance</option>
              <option>Sort by: Distance</option>
              <option>Sort by: Rating</option>
              <option>Sort by: Price</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <img
                      src={
                        provider.user_profiles.profile_photo_url ||
                        'https://via.placeholder.com/150'
                      }
                      alt={`Dr. ${provider.user_profiles.last_name}`}
                      className="w-32 h-32 rounded-lg object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          Dr. {provider.user_profiles.first_name} {provider.user_profiles.last_name}
                        </h3>
                        <p className="text-gray-600">{provider.professional_title}</p>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 text-yellow-500 mb-1">
                          <Star />
                          <span className="font-semibold text-gray-900">
                            {provider.rating_average.toFixed(1)}
                          </span>
                          <span className="text-gray-500 text-sm">
                            ({provider.rating_count} reviews)
                          </span>
                        </div>
                        {provider.consultation_fee_cents > 0 && (
                          <p className="text-gray-600 text-sm">
                            ${(provider.consultation_fee_cents / 100).toFixed(0)} consultation
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {provider.specialties?.slice(0, 2).map((spec, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                        >
                          {spec.specialty}
                        </span>
                      ))}
                      {provider.accepts_new_patients && (
                        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                          Accepting new patients
                        </span>
                      )}
                    </div>

                    <p className="text-gray-700 mb-4 line-clamp-2">{provider.bio}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <UserCog className="text-blue-600" />
                        <span>{provider.years_of_experience} years exp.</span>
                      </div>

                      {provider.locations && provider.locations.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="text-blue-600" />
                          <span>
                            {provider.locations[0].city}, {provider.locations[0].province}
                          </span>
                        </div>
                      )}

                      {provider.distance_km && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="text-blue-600" />
                          <span>{provider.distance_km.toFixed(1)} km away</span>
                        </div>
                      )}

                      {provider.languages_spoken && provider.languages_spoken.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Languages className="text-blue-600" />
                          <span>{provider.languages_spoken.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex gap-2">
                        {provider.locations?.some((l) => l.accepts_virtual) && (
                          <span className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                            <Video />
                            Virtual visits
                          </span>
                        )}
                        {provider.next_available_slot && (
                          <span className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                            <CalendarDays />
                            {provider.next_available_slot}
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/frontend/provider-profile/${provider.id}`}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        View Profile & Book
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {providers.length === 0 && !loading && (
            <div className="text-center py-12">
              <UserCog className="mx-auto text-gray-300 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No providers found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search criteria or filters
              </p>
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Clear Filters
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
