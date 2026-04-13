import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { Building2, Search, CheckCircle, Clock, XCircle, Eye, MapPin, Phone, Mail, Shield } from 'lucide-react';

interface Pharmacy {
  id: string;
  user_id: string;
  pharmacy_name: string;
  license_number: string;
  phone: string;
  email: string;
  address_line1: string;
  city: string;
  province: string;
  postal_code: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  hours_of_operation?: any;
  accepts_delivery?: boolean;
}

export default function AdminPharmacies() {
  const { user } = useAuth();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadPharmacies();
  }, []);

  const loadPharmacies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPharmacies(data || []);
    } catch (error) {
      console.error('Error loading pharmacies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (pharmacyId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('pharmacies')
        .update({
          is_verified: true,
          is_active: true,
          onboarding_status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', pharmacyId);

      if (error) throw error;
      setSuccessMessage('Pharmacy has been verified and activated.');
      setSelectedPharmacy(null);
      loadPharmacies();
    } catch (error) {
      console.error('Error verifying pharmacy:', error);
      toast.error('Failed to verify pharmacy');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (pharmacyId: string) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('pharmacies')
        .update({
          is_active: false,
          onboarding_status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', pharmacyId);

      if (error) throw error;
      setSuccessMessage('Pharmacy application has been rejected.');
      setSelectedPharmacy(null);
      loadPharmacies();
    } catch (error) {
      console.error('Error rejecting pharmacy:', error);
      toast.error('Failed to reject pharmacy');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPharmacies = pharmacies.filter(pharmacy => {
    const matchesSearch = !searchTerm ||
      pharmacy.pharmacy_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pharmacy.license_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pharmacy.city?.toLowerCase().includes(searchTerm.toLowerCase());

    const status = (pharmacy as any).onboarding_status;
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'verified' && pharmacy.is_verified) ||
      (filterStatus === 'pending' && !pharmacy.is_verified && status === 'submitted');

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: pharmacies.filter(p => (p as any).onboarding_status !== 'pending').length,
    verified: pharmacies.filter(p => p.is_verified).length,
    pending: pharmacies.filter(p => !p.is_verified && (p as any).onboarding_status === 'submitted').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pharmacy Management</h1>
          <p className="text-gray-600 mt-1">Manage and verify pharmacy partners</p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-emerald-800">{successMessage}</p>
          <button onClick={() => setSuccessMessage('')} className="ml-auto text-emerald-600 hover:text-emerald-800">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Pharmacies</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.total}</h3>
            </div>
            <div className="bg-emerald-100 p-3 rounded-lg">
              <Building2 className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Verified</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.verified}</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Verification</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.pending}</h3>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search pharmacies by name, license, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {filteredPharmacies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No pharmacies found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPharmacies.map((pharmacy) => (
                <div
                  key={pharmacy.id}
                  className={`border rounded-lg p-5 transition hover:shadow-md ${
                    selectedPharmacy?.id === pharmacy.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-7 h-7 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{pharmacy.pharmacy_name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5" />
                            {pharmacy.license_number}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {pharmacy.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {pharmacy.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                          <MapPin className="w-3.5 h-3.5" />
                          {pharmacy.address_line1}, {pharmacy.city}, {pharmacy.province} {pharmacy.postal_code}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {pharmacy.is_verified ? (
                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Pending Verification
                            </span>
                          )}
                          {pharmacy.is_active ? (
                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Active</span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">Inactive</span>
                          )}
                          {pharmacy.accepts_delivery && (
                            <span className="px-2.5 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">Delivery</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Registered: {new Date(pharmacy.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {!pharmacy.is_verified && (
                        <>
                          <button
                            onClick={() => handleVerify(pharmacy.id)}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" /> Verify
                          </button>
                          <button
                            onClick={() => handleReject(pharmacy.id)}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedPharmacy(selectedPharmacy?.id === pharmacy.id ? null : pharmacy)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" /> Details
                      </button>
                    </div>
                  </div>

                  {selectedPharmacy?.id === pharmacy.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Contact Information</h4>
                          <dl className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-gray-500">Phone</dt>
                              <dd className="font-medium text-gray-900">{pharmacy.phone}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">Email</dt>
                              <dd className="font-medium text-gray-900">{pharmacy.email}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500">License</dt>
                              <dd className="font-medium text-gray-900">{pharmacy.license_number}</dd>
                            </div>
                          </dl>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Address</h4>
                          <p className="text-sm text-gray-700">
                            {pharmacy.address_line1}<br />
                            {pharmacy.city}, {pharmacy.province} {pharmacy.postal_code}
                          </p>
                        </div>
                      </div>
                      {pharmacy.hours_of_operation && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Hours of Operation</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(pharmacy.hours_of_operation).map(([day, hours]: [string, any]) => (
                              <div key={day} className="text-sm">
                                <span className="font-medium text-gray-700">{day}:</span>{' '}
                                <span className="text-gray-500">
                                  {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
