import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { consentService, ConsentRecord } from '../../services/consentService';
import { auditTrailService, AuditTrailEntry } from '../../services/auditTrailService';
import { patientService } from '../../services/patientService';
import { supabase } from '../../lib/supabase';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Clock,
  Search,
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  User,
  CalendarClock,
  Eye,
  Timer,
} from 'lucide-react';

type ConsentTab = 'active' | 'expired' | 'revoked' | 'access-log';

const RECORD_TYPE_OPTIONS = [
  { value: 'observations', label: 'Vital Signs & Observations' },
  { value: 'conditions', label: 'Conditions & Diagnoses' },
  { value: 'medications', label: 'Medications' },
  { value: 'procedures', label: 'Procedures' },
  { value: 'lab_results', label: 'Lab Results' },
  { value: 'clinical_notes', label: 'Clinical Notes' },
  { value: 'allergies', label: 'Allergies' },
  { value: 'immunizations', label: 'Immunizations' },
  { value: 'prescription', label: 'Prescriptions' },
];

const DURATION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
  { value: 0, label: 'No expiration' },
];

interface ProviderResult {
  id: string;
  user_id: string;
  user_profiles: { first_name: string; last_name: string } | null;
  specialty?: string;
}

export default function ConsentManager() {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [accessLogs, setAccessLogs] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<ConsentTab>('active');
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadPatientAndConsents();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'access-log' && patientId && accessLogs.length === 0) {
      loadAccessLogs();
    }
  }, [activeTab, patientId]);

  const loadPatientAndConsents = async () => {
    if (!user) return;
    setLoading(true);

    const patient = await patientService.getPatientByUserId(user.id);
    if (!patient) {
      setLoading(false);
      return;
    }

    setPatientId(patient.id);
    const { data } = await consentService.getPatientConsents(patient.id);
    if (data) {
      setConsents(data);
    }
    setLoading(false);
  };

  const loadAccessLogs = async () => {
    if (!patientId) return;
    setLoadingLogs(true);
    try {
      const logs = await auditTrailService.getPatientAccessLog(patientId, 200);
      setAccessLogs(logs);
    } catch {
      setAccessLogs([]);
    }
    setLoadingLogs(false);
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleRevoke = async (consent: ConsentRecord) => {
    if (!patientId) return;
    setRevoking(consent.id);

    const { error } = await consentService.revokeConsent(consent.id, patientId, consent.provider_id || '');
    if (error) {
      showToast('error', 'Failed to revoke access');
    } else {
      showToast('success', 'Access revoked successfully');
      await loadPatientAndConsents();
    }
    setRevoking(null);
  };

  const handleGrantComplete = async () => {
    setShowGrantModal(false);
    await loadPatientAndConsents();
    showToast('success', 'Access granted successfully');
  };

  const now = new Date();

  const isConsentActive = (c: ConsentRecord) => {
    if (c.status !== 'active') return false;
    if (c.consent_scope === 'appointment') {
      if (!c.access_start || !c.access_end) return false;
      return new Date(c.access_start) <= now && new Date(c.access_end) >= now;
    }
    if (new Date(c.start_date) > now) return false;
    if (c.end_date && new Date(c.end_date) < now) return false;
    return true;
  };

  const isConsentExpired = (c: ConsentRecord) => {
    if (c.status !== 'active') return false;
    if (c.consent_scope === 'appointment') {
      return c.access_end ? new Date(c.access_end) < now : false;
    }
    return c.end_date ? new Date(c.end_date) < now : false;
  };

  const activeConsents = consents.filter(isConsentActive);
  const expiredConsents = consents.filter(isConsentExpired);
  const revokedConsents = consents.filter((c) => c.status === 'revoked');

  const getDisplayConsents = () => {
    switch (activeTab) {
      case 'active': return activeConsents;
      case 'expired': return expiredConsents;
      case 'revoked': return revokedConsents;
      default: return [];
    }
  };

  const getTimeRemaining = (consent: ConsentRecord) => {
    if (consent.consent_scope === 'appointment') {
      if (!consent.access_end) return 'No expiration';
      const end = new Date(consent.access_end);
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) return 'Window closed';
      const minutes = Math.floor(diff / (1000 * 60));
      if (minutes < 60) return `${minutes}m remaining`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m remaining`;
    }

    if (!consent.end_date) return 'No expiration';
    const end = new Date(consent.end_date);
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 30) return `${Math.floor(days / 30)} months remaining`;
    if (days === 0) return 'Expires today';
    return `${days} day${days === 1 ? '' : 's'} remaining`;
  };

  const isExpiringSoon = (consent: ConsentRecord) => {
    if (consent.consent_scope === 'appointment') {
      if (!consent.access_end) return false;
      const diff = new Date(consent.access_end).getTime() - now.getTime();
      return diff > 0 && diff <= 10 * 60 * 1000;
    }
    if (!consent.end_date) return false;
    const diff = new Date(consent.end_date).getTime() - now.getTime();
    return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  };

  const getProviderName = (consent: any) => {
    const provider = consent.providers;
    if (!provider) return 'Unknown Provider';
    const profile = provider.user_profiles;
    if (!profile) return 'Unknown Provider';
    return `Dr. ${profile.first_name} ${profile.last_name}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            Data Access Consents
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Control which providers can access your health records
          </p>
        </div>
        <button
          onClick={() => setShowGrantModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Grant Access
        </button>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {([
            { key: 'active' as ConsentTab, label: 'Active', count: activeConsents.length, icon: ShieldCheck },
            { key: 'expired' as ConsentTab, label: 'Expired', count: expiredConsents.length, icon: Clock },
            { key: 'revoked' as ConsentTab, label: 'Revoked', count: revokedConsents.length, icon: ShieldOff },
            { key: 'access-log' as ConsentTab, label: 'Access Log', count: accessLogs.length, icon: Eye },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'access-log' ? (
        <AccessLogView logs={accessLogs} loading={loadingLogs} />
      ) : (
        <div className="space-y-3">
          {getDisplayConsents().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No {activeTab} consents</p>
              <p className="text-sm mt-1">
                {activeTab === 'active'
                  ? 'Grant access to a provider to share your health records'
                  : `You have no ${activeTab} consent records`}
              </p>
            </div>
          ) : (
            getDisplayConsents().map((consent) => (
              <ConsentCard
                key={consent.id}
                consent={consent}
                activeTab={activeTab}
                providerName={getProviderName(consent)}
                timeRemaining={getTimeRemaining(consent)}
                expiringSoon={isExpiringSoon(consent)}
                revoking={revoking === consent.id}
                onRevoke={() => handleRevoke(consent)}
              />
            ))
          )}
        </div>
      )}

      {showGrantModal && patientId && (
        <GrantConsentModal
          patientId={patientId}
          onClose={() => setShowGrantModal(false)}
          onComplete={handleGrantComplete}
        />
      )}
    </div>
  );
}

function ConsentCard({
  consent,
  activeTab,
  providerName,
  timeRemaining,
  expiringSoon,
  revoking,
  onRevoke,
}: {
  consent: ConsentRecord;
  activeTab: string;
  providerName: string;
  timeRemaining: string;
  expiringSoon: boolean;
  revoking: boolean;
  onRevoke: () => void;
}) {
  const isAppointment = consent.consent_scope === 'appointment';

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        expiringSoon
          ? 'border-amber-300 bg-amber-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            isAppointment
              ? 'bg-blue-100 text-blue-600'
              : activeTab === 'active'
              ? 'bg-teal-100 text-teal-600'
              : activeTab === 'expired'
              ? 'bg-gray-100 text-gray-500'
              : 'bg-red-100 text-red-500'
          }`}>
            {isAppointment ? <CalendarClock className="w-5 h-5" /> : <User className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{providerName}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isAppointment
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-teal-50 text-teal-700 border border-teal-200'
              }`}>
                {isAppointment ? (
                  <>
                    <Timer className="w-3 h-3" />
                    Appointment
                  </>
                ) : (
                  <>
                    <Shield className="w-3 h-3" />
                    Broad
                  </>
                )}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {consent.consent_type === 'record_access' ? 'Record Access' :
               consent.consent_type === 'treatment' ? 'Treatment' :
               consent.consent_type === 'data_sharing' ? 'Data Sharing' :
               consent.consent_type}
            </p>
            {isAppointment && consent.access_start && consent.access_end && (
              <p className="text-xs text-blue-600 mt-1">
                Window: {new Date(consent.access_start).toLocaleString()} - {new Date(consent.access_end).toLocaleString()}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {consent.record_types && consent.record_types.length > 0 ? (
                consent.record_types.map((rt) => (
                  <span
                    key={rt}
                    className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    {RECORD_TYPE_OPTIONS.find((o) => o.value === rt)?.label || rt}
                  </span>
                ))
              ) : (
                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs">
                  All Records
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <div className="text-xs text-gray-500">
            {isAppointment ? 'Auto-created' : `Granted ${new Date(consent.start_date).toLocaleDateString()}`}
          </div>
          {activeTab === 'active' && (
            <>
              <div className={`text-xs mt-1 font-medium ${
                expiringSoon ? 'text-amber-600' : 'text-gray-600'
              }`}>
                {expiringSoon && (
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                )}
                {timeRemaining}
              </div>
              <button
                onClick={onRevoke}
                disabled={revoking}
                className="mt-2 px-3 py-1 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {revoking ? 'Revoking...' : 'Revoke Access'}
              </button>
            </>
          )}
          {activeTab === 'revoked' && consent.revoked_at && (
            <div className="text-xs text-red-600 mt-1">
              Revoked {new Date(consent.revoked_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ACCESS_LOG_EVENT_LABELS: Record<string, { label: string; color: string }> = {
  data_access: { label: 'Data Accessed', color: 'bg-blue-100 text-blue-700' },
  cross_provider_access: { label: 'Cross-Provider Access', color: 'bg-amber-100 text-amber-700' },
  record_accessed: { label: 'Record Viewed', color: 'bg-gray-100 text-gray-700' },
  consent_granted: { label: 'Consent Granted', color: 'bg-green-100 text-green-700' },
  consent_revoked: { label: 'Consent Revoked', color: 'bg-red-100 text-red-700' },
  consent_window_created: { label: 'Appointment Window Created', color: 'bg-blue-50 text-blue-600' },
};

function AccessLogView({ logs, loading }: { logs: AuditTrailEntry[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Eye className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">No access events recorded</p>
        <p className="text-sm mt-1">
          All data access events will appear here for full transparency
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-3">
        Every time a provider accesses your data, it is recorded on a tamper-proof cryptographic audit trail.
      </p>
      {logs.map((log) => {
        const eventMeta = ACCESS_LOG_EVENT_LABELS[log.event_type] || { label: log.event_type.replace(/_/g, ' '), color: 'bg-gray-100 text-gray-700' };

        return (
          <div key={log.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${eventMeta.color}`}>
                  {eventMeta.label}
                </span>
                {log.actor_role && (
                  <span className="text-xs text-gray-500 capitalize">{log.actor_role}</span>
                )}
              </div>
              <span className="text-xs text-gray-400">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
            {log.action_data && (
              <div className="mt-1.5 text-xs text-gray-600">
                {log.action_data.accessed_data && (
                  <span>Records: {log.action_data.accessed_data}</span>
                )}
                {log.action_data.consent_scope && (
                  <span className="ml-2">Scope: {log.action_data.consent_scope}</span>
                )}
                {log.action_data.originating_provider_ids && (
                  <span className="ml-2">
                    Cross-provider: {log.action_data.originating_provider_ids.length} other provider(s)
                  </span>
                )}
              </div>
            )}
            <div className="mt-1 text-xs text-gray-400 font-mono truncate">
              Hash: {log.current_hash.substring(0, 24)}...
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GrantConsentModal({
  patientId,
  onClose,
  onComplete,
}: {
  patientId: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProviderResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderResult | null>(null);
  const [selectedRecordTypes, setSelectedRecordTypes] = useState<string[]>([]);
  const [allRecords, setAllRecords] = useState(true);
  const [durationDays, setDurationDays] = useState(90);
  const [submitting, setSubmitting] = useState(false);

  const searchProviders = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);

    const { data } = await supabase
      .from('providers')
      .select('id, user_id, specialty, user_profiles:user_id(first_name, last_name)')
      .or(`user_profiles.first_name.ilike.%${query}%,user_profiles.last_name.ilike.%${query}%`)
      .limit(10);

    setSearchResults((data as unknown as ProviderResult[]) || []);
    setSearching(false);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery) searchProviders(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleSubmit = async () => {
    if (!selectedProvider) return;
    setSubmitting(true);

    const { error } = await consentService.grantConsent({
      patientId,
      providerId: selectedProvider.id,
      consentType: 'record_access',
      recordTypes: allRecords ? [] : selectedRecordTypes,
      durationDays: durationDays === 0 ? undefined : durationDays,
    });

    if (error) {
      setSubmitting(false);
      return;
    }

    onComplete();
  };

  const getProviderDisplayName = (p: ProviderResult) => {
    if (!p.user_profiles) return 'Unknown Provider';
    return `Dr. ${p.user_profiles.first_name} ${p.user_profiles.last_name}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Grant Data Access</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              This grants <strong>broad consent</strong> for ongoing access. Appointment-scoped consent
              is created automatically when you book an appointment.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Provider
            </label>
            {selectedProvider ? (
              <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {getProviderDisplayName(selectedProvider)}
                    </p>
                    {selectedProvider.specialty && (
                      <p className="text-xs text-gray-500">{selectedProvider.specialty}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProvider(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by provider name..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => {
                          setSelectedProvider(provider);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {getProviderDisplayName(provider)}
                          </p>
                          {provider.specialty && (
                            <p className="text-xs text-gray-500">{provider.specialty}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Records to Share
            </label>
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={allRecords}
                onChange={(e) => {
                  setAllRecords(e.target.checked);
                  if (e.target.checked) setSelectedRecordTypes([]);
                }}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700 font-medium">All record types</span>
            </label>
            {!allRecords && (
              <div className="grid grid-cols-2 gap-2 pl-6">
                {RECORD_TYPE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRecordTypes.includes(opt.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRecordTypes([...selectedRecordTypes, opt.value]);
                        } else {
                          setSelectedRecordTypes(selectedRecordTypes.filter((v) => v !== opt.value));
                        }
                      }}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDurationDays(opt.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    durationDays === opt.value
                      ? 'border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedProvider || submitting || (!allRecords && selectedRecordTypes.length === 0)}
            className="px-5 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Granting...' : 'Grant Access'}
          </button>
        </div>
      </div>
    </div>
  );
}
