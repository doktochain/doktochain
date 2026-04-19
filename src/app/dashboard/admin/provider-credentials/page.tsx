import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Award, CheckCircle, Clock, FileText, Search, ShieldCheck,
  XCircle, ExternalLink, RotateCcw, User, Calendar, Building2, UploadCloud,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { api } from '../../../../lib/api-client';
import { providerProfileService, ProviderCredential } from '../../../../services/providerProfileService';
import { providerOnboardingService } from '../../../../services/providerOnboardingService';

type TabFilter = 'pending' | 'verified' | 'all';
type SourceType = 'credential' | 'onboarding';

type AdminCredential = ProviderCredential & {
  _source: SourceType;
  _application_id?: string;
  _document_id?: string;
  _document_type?: string;
  provider_name?: string;
  provider_email?: string;
  provider_specialty?: string;
  provider_license?: string;
};

export default function AdminProviderCredentials() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AdminCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadCredentials();
  }, [activeTab]);

  const loadCredentials = async () => {
    try {
      setLoading(true);

      const opts: { is_verified?: boolean; limit?: number } = { limit: 200 };
      if (activeTab === 'pending') opts.is_verified = false;
      if (activeTab === 'verified') opts.is_verified = true;

      const [credentialsRaw, documentsRaw] = await Promise.all([
        providerProfileService.getAllCredentials(opts),
        loadOnboardingDocuments(activeTab),
      ]);

      const providerIds = Array.from(
        new Set(
          credentialsRaw
            .map(c => c.provider_id)
            .filter((x): x is string => !!x)
        )
      );

      let providersById = new Map<string, any>();
      let userProfilesById = new Map<string, any>();

      if (providerIds.length > 0) {
        const providers = await fetchProvidersByIds(providerIds);
        providersById = new Map(providers.map((p: any) => [p.id, p]));

        const userIds = Array.from(
          new Set(
            providers
              .map((p: any) => p.user_id)
              .filter((x: string | undefined) => !!x)
          )
        ) as string[];

        if (userIds.length > 0) {
          const profiles = await fetchUserProfilesByIds(userIds);
          userProfilesById = new Map(profiles.map((p: any) => [p.id, p]));
        }
      }

      const enrichedCredentials: AdminCredential[] = credentialsRaw.map((c) => {
        const prov = c.provider_id ? providersById.get(c.provider_id) : null;
        const up = prov?.user_id ? userProfilesById.get(prov.user_id) : null;
        const fullName = up
          ? `${up.first_name || ''} ${up.last_name || ''}`.trim()
          : '';
        return {
          ...c,
          _source: 'credential' as SourceType,
          provider_name: fullName || 'Unknown provider',
          provider_email: up?.email,
          provider_specialty: prov?.specialty,
          provider_license: prov?.license_number,
        };
      });

      const combined = [...enrichedCredentials, ...documentsRaw].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRows(combined);
    } catch (error) {
      console.error('Error loading credentials:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const fetchProvidersByIds = async (ids: string[]): Promise<any[]> => {
    if (ids.length === 0) return [];
    const { data, error } = await api.get<any[]>('/providers', {
      params: { id_in: ids.join(','), limit: ids.length },
    });
    if (error) {
      console.warn('Failed to fetch providers', error);
      return [];
    }
    return Array.isArray(data) ? data : [];
  };

  const fetchUserProfilesByIds = async (ids: string[]): Promise<any[]> => {
    if (ids.length === 0) return [];
    const { data, error } = await api.get<any[]>('/user-profiles', {
      params: { id_in: ids.join(','), limit: ids.length },
    });
    if (error) {
      console.warn('Failed to fetch user profiles', error);
      return [];
    }
    return Array.isArray(data) ? data : [];
  };

  const loadOnboardingDocuments = async (tab: TabFilter): Promise<AdminCredential[]> => {
    try {
      const params: Record<string, any> = { order_by: 'uploaded_at:desc', limit: 200 };
      if (tab === 'pending') params.verification_status = 'pending';
      if (tab === 'verified') params.verification_status = 'verified';

      const { data: docs, error } = await api.get<any[]>('/provider-verification-documents', { params });
      if (error || !Array.isArray(docs) || docs.length === 0) return [];

      const appIds = Array.from(new Set(docs.map(d => d.application_id).filter(Boolean)));
      let appsById = new Map<string, any>();
      if (appIds.length > 0) {
        const { data: apps } = await api.get<any[]>('/provider-onboarding-applications', {
          params: { id_in: appIds.join(','), limit: appIds.length },
        });
        if (Array.isArray(apps)) {
          appsById = new Map(apps.map((a: any) => [a.id, a]));
        }
      }

      return docs.map((d: any): AdminCredential => {
        const app = d.application_id ? appsById.get(d.application_id) : null;
        const fullName = app
          ? `${app.first_name || ''} ${app.last_name || ''}`.trim()
          : '';
        return {
          id: `onboarding-${d.id}`,
          provider_id: d.provider_id || '',
          credential_type: mapDocTypeToCredentialType(d.document_type),
          credential_name: d.document_name || (d.document_type || 'Document').replace(/_/g, ' '),
          issuing_organization: 'Submitted during onboarding',
          document_url: d.file_url,
          is_verified: d.verification_status === 'verified',
          created_at: d.uploaded_at || d.created_at || new Date().toISOString(),
          _source: 'onboarding',
          _application_id: d.application_id,
          _document_id: d.id,
          _document_type: d.document_type,
          provider_name: fullName || 'Pending applicant',
          provider_email: app?.email,
          provider_specialty: app?.specialty,
          provider_license: app?.license_number,
        };
      });
    } catch (err) {
      console.warn('Failed to load onboarding documents', err);
      return [];
    }
  };

  const mapDocTypeToCredentialType = (docType: string): string => {
    const t = (docType || '').toLowerCase();
    if (t.includes('license')) return 'license';
    if (t.includes('board') || t.includes('certification')) return 'certification';
    if (t.includes('degree') || t.includes('diploma') || t.includes('education')) return 'degree';
    if (t.includes('fellowship')) return 'fellowship';
    return 'other';
  };

  const handleVerify = async (row: AdminCredential) => {
    setActionLoading(row.id);
    try {
      if (row._source === 'onboarding' && row._document_id) {
        await providerOnboardingService.verifyDocument(row._document_id, 'verified', user!.id);
      } else {
        await providerProfileService.updateCredential(row.id, { is_verified: true } as any);
      }
      toast.success('Credential verified');
      await loadCredentials();
      setSelectedId(null);
    } catch (error: any) {
      console.error('Failed to verify credential:', error);
      toast.error(error?.message || 'Failed to verify credential');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (row: AdminCredential) => {
    setActionLoading(row.id);
    try {
      if (row._source === 'onboarding' && row._document_id) {
        await providerOnboardingService.verifyDocument(row._document_id, 'pending' as any, user!.id, 'Verification revoked');
      } else {
        await providerProfileService.updateCredential(row.id, { is_verified: false } as any);
      }
      toast.success('Verification revoked');
      await loadCredentials();
    } catch (error: any) {
      console.error('Failed to revoke verification:', error);
      toast.error(error?.message || 'Failed to revoke verification');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (row: AdminCredential) => {
    const label = row._source === 'onboarding' ? 'Reject this onboarding document?' : 'Reject and remove this credential? This cannot be undone.';
    if (!confirm(label)) return;
    setActionLoading(row.id);
    try {
      if (row._source === 'onboarding' && row._document_id) {
        await providerOnboardingService.verifyDocument(row._document_id, 'rejected', user!.id, 'Rejected by admin');
      } else {
        await providerProfileService.deleteCredential(row.id);
      }
      toast.success(row._source === 'onboarding' ? 'Document marked as rejected' : 'Credential removed');
      await loadCredentials();
      setSelectedId(null);
    } catch (error: any) {
      console.error('Failed to reject credential:', error);
      toast.error(error?.message || 'Failed to reject credential');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(c => {
      return (
        (c.provider_name || '').toLowerCase().includes(term) ||
        (c.provider_email || '').toLowerCase().includes(term) ||
        (c.credential_name || '').toLowerCase().includes(term) ||
        (c.issuing_organization || '').toLowerCase().includes(term) ||
        (c.credential_number || '').toLowerCase().includes(term) ||
        (c.provider_specialty || '').toLowerCase().includes(term)
      );
    });
  }, [rows, searchTerm]);

  const selected = useMemo(
    () => rows.find(c => c.id === selectedId) || null,
    [rows, selectedId]
  );

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'pending', label: 'Pending Review' },
    { key: 'verified', label: 'Verified' },
    { key: 'all', label: 'All' },
  ];

  const credentialTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      license: 'bg-blue-100 text-blue-700',
      certification: 'bg-purple-100 text-purple-700',
      board_certification: 'bg-purple-100 text-purple-700',
      degree: 'bg-indigo-100 text-indigo-700',
      fellowship: 'bg-pink-100 text-pink-700',
      residency: 'bg-teal-100 text-teal-700',
    };
    return map[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-sky-600" />
            Provider Credentials
          </h1>
          <p className="text-gray-600 mt-1">
            Review and verify provider-submitted licenses, certifications, and onboarding documents
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedId(null); }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by provider, credential, organization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Award className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No credentials found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[calc(100vh-320px)] overflow-y-auto">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      selectedId === c.id ? 'bg-sky-50 border-l-4 border-l-sky-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {c.credential_name}
                        </p>
                        <p className="text-xs text-gray-600 truncate mt-0.5">
                          {c.provider_name}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {c.issuing_organization}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full capitalize ${credentialTypeBadge(c.credential_type)}`}>
                            {(c.credential_type || '').replace(/_/g, ' ')}
                          </span>
                          {c._source === 'onboarding' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-sky-100 text-sky-700">
                              <UploadCloud className="w-3 h-3" />
                              Onboarding
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {c.is_verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 text-emerald-700">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow min-h-[600px]">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                <Award className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">Select a credential to review</p>
                <p className="text-sm mt-1">Click on a credential from the list to view details</p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center">
                        <Award className="w-6 h-6 text-sky-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {selected.credential_name}
                        </h2>
                        <p className="text-gray-500">{selected.issuing_organization}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {selected.is_verified ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-4 h-4" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-amber-100 text-amber-700">
                        <Clock className="w-4 h-4" />
                        Pending Review
                      </span>
                    )}
                    {selected._source === 'onboarding' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-sky-100 text-sky-700">
                        <UploadCloud className="w-3 h-3" />
                        From onboarding
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg">
                  {!selected.is_verified ? (
                    <button
                      onClick={() => handleVerify(selected)}
                      disabled={actionLoading === selected.id}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark Verified
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRevoke(selected)}
                      disabled={actionLoading === selected.id}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 font-medium"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Revoke Verification
                    </button>
                  )}
                  <button
                    onClick={() => handleReject(selected)}
                    disabled={actionLoading === selected.id}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    {selected._source === 'onboarding' ? 'Reject Document' : 'Reject & Remove'}
                  </button>
                  {selected.document_url && (
                    <a
                      href={selected.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Document
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-sky-600" />
                      <h3 className="font-semibold text-gray-900">Provider</h3>
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-500">Name</dt>
                        <dd className="font-medium text-gray-900 text-right">{selected.provider_name}</dd>
                      </div>
                      {selected.provider_email && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-gray-500">Email</dt>
                          <dd className="font-medium text-gray-900 text-right truncate max-w-[220px]">{selected.provider_email}</dd>
                        </div>
                      )}
                      {selected.provider_specialty && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-gray-500">Specialty</dt>
                          <dd className="font-medium text-gray-900 text-right">{selected.provider_specialty}</dd>
                        </div>
                      )}
                      {selected.provider_license && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-gray-500">License #</dt>
                          <dd className="font-medium text-gray-900 text-right">{selected.provider_license}</dd>
                        </div>
                      )}
                      {selected._source === 'onboarding' && selected._application_id && (
                        <div className="pt-2 mt-2 border-t border-gray-100">
                          <a
                            href={`/dashboard/admin/provider-applications?application=${selected._application_id}`}
                            className="text-xs text-sky-600 hover:text-sky-800 inline-flex items-center gap-1"
                          >
                            Open application
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-sky-600" />
                      <h3 className="font-semibold text-gray-900">Credential</h3>
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Type</dt>
                        <dd className="font-medium text-gray-900 capitalize">
                          {(selected.credential_type || '').replace(/_/g, ' ')}
                        </dd>
                      </div>
                      {selected._document_type && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Doc Type</dt>
                          <dd className="font-medium text-gray-900 capitalize">
                            {(selected._document_type || '').replace(/_/g, ' ')}
                          </dd>
                        </div>
                      )}
                      {selected.credential_number && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Number</dt>
                          <dd className="font-medium text-gray-900">{selected.credential_number}</dd>
                        </div>
                      )}
                      {selected.issue_date && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Issue Date</dt>
                          <dd className="font-medium text-gray-900">
                            {new Date(selected.issue_date).toLocaleDateString()}
                          </dd>
                        </div>
                      )}
                      {selected.expiry_date && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Expiry Date</dt>
                          <dd className="font-medium text-gray-900">
                            {new Date(selected.expiry_date).toLocaleDateString()}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-sky-600" />
                    <h3 className="font-semibold text-gray-900">Submission</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Submitted {new Date(selected.created_at).toLocaleString()}
                  </p>
                  {!selected.document_url && (
                    <p className="mt-2 text-sm text-amber-600 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      No supporting document was attached to this credential.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
