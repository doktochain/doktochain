import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Star,
  Clock,
  Truck,
  Phone,
  Navigation,
  Filter,
  X,
  CheckCircle,
  Store,
} from 'lucide-react';
import { pharmacyMarketplaceService, Pharmacy, PharmacySearchFilters } from '../../services/pharmacyMarketplaceService';

export const PharmacyDiscovery: React.FC = () => {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PharmacySearchFilters>({
    postal_code: '',
    radius_km: 10,
    has_delivery: false,
    min_rating: 0,
  });

  useEffect(() => {
    loadPharmacies();
  }, []);

  const loadPharmacies = async () => {
    setLoading(true);
    const { data, error } = await pharmacyMarketplaceService.searchPharmacies(filters);
    if (data) {
      setPharmacies(data);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    loadPharmacies();
  };

  const isOpenNow = (hours: Record<string, any> | null | undefined) => {
    if (!hours || typeof hours !== 'object') return false;

    const now = new Date();
    const day = now.getDay();
    const currentTime = now.getHours() * 100 + now.getMinutes();

    const dayHours = hours[day];
    if (!dayHours) return false;

    if (dayHours.is_24_hours) return true;
    if (dayHours.is_closed) return false;

    const openTime = parseInt(dayHours.open_time?.replace(':', '') || '0');
    const closeTime = parseInt(dayHours.close_time?.replace(':', '') || '0');

    return currentTime >= openTime && currentTime <= closeTime;
  };

  const filteredPharmacies = pharmacies.filter((pharmacy) =>
    pharmacy.pharmacy_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pharmacy.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pharmacy.postal_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find a Pharmacy</h1>
          <p className="text-gray-600">
            Search for pharmacies near you and compare prices
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by pharmacy name, city, or postal code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
            <button
              onClick={handleSearch}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              Search
            </button>
          </div>

          {showFilters && (
            <div className="border-t pt-4 mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  placeholder="e.g., M5V 3A8"
                  value={filters.postal_code}
                  onChange={(e) =>
                    setFilters({ ...filters, postal_code: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Radius (km)
                </label>
                <select
                  value={filters.radius_km}
                  onChange={(e) =>
                    setFilters({ ...filters, radius_km: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={25}>25 km</option>
                  <option value={50}>50 km</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Rating
                </label>
                <select
                  value={filters.min_rating}
                  onChange={(e) =>
                    setFilters({ ...filters, min_rating: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={0}>Any rating</option>
                  <option value={3}>3+ stars</option>
                  <option value={4}>4+ stars</option>
                  <option value={4.5}>4.5+ stars</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.has_delivery}
                    onChange={(e) =>
                      setFilters({ ...filters, has_delivery: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Delivery Available
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pharmacies...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredPharmacies.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No pharmacies found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search criteria or filters
                </p>
              </div>
            ) : (
              filteredPharmacies.map((pharmacy) => (
                <PharmacyCard
                  key={pharmacy.id}
                  pharmacy={pharmacy}
                  isOpen={isOpenNow(pharmacy.hours_of_operation)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface PharmacyCardProps {
  pharmacy: Pharmacy;
  isOpen: boolean;
}

const PharmacyCard: React.FC<PharmacyCardProps> = ({ pharmacy, isOpen }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-gray-900">
              {pharmacy.pharmacy_name}
            </h3>
            {pharmacy.is_verified && (
              <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                <CheckCircle className="w-3 h-3" />
                Verified
              </span>
            )}
            <span
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                isOpen
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              <Clock className="w-3 h-3" />
              {isOpen ? 'Open Now' : 'Closed'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">
              {pharmacy.address_line1}, {pharmacy.city}, {pharmacy.province}{' '}
              {pharmacy.postal_code}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="font-medium">{pharmacy.rating_average.toFixed(1)}</span>
              <span>({pharmacy.rating_count} reviews)</span>
            </div>

            {pharmacy.accepts_delivery && (
              <div className="flex items-center gap-1 text-green-600">
                <Truck className="w-4 h-4" />
                <span>Delivery available</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            View Details
          </button>
          <a
            href={`tel:${pharmacy.phone}`}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Phone className="w-4 h-4" />
            {pharmacy.phone}
          </a>
        </div>
      </div>

      {pharmacy.accepts_delivery && (
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Delivery fee:</span>
            <span className="font-medium">
              {pharmacyMarketplaceService.formatPrice(pharmacy.delivery_fee_cents)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">Minimum order:</span>
            <span className="font-medium">
              {pharmacyMarketplaceService.formatPrice(pharmacy.minimum_order_cents)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};