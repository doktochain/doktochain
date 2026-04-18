import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Award, CheckCircle, Clock, FileText, Search, ShieldCheck,
  XCircle, ExternalLink, RotateCcw, User, Calendar, Building2,
} from 'lucide-react';
import { providerProfileService, ProviderCredential } from '../../../../services/providerProfileService';

type TabFilter = 'pending' | 'verified' | 'all';

type AdminCredential = ProviderCredential & {
  providers?: {
    id?: string;
    user_id?: string;
    specialty?: string;
    license_number?: string;
    user_profiles?: {
      first_name?: string;
      last_name?: string;
      email?: string;
    };
  };
};

export default function AdminProviderCredentials() {
  const [credentials, setCredentials] = useState<AdminCredential[]>([]);
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
      const rows = await providerProfileService.getAllCredentials(opts);
      setCredentials(rows as AdminCredential[]);
    } catch (error) {
      console.error('Error loading credentials:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string) => {
    setActionLoading(id);
    try {
      await providerProfileService.updateCredential(id, { is_verified: true } as any);
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

  const handleRevoke = async (id: string) => {
    setActionLoading(id);
    try {
      await providerProfileService.updateCredential(id, { is_verified: false } as any);
      toast.success('Verification revoked');
      await loadCredentials();
    } catch (error: any) {
      console.error('Failed to revoke verification:', error);
      toast.error(error?.message || 'Failed to revoke verification');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject and remove this credential? This cannot be undone.')) return;
    setActionLoading(id);
    try {
      await providerProfileService.deleteCredential(id);
      toast.success('Credential removed');
      await loadCredentials();
      setSelectedId(null);
    } catch (error: any) {
      console.error('Failed to remove credential:', error);
      toast.error(error?.message || 'Failed to remove credential');
    } finally {
      setActionLoading(null);
    }
  };

  const getProviderName = (c: AdminCredential) => {
    const p = c.providers?.user_profiles;
    if (!p) return 'Unknown provider';
    return `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown provider';
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return credentials;
    return credentials.filter(c => {
      const name = getProviderName(c).toLowerCase();
      const email = (c.providers?.user_profiles?.email || '').toLowerCase();
      return (
        name.includes(term) ||
        email.includes(term) ||
        (c.credential_name || '').toLowerCase().includes(term) ||
        (c.issuing_organization || '').toLowerCase().includes(term) ||
        (c.credential_number || '').toLowerCase().includes(term) ||
        (c.providers?.specialty || '').toLowerCase().includes(term)
      );
    });
  }, [credentials, searchTerm]);

  const selected = useMemo(
    () => credentials.find(c => c.id === selectedId) || null,
    [credentials, selectedId]
  );

  const tabs: { key: TabFilter; label: string; badge?: number }[] = [
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
            Review and verify provider-submitted licenses, certifications, and qualifications
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
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {getProviderName(c)}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {c.issuing_organization}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full capitalize ${credentialTypeBadge(c.credential_type)}`}>
                            {(c.credential_type || '').replace(/_/g, ' ')}
                          </span>
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
                </div>

                <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg">
                  {!selected.is_verified ? (
                    <button
                      onClick={() => handleVerify(selected.id)}
                      disabled={actionLoading === selected.id}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark Verified
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRevoke(selected.id)}
                      disabled={actionLoading === selected.id}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 font-medium"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Revoke Verification
                    </button>
                  )}
                  <button
                    onClick={() => handleReject(selected.id)}
                    disabled={actionLoading === selected.id}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject &amp; Remove
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
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Name</dt>
                        <dd className="font-medium text-gray-900">{getProviderName(selected)}</dd>
                      </div>
                      {selected.providers?.user_profiles?.email && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Email</dt>
                          <dd className="font-medium text-gray-900">{selected.providers.user_profiles.email}</dd>
                        </div>
                      )}
                      {selected.providers?.specialty && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Specialty</dt>
                          <dd className="font-medium text-gray-900">{selected.providers.specialty}</dd>
                        </div>
                      )}
                      {selected.providers?.license_number && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">License #</dt>
                          <dd className="font-medium text-gray-900">{selected.providers.license_number}</dd>
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
