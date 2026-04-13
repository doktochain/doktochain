import { Link } from 'react-router-dom';
import { Star, Video, MapPin, UserCheck, Stethoscope } from 'lucide-react';
import { ProviderSearchResult } from '../../services/enhancedProviderSearchService';
import ProviderAvailabilityCalendar from './ProviderAvailabilityCalendar';

interface ProviderRowProps {
  provider: ProviderSearchResult;
  onViewMore: (provider: ProviderSearchResult) => void;
}

export default function ProviderRow({ provider, onViewMore }: ProviderRowProps) {
  const primaryLocation = provider.locations[0];
  const hasVirtual = provider.locations.some(l => l.acceptsVirtual);
  const hasInPerson = provider.locations.some(l => l.acceptsInPerson);

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all duration-200 p-5">
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex gap-4 flex-1 min-w-0">
          <Link
            to={`/frontend/provider-profile/${provider.id}`}
            className="flex-shrink-0"
          >
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border-2 border-blue-100">
              {provider.photo ? (
                <img src={provider.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <Stethoscope className="w-8 h-8 text-blue-400" />
              )}
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <Link
              to={`/frontend/provider-profile/${provider.id}`}
              className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              Dr. {provider.firstName} {provider.lastName}
            </Link>
            <p className="text-sm text-gray-600 mt-0.5">{provider.specialty}</p>
            {provider.professionalTitle && (
              <p className="text-xs text-gray-400">{provider.professionalTitle}</p>
            )}

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

            <div className="flex flex-wrap gap-1.5 mt-2">
              {hasVirtual && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded-full font-medium">
                  <Video className="w-3 h-3" /> Telehealth
                </span>
              )}
              {hasInPerson && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                  <MapPin className="w-3 h-3" /> In-person
                </span>
              )}
              {provider.acceptingNewPatients && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium">
                  <UserCheck className="w-3 h-3" /> New Patients
                </span>
              )}
              {primaryLocation && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {primaryLocation.city}, {primaryLocation.province}
                </span>
              )}
            </div>

            {provider.bio && (
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{provider.bio}</p>
            )}

            <div className="mt-3 flex gap-2">
              <Link
                to={`/frontend/provider-profile/${provider.id}`}
                className="px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 font-medium text-sm transition"
              >
                View Profile
              </Link>
              <Link
                to={`/frontend/provider-profile/${provider.id}?book=true`}
                className="px-4 py-2 border border-blue-600 text-blue-600 text-center rounded-lg hover:bg-blue-50 font-medium text-sm transition"
              >
                Book Now
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:w-[520px] flex-shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-5">
          <ProviderAvailabilityCalendar
            providerId={provider.id}
            onViewMore={() => onViewMore(provider)}
            compact
          />
        </div>
      </div>
    </div>
  );
}
