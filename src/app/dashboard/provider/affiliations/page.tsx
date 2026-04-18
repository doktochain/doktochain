import { useState, useEffect } from 'react';
import { Building2, MapPin, Plus, CheckCircle, Clock, XCircle, Search, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { clinicService, ClinicAffiliation, Clinic } from '../../../../services/clinicService';
import { providerService } from '../../../../services/providerService';
import { useAuth } from '../../../../contexts/AuthContext';

type TabType = 'active' | 'pending' | 'request';

export default function ProviderAffiliationsPage() {
  const { user } = useAuth();
  const [affiliations, setAffiliations] = useState<ClinicAffiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [availableClinics, setAvailableClinics] = useState<Clinic[]>([]);
  const [clinicSearch, setClinicSearch] = useState('');
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [requestRole, setRequestRole] = useState('consultant');
  const [requestNotes, setRequestNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const provider = await providerService.getProviderByUserId(user!.id);
      if (!provider) return;
      setProviderId(provider.id);
      const affs = await clinicService.getProviderAffiliations(provider.id);
      setAffiliations(affs);
    } catch (error) {
      console.error('Error loading affiliations:', error);
    } finally {
      setLoading(false);
    }
  };

  const openRequestModal = async () => {
    setShowRequestModal(true);
    try {
      const clinics = await clinicService.getAvailableClinics();
      setAvailableClinics(clinics);
      if (clinics.length === 0) {
        toast.info('No clinics are currently available. Try again later or contact support.');
      }
    } catch (err: any) {
      console.error('Failed to load clinics:', err);
      setAvailableClinics([]);
      toast.error(err?.message || 'Failed to load clinics');
    }
  };

  const submitRequest = async () => {
    if (!providerId || !selectedClinic) return;
    setSubmitting(true);
    try {
      await clinicService.requestAffiliation(providerId, selectedClinic.id, requestRole, requestNotes || undefined);
      toast.success('Affiliation request sent');
      setShowRequestModal(false);
      setSelectedClinic(null);
      setRequestRole('consultant');
      setRequestNotes('');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const activeAffs = affiliations.filter(a => a.status === 'active');
  const pendingAffs = affiliations.filter(a => a.status === 'pending');

  const filteredClinics = availableClinics.filter(c =>
    c.name.toLowerCase().includes(clinicSearch.toLowerCase()) ||
    c.city.toLowerCase().includes(clinicSearch.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
      active: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', icon: CheckCircle },
      pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: Clock },
      rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: XCircle },
      left: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', icon: XCircle },
    };
    const config = configs[status] || configs.left;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3.5 h-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Clinic Affiliations</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your clinic partnerships and practice locations
          </p>
        </div>
        <button
          onClick={openRequestModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Request Affiliation
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {(['active', 'pending'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab === 'active' ? `Active (${activeAffs.length})` : `Pending (${pendingAffs.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {(activeTab === 'active' ? activeAffs : pendingAffs).length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No {activeTab} affiliations
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
              {activeTab === 'active'
                ? 'You are not currently affiliated with any clinics. Request an affiliation to expand your practice.'
                : 'No pending affiliation requests.'}
            </p>
          </div>
        ) : (
          (activeTab === 'active' ? activeAffs : pendingAffs).map(aff => (
            <div
              key={aff.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {aff.clinic_name || (aff as any).clinics?.name || 'Unknown Clinic'}
                    </h3>
                    {(aff as any).clinics && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {(aff as any).clinics.city}, {(aff as any).clinics.province}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      {statusBadge(aff.status)}
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
                        {aff.role_at_clinic?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {aff.start_date && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        Since {new Date(aff.start_date).toLocaleDateString()}
                        {aff.end_date && ` - Until ${new Date(aff.end_date).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Request Clinic Affiliation</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Search for a clinic and request to join as an affiliated provider
              </p>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Clinics
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={clinicSearch}
                    onChange={e => setClinicSearch(e.target.value)}
                    placeholder="Search by name or city..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredClinics.length === 0 ? (
                    <p className="text-sm text-gray-500 p-4 text-center">No clinics found</p>
                  ) : (
                    filteredClinics.map(clinic => (
                      <button
                        key={clinic.id}
                        onClick={() => setSelectedClinic(clinic)}
                        className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          selectedClinic?.id === clinic.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{clinic.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {clinic.city}, {clinic.province}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Role
                </label>
                <select
                  value={requestRole}
                  onChange={e => setRequestRole(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="consultant">Consultant</option>
                  <option value="attending_physician">Attending Physician</option>
                  <option value="visiting_specialist">Visiting Specialist</option>
                  <option value="locum_tenens">Locum Tenens</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={requestNotes}
                  onChange={e => setRequestNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g., I visit this clinic every other Thursday for specialist consultations..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => { setShowRequestModal(false); setSelectedClinic(null); }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitRequest}
                disabled={!selectedClinic || submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {submitting ? 'Sending...' : 'Send Request'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
