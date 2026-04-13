import { Star, Video, MapPin, Phone, UserCheck } from 'lucide-react';
import { ReviewStats } from '../../services/providerReviewService';

interface ProviderProfileHeaderProps {
  provider: any;
  profile: any;
  photoUrl: string | null;
  primaryLocation: any;
  hasVirtualVisits: boolean;
  reviewStats: ReviewStats | null;
  onBook: () => void;
}

export default function ProviderProfileHeader({
  provider,
  profile,
  photoUrl,
  primaryLocation,
  hasVirtualVisits,
  reviewStats,
  onBook,
}: ProviderProfileHeaderProps) {
  return (
    <div className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <img
            src={photoUrl || '/image/doctor1.jpg'}
            alt={`Dr. ${profile?.last_name}`}
            className="w-28 h-28 rounded-full object-cover border-4 border-sky-100 shadow-md"
          />

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {provider.professional_title || 'Dr.'} {profile?.first_name} {profile?.last_name}
            </h1>
            <p className="text-lg text-gray-600 mt-1">
              {provider.specialty || provider.provider_type}
            </p>

            {reviewStats && reviewStats.totalReviews > 0 && (
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span className="text-xl font-bold text-gray-900">{reviewStats.averageRating.toFixed(1)}</span>
                  <span className="text-gray-600">({reviewStats.totalReviews} reviews)</span>
                </div>
                {provider.years_of_experience > 0 && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-600">{provider.years_of_experience} years experience</span>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2.5 mt-4">
              {hasVirtualVisits && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-full text-sm font-medium">
                  <Video className="w-4 h-4" />
                  Virtual Visits
                </span>
              )}
              {provider.accepts_new_patients && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                  <UserCheck className="w-4 h-4" />
                  Accepting New Patients
                </span>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <button
              onClick={onBook}
              className="px-8 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Book Appointment
            </button>
            {primaryLocation && (
              <div className="mt-4 text-sm text-gray-600 space-y-1.5">
                <div className="flex items-center gap-2 justify-end">
                  <MapPin className="w-4 h-4" />
                  <span>{primaryLocation.city}, {primaryLocation.province}</span>
                </div>
                {(profile?.phone || primaryLocation.phone) && (
                  <div className="flex items-center gap-2 justify-end">
                    <Phone className="w-4 h-4" />
                    <span>{profile?.phone || primaryLocation.phone}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
