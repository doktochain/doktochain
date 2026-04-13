import { Clock, Video, MapPin, Stethoscope } from 'lucide-react';

interface ProviderServicesTabProps {
  services: any[];
}

export default function ProviderServicesTab({ services }: ProviderServicesTabProps) {
  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No services listed yet</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {services.map((service) => (
        <div key={service.id} className="border border-gray-200 rounded-lg p-5">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-gray-900">{service.service_name}</h3>
            {service.base_price > 0 && (
              <span className="text-lg font-bold text-sky-600">${Number(service.base_price).toFixed(2)}</span>
            )}
          </div>
          {service.description && (
            <p className="text-sm text-gray-600 mb-3">{service.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {service.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {service.duration_minutes} min
              </span>
            )}
            {service.virtual_available && (
              <span className="flex items-center gap-1 text-sky-600">
                <Video className="w-3.5 h-3.5" />
                Virtual
              </span>
            )}
            {service.in_person_available && (
              <span className="flex items-center gap-1 text-green-600">
                <MapPin className="w-3.5 h-3.5" />
                In-person
              </span>
            )}
          </div>
          {service.requires_referral && (
            <p className="text-xs text-amber-600 mt-2 font-medium">Referral required</p>
          )}
        </div>
      ))}
    </div>
  );
}
