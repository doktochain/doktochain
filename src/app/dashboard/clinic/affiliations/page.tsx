import { useState, useEffect } from 'react';
import { Link2, CheckCircle, XCircle, Clock, UserMinus, Search, Filter } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { clinicService, Clinic, ClinicAffiliation } from '../../../../services/clinicService';
import { ConfirmDialog } from '../../../../components/ui/confirm-dialog';

const ROLE_OPTIONS = [
  { value: 'attending_physician', label: 'Attending Physician' },
  { value: 'consulting_physician', label: 'Consulting Physician' },
  { value: 'resident', label: 'Resident' },
  { value: 'locum', label: 'Locum' },
  { value: 'specialist', label: 'Specialist' },
];

type TabType = 'all' | 'active' | 'pending' | 'inactive';

export default function ClinicAffiliationsPage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [affiliations, setAffiliations] = useState<ClinicAffiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAff, setSelectedAff] = useState<ClinicAffiliation | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const c = await clinicService.getClinicByOwnerId(user!.id);
      setClinic(c);
      if (c) {
        const affs = await clinicService.getClinicAffiliations(c.id);
        setAffiliations(affs);
      }
    } catch (error) {
      console.error('Error loading affiliations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (affId: string) => {
    setProcessing(affId);
    try {
      await clinicService.approveAffiliation(affId);
      await loadData();
    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedAff) return;
    setProcessing(selectedAff.id);
    try {
      await clinicService.rejectAffiliation(selectedAff.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedAff(null);
      await loadData();
    } catch (error) {
      console.error('Error rejecting:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleRemove = (affId: string) => {
    setPendingRemoveId(affId);
    setRemoveConfirmOpen(true);
  };

  const executeRemove = async () => {
    if (!pendingRemoveId) return;
    setProcessing(pendingRemoveId);
    try {
      await clinicService.removeAffiliation(pendingRemoveId);
      await loadData();
    } catch (error) {
      console.error('Error removing:', error);
    } finally {
      setProcessing(null);
      setRemoveConfirmOpen(false);
      setPendingRemoveId(null);
    }
  };

  const filteredAffiliations = affiliations.filter(aff => {
    const matchesTab = activeTab === 'all' || aff.status === activeTab;
    const name = `${aff.providers?.user_profiles?.first_name} ${aff.providers?.user_profiles?.last_name}`.toLowerCase();
    const matchesSearch = !searchQuery || name.includes(searchQuery.toLowerCase()) ||
      (aff.providers?.specialty || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: affiliations.length },
    { key: 'active', label: 'Active', count: affiliations.filter(a => a.status === 'active').length },
    { key: 'pending', label: 'Pending', count: affiliations.filter(a => a.status === 'pending').length },
    { key: 'inactive', label: 'Inactive', count: affiliations.filter(a => a.status === 'inactive' || a.status === 'rejected').length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Link2 size={48} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Clinic Found</h2>
          <p className="text-gray-500">Your clinic hasn't been set up yet.</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Affiliation Management</h1>
        <p className="text-gray-500 mt-1">Review, approve, and manage provider affiliations with {clinic.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
              placeholder="Search by name or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {filteredAffiliations.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Link2 size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No affiliations found</p>
            <p className="text-sm mt-1">
              {activeTab === 'pending' ? 'No pending requests to review.' : 'No affiliations match your criteria.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAffiliations.map((aff) => {
              const isProcessing = processing === aff.id;
              return (
                <div key={aff.id} className="p-5 hover:bg-gray-50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {aff.providers?.user_profiles?.first_name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          Dr. {aff.providers?.user_profiles?.first_name} {aff.providers?.user_profiles?.last_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {aff.providers?.specialty || 'General Practice'}
                          {aff.providers?.professional_title && ` | ${aff.providers.professional_title}`}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>{aff.providers?.user_profiles?.email}</span>
                          {aff.providers?.user_profiles?.phone && <span>{aff.providers.user_profiles.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right mr-2">
                        <span className="text-xs text-gray-500 capitalize">{aff.role_at_clinic?.replace(/_/g, ' ')}</span>
                        <div className="mt-0.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            aff.status === 'active' ? 'bg-green-100 text-green-800' :
                            aff.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            aff.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {aff.status}
                          </span>
                        </div>
                      </div>

                      {aff.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(aff.id)}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button
                            onClick={() => { setSelectedAff(aff); setShowRejectModal(true); }}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      )}

                      {aff.status === 'active' && (
                        <button
                          onClick={() => handleRemove(aff.id)}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                        >
                          <UserMinus size={14} /> Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {aff.notes && (
                    <div className="mt-3 ml-16 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                      {aff.notes}
                    </div>
                  )}

                  <div className="mt-2 ml-16 flex gap-4 text-xs text-gray-400">
                    {aff.start_date && <span>Start: {new Date(aff.start_date).toLocaleDateString()}</span>}
                    {aff.approved_at && <span>Approved: {new Date(aff.approved_at).toLocaleDateString()}</span>}
                    <span>Requested: {new Date(aff.requested_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showRejectModal && selectedAff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Reject Affiliation Request</h3>
            <p className="text-sm text-gray-500 mb-4">
              Reject the affiliation request from Dr. {selectedAff.providers?.user_profiles?.first_name} {selectedAff.providers?.user_profiles?.last_name}?
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
                onClick={() => { setShowRejectModal(false); setSelectedAff(null); setRejectReason(''); }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing === selectedAff.id}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    <ConfirmDialog
      open={removeConfirmOpen}
      onOpenChange={setRemoveConfirmOpen}
      title="Remove Affiliation"
      description="Are you sure you want to remove this provider affiliation?"
      confirmLabel="Remove"
      variant="destructive"
      onConfirm={executeRemove}
    />
    </>
  );
}
