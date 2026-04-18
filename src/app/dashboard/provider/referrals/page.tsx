import { useState, useEffect } from 'react';
import {
  ArrowRight, ArrowLeft, Send, Inbox, Plus, Search,
  CheckCircle, Clock, XCircle, Calendar, MapPin, ExternalLink,
  AlertTriangle, User, Building2, Phone, FileText, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { referralService, Referral, CreateReferralData } from '../../../../services/referralService';
import { providerService } from '../../../../services/providerService';
import { patientService } from '../../../../services/patientService';
import { useAuth } from '../../../../contexts/AuthContext';

type Tab = 'sent' | 'received';

export default function ProviderReferralsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('sent');
  const [sentReferrals, setSentReferrals] = useState<Referral[]>([]);
  const [receivedReferrals, setReceivedReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const provider = await providerService.getProviderByUserId(user!.id);
      if (!provider) return;
      setProviderId(provider.id);
      const [sent, received] = await Promise.all([
        referralService.getSentReferrals(provider.id),
        referralService.getReceivedReferrals(provider.id),
      ]);
      setSentReferrals(sent);
      setReceivedReferrals(received);
    } catch (error) {
      console.error('Error loading referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await referralService.acceptReferral(id);
      toast.success('Referral accepted');
      loadData();
    } catch {
      toast.error('Failed to accept referral');
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await referralService.declineReferral(id);
      toast.success('Referral declined');
      loadData();
    } catch {
      toast.error('Failed to decline referral');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await referralService.completeReferral(id);
      toast.success('Referral marked complete');
      loadData();
    } catch {
      toast.error('Failed to complete referral');
    }
  };

  const getProviderName = (provider: any) => {
    if (!provider?.user_profiles) return 'Unknown';
    return `Dr. ${provider.user_profiles.first_name} ${provider.user_profiles.last_name}`;
  };

  const getPatientName = (patients: any) => {
    if (!patients?.user_profiles) return 'Unknown Patient';
    return `${patients.user_profiles.first_name} ${patients.user_profiles.last_name}`;
  };

  const statusConfig: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: Clock },
    accepted: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: CheckCircle },
    scheduled: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', icon: Calendar },
    completed: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', icon: CheckCircle },
    declined: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: XCircle },
    cancelled: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', icon: XCircle },
    expired: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', icon: Clock },
  };

  const urgencyConfig: Record<string, string> = {
    routine: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    urgent: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    emergent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  const renderReferralCard = (referral: Referral, type: 'sent' | 'received') => {
    const sc = statusConfig[referral.status] || statusConfig.pending;
    const StatusIcon = sc.icon;
    const isExternal = !referral.receiving_provider_id && referral.external_provider_name;

    return (
      <div
        key={referral.id}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${urgencyConfig[referral.urgency] || urgencyConfig.routine}`}>
              {referral.urgency}
            </span>
            {isExternal && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                <ExternalLink className="w-3 h-3" />
                External
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {new Date(referral.created_at).toLocaleDateString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Patient</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" />
              {getPatientName(referral.patients)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {type === 'sent' ? 'Referred To' : 'Referred By'}
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
              {isExternal ? (
                <>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  {referral.external_provider_name}
                </>
              ) : (
                <>
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  {type === 'sent'
                    ? getProviderName(referral.receiving_provider)
                    : getProviderName(referral.referring_provider)
                  }
                </>
              )}
            </p>
            {isExternal && referral.external_provider_specialty && (
              <p className="text-xs text-gray-400 mt-0.5">{referral.external_provider_specialty}</p>
            )}
          </div>

          {referral.provider_locations && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Location</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {referral.provider_locations.city}, {referral.provider_locations.province}
              </p>
            </div>
          )}
        </div>

        {referral.referral_reason && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{referral.referral_reason}</p>
          </div>
        )}

        {isExternal && (referral.external_provider_phone || referral.external_provider_address) && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg space-y-1">
            {referral.external_provider_phone && (
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <Phone className="w-3 h-3" />
                {referral.external_provider_phone}
              </p>
            )}
            {referral.external_provider_address && (
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                {referral.external_provider_address}
              </p>
            )}
          </div>
        )}

        {type === 'received' && referral.status === 'pending' && (
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => handleAccept(referral.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Accept
            </button>
            <button
              onClick={() => handleDecline(referral.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Decline
            </button>
          </div>
        )}

        {type === 'received' && referral.status === 'accepted' && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => handleComplete(referral.id)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Mark Complete
            </button>
          </div>
        )}
      </div>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referrals</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage patient referrals to and from other providers
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Referral
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'sent'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <Send className="w-4 h-4" />
          Sent ({sentReferrals.length})
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'received'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Received ({receivedReferrals.length})
        </button>
      </div>

      {receivedReferrals.filter(r => r.status === 'pending').length > 0 && activeTab === 'received' && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            You have {receivedReferrals.filter(r => r.status === 'pending').length} pending referral(s) awaiting your response.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {(activeTab === 'sent' ? sentReferrals : receivedReferrals).length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {activeTab === 'sent' ? (
              <Send className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            ) : (
              <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No {activeTab} referrals
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {activeTab === 'sent'
                ? 'You haven\'t sent any referrals yet.'
                : 'No referrals have been sent to you yet.'}
            </p>
          </div>
        ) : (
          (activeTab === 'sent' ? sentReferrals : receivedReferrals).map(r =>
            renderReferralCard(r, activeTab)
          )
        )}
      </div>

      {showCreateModal && providerId && (
        <CreateReferralModal
          providerId={providerId}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); loadData(); }}
        />
      )}
    </div>
  );
}

function CreateReferralModal({
  providerId,
  onClose,
  onCreated,
}: {
  providerId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [referralType, setReferralType] = useState<'internal' | 'external'>('internal');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'emergent'>('routine');
  const [notes, setNotes] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalSpecialty, setExternalSpecialty] = useState('');
  const [externalPhone, setExternalPhone] = useState('');
  const [externalFax, setExternalFax] = useState('');
  const [externalAddress, setExternalAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const searchProviders = async (query: string) => {
    if (query.length < 2) return;
    try {
      const results = await referralService.searchProviders(query);
      setProviders(results.filter(p => p.id !== providerId));
    } catch {
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (providerSearch.length >= 2) searchProviders(providerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [providerSearch]);

  useEffect(() => {
    const term = patientSearch.trim();
    if (selectedPatient) return;
    if (term.length < 2) {
      setPatientResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const results = await patientService.searchPatients(term, 10);
        if (!cancelled) setPatientResults(results || []);
      } catch (err) {
        console.warn('Patient search failed', err);
        if (!cancelled) setPatientResults([]);
      } finally {
        if (!cancelled) setSearchingPatients(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [patientSearch, selectedPatient]);

  const handleSubmit = async () => {
    if (!selectedPatient) { toast.error('Select a patient'); return; }
    if (!reason) { toast.error('Enter a referral reason'); return; }
    if (referralType === 'internal' && !selectedProvider) { toast.error('Select a provider'); return; }
    if (referralType === 'external' && !externalName) { toast.error('Enter external provider name'); return; }

    setSubmitting(true);
    try {
      const data: CreateReferralData = {
        referring_provider_id: providerId,
        patient_id: selectedPatient.id,
        referral_reason: reason,
        urgency,
        notes: notes || undefined,
      };

      if (referralType === 'internal') {
        data.receiving_provider_id = selectedProvider.id;
        if (selectedLocation) data.preferred_location_id = selectedLocation;
      } else {
        data.external_provider_name = externalName;
        data.external_provider_specialty = externalSpecialty || undefined;
        data.external_provider_phone = externalPhone || undefined;
        data.external_provider_fax = externalFax || undefined;
        data.external_provider_address = externalAddress || undefined;
      }

      await referralService.createReferral(data);
      toast.success('Referral created');
      onCreated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create referral');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Referral</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Refer a patient to another provider (on-platform or external)
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex gap-2">
            {(['internal', 'external'] as const).map(type => (
              <button
                key={type}
                onClick={() => setReferralType(type)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  referralType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {type === 'internal' ? 'Platform Provider' : 'External Provider'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Patient *</label>
            {selectedPatient ? (
              <div className="flex items-start justify-between gap-3 p-3 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {`${selectedPatient.first_name || ''} ${selectedPatient.last_name || ''}`.trim() || 'Selected patient'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 space-x-2 truncate">
                    {selectedPatient.email && <span>{selectedPatient.email}</span>}
                    {selectedPatient.health_card_number && <span>· HC: {selectedPatient.health_card_number}</span>}
                    {selectedPatient.date_of_birth && (
                      <span>· DOB: {new Date(selectedPatient.date_of_birth).toLocaleDateString()}</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedPatient(null); setPatientSearch(''); setPatientResults([]); }}
                  className="text-gray-500 hover:text-red-600"
                  aria-label="Clear selected patient"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                    placeholder="Search by name, email, health card, or DOB (YYYY-MM-DD)..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                {searchingPatients && (
                  <p className="mt-2 text-xs text-gray-500">Searching...</p>
                )}
                {patientResults.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                    {patientResults.map(p => {
                      const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown patient';
                      const dob = p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : null;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setSelectedPatient(p); setPatientSearch(''); setPatientResults([]); }}
                          className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 space-x-2">
                            {p.email && <span>{p.email}</span>}
                            {p.health_card_number && <span>· HC: {p.health_card_number}</span>}
                            {dob && <span>· DOB: {dob}</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {!searchingPatients && patientSearch.trim().length >= 2 && patientResults.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">No patients found.</p>
                )}
              </>
            )}
          </div>

          {referralType === 'internal' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Provider</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={providerSearch}
                  onChange={e => setProviderSearch(e.target.value)}
                  placeholder="Search by name or specialty..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              {providers.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                  {providers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProvider(p); setProviderSearch(`Dr. ${p.user_profiles?.first_name} ${p.user_profiles?.last_name}`); }}
                      className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm ${
                        selectedProvider?.id === p.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        Dr. {p.user_profiles?.first_name} {p.user_profiles?.last_name}
                      </span>
                      <span className="text-gray-500 ml-2">{p.specialty}</span>
                      {p.provider_locations?.length > 0 && (
                        <span className="text-xs text-gray-400 block mt-0.5">
                          {p.provider_locations.map((l: any) => `${l.city}, ${l.province}`).join(' | ')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {selectedProvider?.provider_locations?.length > 0 && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Preferred Location</label>
                  <select
                    value={selectedLocation}
                    onChange={e => setSelectedLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">No preference</option>
                    {selectedProvider.provider_locations.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.location_name} - {loc.city}, {loc.province}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider Name *</label>
                  <input
                    type="text"
                    value={externalName}
                    onChange={e => setExternalName(e.target.value)}
                    placeholder="Dr. Jane Smith"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specialty</label>
                  <input
                    type="text"
                    value={externalSpecialty}
                    onChange={e => setExternalSpecialty(e.target.value)}
                    placeholder="Cardiology"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={externalPhone}
                    onChange={e => setExternalPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fax</label>
                  <input
                    type="tel"
                    value={externalFax}
                    onChange={e => setExternalFax(e.target.value)}
                    placeholder="(555) 123-4568"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  value={externalAddress}
                  onChange={e => setExternalAddress(e.target.value)}
                  placeholder="123 Medical Dr, Toronto, ON M5S 1A1"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason for Referral *</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Describe the reason for this referral..."
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Urgency</label>
              <select
                value={urgency}
                onChange={e => setUrgency(e.target.value as any)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergent">Emergent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional notes..."
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {submitting ? 'Creating...' : 'Create Referral'}
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
