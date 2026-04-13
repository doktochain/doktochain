import { Search, MapPin, ShieldCheck, X } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import {
  unifiedSearchService,
  SearchResult,
  InsuranceProvider,
  LocationCoordinates
} from "../../services/unifiedSearchService";
import { specialtiesService, Specialty } from "../../services/specialtiesService";

interface SearchbarProps {
  onSearch?: (criteria: {
    searchResult: SearchResult | null;
    location: LocationCoordinates | null;
    insurance: InsuranceProvider | null;
  }) => void;
  showSearchButton?: boolean;
  autoSearch?: boolean;
}

export default function Searchbar({
  onSearch,
  showSearchButton = true,
  autoSearch = false
}: SearchbarProps) {
  const { t } = useTranslation('frontend');

  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [locationCoords, setLocationCoords] = useState<LocationCoordinates | null>(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState("");

  const [insurance, setInsurance] = useState("");
  const [selectedInsurance, setSelectedInsurance] = useState<InsuranceProvider | null>(null);

  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedSearchResult, setSelectedSearchResult] = useState<SearchResult | null>(null);

  const [insuranceProviders, setInsuranceProviders] = useState<InsuranceProvider[]>([]);
  const [filteredInsuranceProviders, setFilteredInsuranceProviders] = useState<InsuranceProvider[]>([]);
  const [insuranceSearchQuery, setInsuranceSearchQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationCoordinates[]>([]);

  const [popularSpecialties, setPopularSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch user's location on mount
  useEffect(() => {
    setLocation(t('searchbar.myCurrentLocation'));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const locationData = await unifiedSearchService.reverseGeocode(latitude, longitude);
          if (locationData) {
            setLocation(locationData.displayName);
            setLocationCoords(locationData);
          }
        },
        () => setLocation(t('searchbar.locationUnavailable'))
      );
    } else {
      setLocation(t('searchbar.geoNotSupported'));
    }
  }, []);

  // Load insurance providers and popular specialties
  useEffect(() => {
    loadInsuranceProviders();
    loadPopularSpecialties();
  }, []);

  const loadInsuranceProviders = async () => {
    const providers = await unifiedSearchService.getInsuranceProviders();
    setInsuranceProviders(providers);
    setFilteredInsuranceProviders(providers);
  };

  const loadPopularSpecialties = async () => {
    try {
      const specialties = await specialtiesService.getAllSpecialties();
      setPopularSpecialties(specialties.slice(0, 20));
    } catch (error) {
      console.error('Error loading specialties:', error);
    }
  };

  // Handle search query input with debouncing
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        const results = await unifiedSearchService.searchAll(searchQuery);
        setSearchResults(results);
        setShowSearchDropdown(true);
      } else {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle location input with debouncing
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (locationInput.trim().length >= 3) {
        const suggestions = await unifiedSearchService.searchLocations(locationInput);
        setLocationSuggestions(suggestions);
        if (suggestions.length > 0) {
          setShowLocationDropdown(true);
        }
      } else {
        setLocationSuggestions([]);
        setShowLocationDropdown(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [locationInput]);

  // Auto search when all criteria are met
  useEffect(() => {
    if (autoSearch && selectedSearchResult && onSearch) {
      handleSearch();
    }
  }, [selectedSearchResult, locationCoords, selectedInsurance, autoSearch]);

  const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedSearchResult(null);
  };

  const handleSearchResultSelect = (result: SearchResult) => {
    setSelectedSearchResult(result);
    setSearchQuery(result.name);
    setShowSearchDropdown(false);
  };

  const handleInsuranceModalSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchText = e.target.value;
    setInsuranceSearchQuery(searchText);

    if (searchText.trim() === "") {
      setFilteredInsuranceProviders(insuranceProviders);
    } else {
      const filtered = insuranceProviders.filter(provider =>
        provider.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredInsuranceProviders(filtered);
    }
  };

  const handleInsuranceSelect = (provider: InsuranceProvider) => {
    setSelectedInsurance(provider);
    setInsurance(provider.name);
    setShowInsuranceModal(false);
    setInsuranceSearchQuery("");
    setFilteredInsuranceProviders(insuranceProviders);
  };

  const handleSelfPay = () => {
    setSelectedInsurance(null);
    setInsurance(t('searchbar.selfPay'));
    setShowInsuranceModal(false);
    setInsuranceSearchQuery("");
    setFilteredInsuranceProviders(insuranceProviders);
  };

  const handleLocationEdit = () => {
    setIsEditingLocation(true);
    setLocationInput(location);
  };

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocationInput(value);
  };

  const handleLocationSelect = (locationData: LocationCoordinates) => {
    setLocation(locationData.displayName);
    setLocationCoords(locationData);
    setIsEditingLocation(false);
    setLocationInput("");
    setShowLocationDropdown(false);
  };

  const handleSearch = useCallback(() => {
    if (onSearch) {
      onSearch({
        searchResult: selectedSearchResult,
        location: locationCoords,
        insurance: selectedInsurance,
      });
    }
  }, [selectedSearchResult, locationCoords, selectedInsurance, onSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <form
      id="insurance-section"
      onSubmit={handleSubmit}
      className="w-full max-w-screen-lg mx-auto p-4 bg-white border border-gray-300 rounded-lg shadow-md flex flex-col md:flex-row items-center md:space-x-2 relative">

      {/* Search Input - Specialties, Procedures, Services */}
      <div className="relative w-full mb-2 md:mb-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchQueryChange}
          onFocus={() => setShowSearchDropdown(true)}
          onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
          placeholder={t('searchbar.placeholder')}
          className="w-full pl-10 pr-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        {showSearchDropdown && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-auto z-50">
            {searchQuery.trim().length >= 2 && searchResults.length > 0 ? (
              <ul>
                {searchResults.map((result) => (
                  <li
                    key={`${result.type}-${result.id}`}
                    onMouseDown={() => handleSearchResultSelect(result)}
                    className="px-4 py-3 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{result.name}</div>
                        {result.description && (
                          <div className="text-sm text-gray-600 truncate">{result.description}</div>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        result.type === 'specialty' ? 'bg-blue-100 text-blue-700' :
                        result.type === 'procedure' ? 'bg-green-100 text-green-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {result.type}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div>
                <div className="px-4 py-2 text-sm font-semibold text-gray-500 bg-gray-50">
                  {t('searchbar.popularSpecialties')}
                </div>
                <ul>
                  {popularSpecialties.map((specialty) => (
                    <li
                      key={specialty.id}
                      onMouseDown={() => {
                        const result: SearchResult = {
                          id: specialty.id,
                          name: specialty.name,
                          type: 'specialty',
                          description: specialty.description
                        };
                        handleSearchResultSelect(result);
                      }}
                      className="px-4 py-2.5 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium text-gray-900">{specialty.name}</div>
                    </li>
                  ))}
                </ul>
                {popularSpecialties.length > 0 && (
                  <div className="px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 cursor-pointer border-t border-gray-200">
                    {t('searchbar.moreSpecialties')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Location Selector - Editable */}
      <div className="relative w-full mb-2 md:mb-0">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
        {isEditingLocation ? (
          <>
            <input
              type="text"
              value={locationInput}
              onChange={handleLocationInputChange}
              onBlur={() => setTimeout(() => {
                setIsEditingLocation(false);
                setShowLocationDropdown(false);
              }, 200)}
              placeholder={t('searchbar.locationPlaceholder')}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-semibold focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {showLocationDropdown && locationSuggestions.length > 0 && (
              <ul className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-auto z-50">
                {locationSuggestions.map((loc, idx) => (
                  <li
                    key={idx}
                    onMouseDown={() => handleLocationSelect(loc)}
                    className="px-4 py-2 cursor-pointer hover:bg-blue-50"
                  >
                    <div className="font-medium text-gray-900">{loc.city}, {loc.province}</div>
                    <div className="text-xs text-gray-500">{loc.displayName}</div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <input
            type="text"
            value={location}
            onClick={handleLocationEdit}
            readOnly
            className="w-full pl-10 pr-4 py-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-600 font-semibold focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-100"
          />
        )}
      </div>

      {/* Insurance Selector - Opens Modal */}
      <div className="relative w-full mb-2 md:mb-0">
        <ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
        <input
          id="insurance-input"
          type="text"
          value={insurance}
          onClick={() => setShowInsuranceModal(true)}
          readOnly
          placeholder={t('searchbar.insurancePlaceholder')}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 bg-white rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-50"
        />
      </div>

      {/* Search Button */}
      {showSearchButton && (
        <button
          type="submit"
          disabled={!selectedSearchResult}
          className="bg-yellow-400 hover:bg-yellow-500 px-6 py-3 rounded-lg text-black font-medium w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {t('searchbar.searchButton')}
        </button>
      )}

      {/* Insurance Selection Modal */}
      {showInsuranceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">{t('searchbar.selectInsurance')}</h2>
              <button
                onClick={() => {
                  setShowInsuranceModal(false);
                  setInsuranceSearchQuery("");
                  setFilteredInsuranceProviders(insuranceProviders);
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Search Input */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={insuranceSearchQuery}
                  onChange={handleInsuranceModalSearch}
                  placeholder={t('searchbar.searchInsurance')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Popular Carriers */}
              {insuranceSearchQuery.trim() === "" && (
                <>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('searchbar.popularCarriers')}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {filteredInsuranceProviders.slice(0, 6).map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => handleInsuranceSelect(provider)}
                          className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-left"
                        >
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="text-gray-600" size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{provider.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* All Carriers Section */}
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('searchbar.allCarriers')}</h3>
                    <div className="border-t border-gray-200 pt-2">
                      <div className="text-lg font-semibold text-gray-400 px-3 py-2">#</div>
                    </div>
                  </div>
                </>
              )}

              {/* Filtered Results */}
              {insuranceSearchQuery.trim() !== "" && (
                <div className="space-y-1">
                  {filteredInsuranceProviders.length > 0 ? (
                    filteredInsuranceProviders.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => handleInsuranceSelect(provider)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition text-left"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          <ShieldCheck className="text-gray-600" size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{provider.name}</div>
                          {provider.provinces_covered && provider.provinces_covered.length > 0 && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {provider.provinces_covered.join(', ')}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {t('searchbar.noInsuranceFound')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6">
              <button
                onClick={handleSelfPay}
                className="w-full text-center text-blue-600 hover:text-blue-700 font-medium py-2 underline"
              >
                {t('searchbar.selfPay')}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
