import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Eye, Building2, Search, MapPin, Shield, ChevronLeft, Mail, Phone } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';

type TabFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface ClinicApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  address_line1: string;
  postal_code: string;
  description: string;
  website: string | null;
  specialties: string[];
  onboarding_status: string;
  subscription_plan: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  owner_id: string | null;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function ClinicApplicationsPage() {
  const [clinics, setClinics] = useState<ClinicApplication[]>([]);
  const [selected, setSelected] = useState<ClinicApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadClinics();
  }, [activeTab]);

  const loadClinics = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('clinics')
        .select('*, user_profiles!clinics_owner_id_fkey(first_name, last_name, email)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('onboarding_status', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      setClinics(data || []);
    } catch (error) {
      console.error('Error loading clinic applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          onboarding_status: 'approved',
          is_verified: true,
          is_active: true,
          verification_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selected.id);

      if (error) throw error;
      setMessage('Clinic application approved successfully.');
      setSelected(null);
      loadClinics();
    } catch (error) {
      console.error('Error approving:', error);
      setMessage('Failed to approve clinic application.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          onboarding_status: 'rejected',
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selected.id);

      if (error) throw error;
      setShowRejectModal(false);
      setRejectReason('');
      setMessage('Clinic application rejected.');
      setSelected(null);
      loadClinics();
    } catch (error) {
      console.error('Error rejecting:', error);
      setMessage('Failed to reject clinic application.');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = clinics.filter(c =>
    !searchTerm ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs: { key: TabFilter; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'All', count: clinics.length, color: 'bg-gray-100 text-gray-700' },
    { key: 'pending', label: 'Pending', count: clinics.filter(c => c.onboarding_status === 'pending').length, color: 'bg-amber-100 text-amber-700' },
    { key: 'approved', label: 'Approved', count: clinics.filter(c => c.onboarding_status === 'approved').length, color: 'bg-green-100 text-green-700' },
    { key: 'rejected', label: 'Rejected', count: clinics.filter(c => c.onboarding_status === 'rejected').length, color: 'bg-red-100 text-red-700' },
  ];

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={14} className="text-green-600" />;
      case 'rejected': return <XCircle size={14} className="text-red-600" />;
      default: return <Clock size={14} className="text-amber-600" />;
    }
  };

  if (selected) {
    return (
      <div className="p-6 space-y-6">
        <button
          onClick={() => { setSelected(null); setMessage(''); }}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition"
        >
          <ChevronLeft size={16} /> Back to Applications
        </button>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Building2 size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selected.name}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><MapPin size={14} /> {selected.city}, {selected.province}</span>
                    <span className="flex items-center gap-1"><Mail size={14} /> {selected.email}</span>
                    {selected.phone && <span className="flex items-center gap-1"><Phone size={14} /> {selected.phone}</span>}
                  </div>
                </div>
              </div>
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                selected.onboarding_status === 'approved' ? 'bg-green-100 text-green-800' :
                selected.onboarding_status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {statusIcon(selected.onboarding_status)}
                {selected.onboarding_status}
              </span>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Clinic Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="text-right">{selected.address_line1}, {selected.city}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Province</span><span>{selected.province}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Postal Code</span><span>{selected.postal_code}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Website</span><span>{selected.website || 'Not provided'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Applied</span><span>{new Date(selected.created_at).toLocaleDateString()}</span></div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Plan & Owner</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="capitalize">{selected.subscription_plan}</span></div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Owner</span>
                  <span>
                    {selected.user_profiles
                      ? `${selected.user_profiles.first_name} ${selected.user_profiles.last_name}`
                      : 'Not assigned'}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-gray-500">Owner Email</span><span>{selected.user_profiles?.email || 'N/A'}</span></div>
                {selected.specialties && selected.specialties.length > 0 && (
                  <div>
                    <span className="text-gray-500 block mb-1">Specialties</span>
                    <div className="flex flex-wrap gap-1">
                      {selected.specialties.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selected.description && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">{selected.description}</p>
              </div>
            )}
          </div>

          {selected.onboarding_status === 'pending' && (
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                <CheckCircle size={16} /> {actionLoading ? 'Processing...' : 'Approve Application'}
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                <XCircle size={16} /> Reject Application
              </button>
            </div>
          )}
        </div>

        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Reject Clinic Application</h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to reject the application from {selected.name}?
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional)..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject Application'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Clinic Applications</h1>
        <p className="text-gray-500 mt-1">Review and manage clinic registration applications</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`p-4 rounded-xl border text-left transition ${
              activeTab === tab.key
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-sm text-gray-500">{tab.label}</p>
            <p className="text-2xl font-bold text-gray-900">{tab.count}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by clinic name, email, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-700">No applications found</p>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'pending' ? 'No pending applications to review.' : 'No applications match your criteria.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(clinic => (
              <button
                key={clinic.id}
                onClick={() => setSelected(clinic)}
                className="w-full p-5 text-left hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Building2 size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{clinic.name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1"><MapPin size={12} /> {clinic.city}, {clinic.province}</span>
                        <span>{clinic.email}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {clinic.user_profiles && (
                          <span className="text-xs text-gray-400">
                            Owner: {clinic.user_profiles.first_name} {clinic.user_profiles.last_name}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          Applied: {new Date(clinic.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                      clinic.onboarding_status === 'approved' ? 'bg-green-100 text-green-800' :
                      clinic.onboarding_status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {statusIcon(clinic.onboarding_status)}
                      {clinic.onboarding_status}
                    </span>
                    <Eye size={16} className="text-gray-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
