import { useState, useEffect } from 'react';
import { MapPin, Building2, Phone } from 'lucide-react';
import { providerService, ProviderLocation } from '../../services/providerService';

interface LocationSelectionStepProps {
  providerId: string;
  consultationType: string;
  onSelect: (location: ProviderLocation) => void;
  onBack: () => void;
}

export default function LocationSelectionStep({
  providerId,
  consultationType,
  onSelect,
  onBack,
}: LocationSelectionStepProps) {
  const [locations, setLocations] = useState<ProviderLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocations();
  }, [providerId]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const allLocations = await providerService.getLocations(providerId);
      const filtered = allLocations.filter(loc => {
        if (consultationType === 'in_person' || consultationType === 'home_visit') {
          return loc.accepts_in_person;
        }
        return loc.accepts_virtual;
      });
      setLocations(filtered.length > 0 ? filtered : allLocations);
    } catch {
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Select Location</h2>
      <p className="text-gray-600 mb-6">
        Choose the clinic or office where you'd like to be seen.
      </p>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto" />
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No locations available for this consultation type.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((location) => (
            <button
              key={location.id}
              onClick={() => onSelect(location)}
              className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-sky-500 hover:bg-sky-50/50 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-200 transition-colors">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{location.location_name}</h3>
                    {location.is_primary && (
                      <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs rounded-full font-medium">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {location.address_line1}
                    {location.address_line2 && `, ${location.address_line2}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {location.city}, {location.province} {location.postal_code}
                  </p>
                  {location.phone && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {location.phone}
                    </p>
                  )}
                </div>
                <MapPin className="w-5 h-5 text-gray-300 group-hover:text-sky-500 transition-colors flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={onBack}
        className="mt-6 px-6 py-2 text-sky-600 border border-sky-600 rounded-lg hover:bg-sky-50"
      >
        Back
      </button>
    </div>
  );
}
