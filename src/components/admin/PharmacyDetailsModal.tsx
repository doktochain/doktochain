import { useState, useEffect } from 'react';
import { X, Store, MapPin, Phone, Mail, Clock, CheckCircle, Package, Truck, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PharmacyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pharmacyId: string;
}

export default function PharmacyDetailsModal({ isOpen, onClose, pharmacyId }: PharmacyDetailsModalProps) {
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [operatingHours, setOperatingHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'hours' | 'services'>('details');

  useEffect(() => {
    if (isOpen && pharmacyId) {
      loadPharmacyDetails();
    }
  }, [isOpen, pharmacyId]);

  const loadPharmacyDetails = async () => {
    try {
      setLoading(true);

      const { data: pharmacyData, error: pharmacyError } = await supabase
        .from('pharmacies')
        .select(`
          *,
          user_profiles(
            email,
            phone,
            first_name,
            last_name
          )
        `)
        .eq('id', pharmacyId)
        .single();

      if (pharmacyError) throw pharmacyError;
      setPharmacy(pharmacyData);

      const { data: hoursData } = await supabase
        .from('pharmacy_operating_hours')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .order('day_of_week', { ascending: true });

      setOperatingHours(hoursData || []);
    } catch (error) {
      console.error('Error loading pharmacy details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dayNumber: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-2xl font-semibold text-gray-900">Pharmacy Details</h3>
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
          ) : pharmacy ? (
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-start gap-6 mb-6 pb-6 border-b">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                  <Store className="w-12 h-12" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {pharmacy.pharmacy_name}
                  </h2>
                  <p className="text-lg text-gray-600 mb-2">License: {pharmacy.license_number}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {pharmacy.is_verified && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                        <CheckCircle className="w-4 h-4" /> Verified
                      </span>
                    )}
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      pharmacy.is_active
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pharmacy.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {pharmacy.accepts_delivery && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        <Truck className="w-4 h-4" /> Delivery Available
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      {pharmacy.email || pharmacy.user_profiles?.email}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      {pharmacy.phone || pharmacy.user_profiles?.phone}
                    </div>
                    <div className="flex items-start gap-2 text-gray-600 col-span-2">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <span>
                        {pharmacy.address_line1}
                        {pharmacy.address_line2 && `, ${pharmacy.address_line2}`}
                        <br />
                        {pharmacy.city}, {pharmacy.province} {pharmacy.postal_code}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-b border-gray-200 mb-6">
                <nav className="flex gap-6">
                  {['details', 'hours', 'services'].map((tab) => (
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

              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {pharmacy.description || 'No description available'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Business Information</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>License: {pharmacy.license_number}</li>
                        <li>Province: {pharmacy.province}</li>
                        {pharmacy.fax && <li>Fax: {pharmacy.fax}</li>}
                        {pharmacy.website && (
                          <li>
                            Website: <a href={pharmacy.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{pharmacy.website}</a>
                          </li>
                        )}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Contact Person</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>Name: {pharmacy.user_profiles?.first_name} {pharmacy.user_profiles?.last_name}</li>
                        <li>Email: {pharmacy.user_profiles?.email}</li>
                        <li>Phone: {pharmacy.user_profiles?.phone || 'Not provided'}</li>
                      </ul>
                    </div>
                  </div>

                  {pharmacy.accepts_insurance && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Insurance Accepted
                      </h4>
                      <p className="text-sm text-gray-600">This pharmacy accepts insurance claims</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'hours' && (
                <div className="space-y-3">
                  {operatingHours.length > 0 ? (
                    operatingHours.map((hours, idx) => (
                      <div key={idx} className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900">{getDayName(hours.day_of_week)}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {hours.is_closed ? (
                            <span className="text-red-600">Closed</span>
                          ) : (
                            <span>
                              {hours.open_time} - {hours.close_time}
                              {hours.break_start && hours.break_end && (
                                <span className="text-gray-500 ml-2">
                                  (Break: {hours.break_start} - {hours.break_end})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No operating hours available</p>
                  )}
                </div>
              )}

              {activeTab === 'services' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        <h4 className="font-medium text-gray-900">Prescription Services</h4>
                      </div>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>• Prescription filling</li>
                        <li>• Refill reminders</li>
                        <li>• Medication synchronization</li>
                      </ul>
                    </div>

                    {pharmacy.accepts_delivery && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Truck className="w-5 h-5 text-green-600" />
                          <h4 className="font-medium text-gray-900">Delivery Service</h4>
                        </div>
                        <p className="text-sm text-gray-600">
                          Home delivery available for prescriptions and OTC products
                        </p>
                      </div>
                    )}

                    {pharmacy.accepts_insurance && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                          <h4 className="font-medium text-gray-900">Insurance Billing</h4>
                        </div>
                        <p className="text-sm text-gray-600">
                          Direct insurance billing and claims processing
                        </p>
                      </div>
                    )}

                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Store className="w-5 h-5 text-orange-600" />
                        <h4 className="font-medium text-gray-900">OTC Products</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Wide selection of over-the-counter medications and health products
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">
              Pharmacy not found
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
