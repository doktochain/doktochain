import { useState, useEffect } from 'react';
import { X, Star, MapPin, Phone, Mail, Calendar, Award, Building, Languages, CreditCard, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ProviderProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
}

export default function ProviderProfileModal({ isOpen, onClose, providerId }: ProviderProfileModalProps) {
  const [provider, setProvider] = useState<any>(null);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'credentials' | 'locations'>('about');

  useEffect(() => {
    if (isOpen && providerId) {
      loadProviderDetails();
    }
  }, [isOpen, providerId]);

  const loadProviderDetails = async () => {
    try {
      setLoading(true);

      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select(`
          *,
          user_profiles(
            first_name,
            last_name,
            phone,
            email,
            profile_photo_url
          )
        `)
        .eq('id', providerId)
        .single();

      if (providerError) throw providerError;
      setProvider(providerData);

      const [credData, locData, specData] = await Promise.all([
        supabase
          .from('provider_credentials')
          .select('*')
          .eq('provider_id', providerId)
          .order('year_obtained', { ascending: false }),
        supabase
          .from('provider_locations')
          .select('*')
          .eq('provider_id', providerId)
          .order('is_primary', { ascending: false }),
        supabase
          .from('provider_specialties')
          .select('*')
          .eq('provider_id', providerId),
      ]);

      setCredentials(credData.data || []);
      setLocations(locData.data || []);
      setSpecialties(specData.data || []);
    } catch (error) {
      console.error('Error loading provider details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-2xl font-semibold text-gray-900">Provider Profile</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : provider ? (
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-start gap-6 mb-6 pb-6 border-b">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                  {provider.user_profiles?.first_name?.[0]}{provider.user_profiles?.last_name?.[0]}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Dr. {provider.user_profiles?.first_name} {provider.user_profiles?.last_name}
                  </h2>
                  <p className="text-lg text-gray-600 mb-2">{provider.professional_title}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {provider.is_verified && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                        <CheckCircle className="w-4 h-4" /> Verified
                      </span>
                    )}
                    {provider.telemedicine_enabled && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        Telemedicine Available
                      </span>
                    )}
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      provider.is_accepting_new_patients
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {provider.is_accepting_new_patients ? 'Accepting New Patients' : 'Not Accepting New Patients'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      {provider.user_profiles?.email}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      {provider.user_profiles?.phone || 'Not provided'}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Award className="w-4 h-4" />
                      License: {provider.license_number}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {provider.years_of_experience} years experience
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-b border-gray-200 mb-6">
                <nav className="flex gap-6">
                  {['about', 'credentials', 'locations'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`pb-3 px-1 border-b-2 font-medium text-sm transition ${
                        activeTab === tab
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </nav>
              </div>

              {activeTab === 'about' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Bio</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {provider.bio || 'No bio available'}
                    </p>
                  </div>

                  {specialties.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Specialties</h3>
                      <div className="flex flex-wrap gap-2">
                        {specialties.map((spec, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                          >
                            {spec.specialty_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Practice Details</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>Province: {provider.province}</li>
                        <li>License Status: {provider.license_status || 'Active'}</li>
                        {provider.practice_since && (
                          <li>Practicing Since: {new Date(provider.practice_since).getFullYear()}</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'credentials' && (
                <div className="space-y-4">
                  {credentials.length > 0 ? (
                    credentials.map((cred, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Award className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{cred.credential_type}</h4>
                            <p className="text-sm text-gray-600">{cred.institution}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span>{cred.degree_name}</span>
                              {cred.year_obtained && <span>Year: {cred.year_obtained}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No credentials available</p>
                  )}
                </div>
              )}

              {activeTab === 'locations' && (
                <div className="space-y-4">
                  {locations.length > 0 ? (
                    locations.map((loc, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Building className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{loc.clinic_name}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {loc.address_line1}
                              {loc.address_line2 && `, ${loc.address_line2}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {loc.city}, {loc.province} {loc.postal_code}
                            </p>
                            {loc.phone && (
                              <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                {loc.phone}
                              </p>
                            )}
                            {loc.is_primary && (
                              <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                Primary Location
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No locations available</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">
              Provider not found
            </div>
          )}

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
