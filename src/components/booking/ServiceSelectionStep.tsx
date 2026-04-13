import { Clock, Stethoscope } from 'lucide-react';

interface ServiceSelectionStepProps {
  services: any[];
  loading: boolean;
  selectedId?: string;
  onSelect: (service: any) => void;
}

export default function ServiceSelectionStep({ services, loading, selectedId, onSelect }: ServiceSelectionStepProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto" />
        <p className="text-gray-600 mt-4">Loading services...</p>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Services Available</h2>
        <p className="text-gray-600">
          This provider hasn't configured their services yet. Please check back later or contact the clinic directly.
        </p>
      </div>
    );
  }

  const grouped: Record<string, any[]> = {};
  services.forEach((s) => {
    const type = s.service_type || 'General';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(s);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Select a Service</h2>
      <p className="text-gray-600 mb-6">Choose the type of appointment you'd like to book.</p>

      {Object.entries(grouped).map(([type, typeServices]) => (
        <div key={type} className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-sky-600" />
            {type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {typeServices.map((service) => (
              <button
                key={service.id}
                onClick={() => onSelect(service)}
                className={`p-6 border-2 rounded-lg text-left transition ${
                  selectedId === service.id
                    ? 'border-sky-600 bg-sky-50'
                    : 'border-gray-200 hover:border-sky-400 hover:shadow-sm'
                }`}
              >
                <h3 className="font-bold text-lg text-gray-900">{service.service_name}</h3>
                {service.description && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{service.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {service.duration_minutes} min
                    </span>
                    <div className="flex gap-1.5">
                      {service.virtual_available && (
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-xs rounded-full">Virtual</span>
                      )}
                      {service.in_person_available && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full">In-Person</span>
                      )}
                    </div>
                  </div>
                  {service.base_price != null && (
                    <span className="text-lg font-bold text-sky-600">${service.base_price}</span>
                  )}
                </div>
                {service.requires_referral && (
                  <span className="inline-block mt-2 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">
                    Referral required
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
