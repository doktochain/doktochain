import { MapPin, Phone, Clock, Building2 } from 'lucide-react';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ProviderLocationsTabProps {
  locations: any[];
  timeBlocks: any[];
}

export default function ProviderLocationsTab({ locations, timeBlocks }: ProviderLocationsTabProps) {
  if (locations.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No locations listed</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {locations.map((location) => {
        const locationBlocks = timeBlocks.filter((b: any) => b.location_id === location.id);

        return (
          <div key={location.id} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{location.location_name || 'Office'}</h3>
                {location.is_primary && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-sky-100 text-sky-700 text-xs rounded-full font-medium">
                    Primary Location
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {location.accepts_in_person && (
                  <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">In-Person</span>
                )}
                {location.accepts_virtual && (
                  <span className="px-2.5 py-1 bg-sky-100 text-sky-700 text-xs rounded font-medium">Virtual</span>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  Address
                </h4>
                <p className="text-gray-600">
                  {location.address_line1}
                  {location.address_line2 && <>, {location.address_line2}</>}
                  <br />
                  {location.city}, {location.province} {location.postal_code}
                </p>
                {location.phone && (
                  <p className="text-gray-600 mt-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {location.phone}
                  </p>
                )}
              </div>

              {locationBlocks.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-600" />
                    Hours
                  </h4>
                  <div className="space-y-1 text-sm">
                    {DAY_NAMES.map((day, idx) => {
                      const blocks = locationBlocks.filter((b: any) => b.day_of_week === idx);
                      return (
                        <div key={idx} className="flex justify-between">
                          <span className="text-gray-600">{day}</span>
                          <span className="text-gray-900">
                            {blocks.length === 0
                              ? 'Closed'
                              : blocks.map((b: any) => `${b.start_time?.slice(0, 5)} - ${b.end_time?.slice(0, 5)}`).join(', ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
