import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, Clock, UserPlus, Mail, X, Send,
  MoreVertical, Phone, UserX, RefreshCw, Search, Filter,
  Stethoscope, Shield, AlertCircle, Copy, Link as LinkIcon,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  clinicService,
  Clinic,
  ClinicAffiliation,
  ClinicInvitation,
} from '../../../../services/clinicService';
import { api } from '../../../../lib/api-client';
import { ConfirmDialog } from '../../../../components/ui/confirm-dialog';

type TabType = 'active' | 'pending' | 'invitations';

export default function ClinicProvidersPage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [affiliations, setAffiliations] = useState<ClinicAffiliation[]>([]);
  const [invitations, setInvitations] = useState<ClinicInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = () => setActionMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const c = await clinicService.getClinicByOwnerId(user!.id);
      setClinic(c);
      if (c) {
        const [affs, invs] = await Promise.all([
          clinicService.getClinicAffiliations(c.id),
          clinicService.getClinicInvitations(c.id),
        ]);
        setAffiliations(affs);
        setInvitations(invs);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProvider = (affId: string) => {
    setPendingRemoveId(affId);
    setRemoveConfirmOpen(true);
  };

  const executeRemoveProvider = async () => {
    if (!pendingRemoveId) return;
    try {
      await clinicService.removeAffiliation(pendingRemoveId);
      await loadData();
    } catch (error) {
      console.error('Error removing provider:', error);
    } finally {
      setRemoveConfirmOpen(false);
      setPendingRemoveId(null);
    }
  };

  const handleApproveAffiliation = async (affId: string) => {
    try {
      await clinicService.approveAffiliation(affId);
      await loadData();
    } catch (error) {
      console.error('Error approving affiliation:', error);
    }
  };

  const handleRejectAffiliation = async (affId: string) => {
    try {
      await clinicService.rejectAffiliation(affId, 'Rejected by clinic administrator');
      await loadData();
    } catch (error) {
      console.error('Error rejecting affiliation:', error);
    }
  };

  const handleCancelInvitation = async (invId: string) => {
    try {
      await clinicService.cancelInvitation(invId);
      await loadData();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
    }
  };

  const handleResendInvitation = async (invId: string) => {
    try {
      await clinicService.resendInvitation(invId);
      try {
        await clinicService.sendInvitationEmail(invId);
      } catch {}
      await loadData();
    } catch (error) {
      console.error('Error resending invitation:', error);
    }
  };

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
          <Users size={48} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Clinic Found</h2>
          <p className="text-gray-500">Your clinic hasn't been set up yet.</p>
        </div>
      </div>
    );
  }

  const activeAffiliations = affiliations.filter(a => a.status === 'active');
  const pendingAffiliations = affiliations.filter(a => a.status === 'pending');
  const pendingInvitations = invitations.filter(i => i.status === 'pending');

  const filterBySearch = (name: string) =>
    !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase());

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'active', label: 'Active Providers', count: activeAffiliations.length },
    { key: 'pending', label: 'Pending Requests', count: pendingAffiliations.length },
    { key: 'invitations', label: 'Invitations', count: pendingInvitations.length },
  ];

  return (
    <>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Provider Management</h1>
          <p className="text-gray-500 mt-1">Manage providers affiliated with {clinic.name}</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <UserPlus size={18} />
          Invite Provider
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Providers" value={affiliations.length} color="blue" />
        <StatCard icon={CheckCircle} label="Active" value={activeAffiliations.length} color="green" />
        <StatCard icon={Clock} label="Pending Requests" value={pendingAffiliations.length} color="amber" />
        <StatCard icon={Mail} label="Invitations Sent" value={pendingInvitations.length} color="sky" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 px-5">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search providers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56"
            />
          </div>
        </div>

        {activeTab === 'active' && (
          <ActiveProvidersList
            affiliations={activeAffiliations}
            filterBySearch={filterBySearch}
            actionMenuId={actionMenuId}
            setActionMenuId={setActionMenuId}
            onRemove={handleRemoveProvider}
          />
        )}

        {activeTab === 'pending' && (
          <PendingRequestsList
            affiliations={pendingAffiliations}
            filterBySearch={filterBySearch}
            onApprove={handleApproveAffiliation}
            onReject={handleRejectAffiliation}
          />
        )}

        {activeTab === 'invitations' && (
          <InvitationsList
            invitations={invitations}
            filterBySearch={filterBySearch}
            onCancel={handleCancelInvitation}
            onResend={handleResendInvitation}
          />
        )}
      </div>

      {showInviteModal && clinic && (
        <InviteProviderModal
          clinic={clinic}
          userId={user!.id}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            loadData();
            setActiveTab('invitations');
          }}
        />
      )}
    </div>
    <ConfirmDialog
      open={removeConfirmOpen}
      onOpenChange={setRemoveConfirmOpen}
      title="Remove Provider"
      description="Are you sure you want to remove this provider from the clinic?"
      confirmLabel="Remove"
      variant="destructive"
      onConfirm={executeRemoveProvider}
    />
    </>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Users;
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-600' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 ${c.bg} rounded-lg`}>
          <Icon size={20} className={c.text} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ActiveProvidersList({ affiliations, filterBySearch, actionMenuId, setActionMenuId, onRemove }: {
  affiliations: ClinicAffiliation[];
  filterBySearch: (name: string) => boolean;
  actionMenuId: string | null;
  setActionMenuId: (id: string | null) => void;
  onRemove: (id: string) => void;
}) {
  const filtered = affiliations.filter(aff => {
    const name = `${aff.providers?.user_profiles?.first_name || ''} ${aff.providers?.user_profiles?.last_name || ''}`;
    return filterBySearch(name);
  });

  if (filtered.length === 0) {
    return (
      <div className="p-12 text-center">
        <Users size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No active providers</p>
        <p className="text-sm text-gray-400 mt-1">Invite providers to join your clinic</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {filtered.map(aff => (
        <div key={aff.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center">
              <Stethoscope size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800">
                Dr. {aff.providers?.user_profiles?.first_name} {aff.providers?.user_profiles?.last_name}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-sm text-gray-500">{aff.providers?.specialty || 'General Practice'}</span>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500 capitalize">{aff.role_at_clinic?.replace(/_/g, ' ')}</span>
                {aff.providers?.is_verified && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <Shield size={12} /> Verified
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Active</span>
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setActionMenuId(actionMenuId === aff.id ? null : aff.id); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical size={16} className="text-gray-400" />
              </button>
              {actionMenuId === aff.id && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                  {aff.providers?.user_profiles?.phone && (
                    <button
                      onClick={() => window.open(`tel:${aff.providers?.user_profiles?.phone}`, '_self')}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Phone size={14} /> Call Provider
                    </button>
                  )}
                  {aff.providers?.user_profiles?.email && (
                    <button
                      onClick={() => window.open(`mailto:${aff.providers?.user_profiles?.email}`)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Mail size={14} /> Email Provider
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(aff.id)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <UserX size={14} /> Remove from Clinic
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PendingRequestsList({ affiliations, filterBySearch, onApprove, onReject }: {
  affiliations: ClinicAffiliation[];
  filterBySearch: (name: string) => boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const filtered = affiliations.filter(aff => {
    const name = `${aff.providers?.user_profiles?.first_name || ''} ${aff.providers?.user_profiles?.last_name || ''}`;
    return filterBySearch(name);
  });

  if (filtered.length === 0) {
    return (
      <div className="p-12 text-center">
        <Clock size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No pending requests</p>
        <p className="text-sm text-gray-400 mt-1">Affiliation requests from providers will appear here</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {filtered.map(aff => (
        <div key={aff.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center">
              <Stethoscope size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800">
                Dr. {aff.providers?.user_profiles?.first_name} {aff.providers?.user_profiles?.last_name}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-sm text-gray-500">{aff.providers?.specialty || 'General Practice'}</span>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-400">
                  Requested {new Date(aff.requested_at).toLocaleDateString()}
                </span>
              </div>
              {aff.notes && <p className="text-sm text-gray-400 mt-1 italic">"{aff.notes}"</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReject(aff.id)}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={() => onApprove(aff.id)}
              className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              Approve
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function InvitationsList({ invitations, filterBySearch, onCancel, onResend }: {
  invitations: ClinicInvitation[];
  filterBySearch: (name: string) => boolean;
  onCancel: (id: string) => void;
  onResend: (id: string) => void;
}) {
  const filtered = invitations.filter(inv => {
    const name = `${inv.first_name} ${inv.last_name}`;
    return filterBySearch(name);
  });

  const statusColors: Record<string, { bg: string; text: string }> = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-800' },
    accepted: { bg: 'bg-green-100', text: 'text-green-800' },
    declined: { bg: 'bg-red-100', text: 'text-red-800' },
    expired: { bg: 'bg-gray-100', text: 'text-gray-600' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-500' },
  };

  if (filtered.length === 0) {
    return (
      <div className="p-12 text-center">
        <Mail size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No invitations sent</p>
        <p className="text-sm text-gray-400 mt-1">Use the "Invite Provider" button to send invitations</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {filtered.map(inv => {
        const isExpired = new Date(inv.expires_at) < new Date() && inv.status === 'pending';
        const sc = statusColors[isExpired ? 'expired' : inv.status] || statusColors.pending;

        return (
          <div key={inv.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-sky-100 flex items-center justify-center">
                <Mail size={20} className="text-sky-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  {inv.first_name} {inv.last_name}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-sm text-gray-500">{inv.email}</span>
                  {inv.specialty && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-sm text-gray-500">{inv.specialty}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Sent {new Date(inv.created_at).toLocaleDateString()}
                  {inv.status === 'pending' && !isExpired && (
                    <> &middot; Expires {new Date(inv.expires_at).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 ${sc.bg} ${sc.text} text-xs font-medium rounded-full capitalize`}>
                {isExpired ? 'Expired' : inv.status}
              </span>
              {inv.status === 'pending' && !isExpired && (
                <>
                  <button
                    onClick={() => onResend(inv.id)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Resend invitation"
                  >
                    <RefreshCw size={16} className="text-gray-400" />
                  </button>
                  <button
                    onClick={() => onCancel(inv.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    title="Cancel invitation"
                  >
                    <X size={16} className="text-red-400" />
                  </button>
                </>
              )}
              {isExpired && (
                <button
                  onClick={() => onResend(inv.id)}
                  className="px-3 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Resend
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InviteProviderModal({ clinic, userId, onClose, onSuccess }: {
  clinic: Clinic;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    specialty: '',
    role_at_clinic: 'attending_physician',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [createdInvitation, setCreatedInvitation] = useState<ClinicInvitation | null>(null);
  const [platformProviderEmail, setPlatformProviderEmail] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  const roleOptions = [
    { value: 'attending_physician', label: 'Attending Physician' },
    { value: 'consulting_physician', label: 'Consulting Physician' },
    { value: 'resident', label: 'Resident' },
    { value: 'locum', label: 'Locum Tenens' },
    { value: 'specialist', label: 'Specialist' },
    { value: 'surgeon', label: 'Surgeon' },
    { value: 'nurse_practitioner', label: 'Nurse Practitioner' },
  ];

  const inviteLink = createdInvitation
    ? `${window.location.origin}/en/provider-invitation?token=${createdInvitation.token}`
    : '';

  const copyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const checkPlatformProvider = async (email: string) => {
    const normalized = email.toLowerCase().trim();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setPlatformProviderEmail(null);
      return;
    }
    try {
      const { data } = await api.get<any[]>('/user-profiles', {
        params: { email: normalized, role: 'provider', limit: 1 },
      });
      const hit = Array.isArray(data) ? data[0] : null;
      setPlatformProviderEmail(!!hit);
    } catch {
      setPlatformProviderEmail(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSending(true);
    try {
      const invitation = await clinicService.createInvitation({
        clinic_id: clinic.id,
        invited_by: userId,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        specialty: formData.specialty || undefined,
        role_at_clinic: formData.role_at_clinic,
        message: formData.message || undefined,
      });

      try {
        await clinicService.sendInvitationEmail(invitation.id);
      } catch {}

      setCreatedInvitation(invitation);
      onSuccess();
    } catch (err: any) {
      if (err.message?.includes('unique') || err.code === '23505') {
        setError('An invitation has already been sent to this email for your clinic.');
      } else {
        setError(err.message || 'Failed to send invitation. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (createdInvitation) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Invitation created</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {createdInvitation.first_name} {createdInvitation.last_name} &middot; {createdInvitation.email}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} className="text-gray-400" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                We&apos;ve emailed the invitation to <strong>{createdInvitation.email}</strong>.
                If it doesn&apos;t arrive, copy the link below and share it directly.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <LinkIcon size={14} />
                Invitation link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono bg-gray-50 truncate"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Copy size={14} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Valid for 30 days. Anyone with this link can accept the invitation after signing in as {createdInvitation.email}.</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Invite Provider</h2>
            <p className="text-sm text-gray-500 mt-0.5">Send an invitation to join {clinic.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={e => updateField('first_name', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="John"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={e => updateField('last_name', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Smith"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={e => {
                updateField('email', e.target.value);
                setPlatformProviderEmail(null);
              }}
              onBlur={e => checkPlatformProvider(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="doctor@example.com"
              required
            />
            {platformProviderEmail === true && (
              <p className="flex items-center gap-1.5 text-xs text-green-700 mt-1">
                <CheckCircle size={12} />
                This email belongs to an existing provider on Doktochain. They&apos;ll see the invitation when they sign in.
              </p>
            )}
            {platformProviderEmail === false && (
              <p className="flex items-center gap-1.5 text-xs text-amber-700 mt-1">
                <AlertCircle size={12} />
                No Doktochain account found with this email. They&apos;ll be asked to create a provider account via the invitation link.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
            <input
              type="text"
              value={formData.specialty}
              onChange={e => updateField('specialty', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="e.g., Family Medicine, Cardiology"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role at Clinic</label>
            <select
              value={formData.role_at_clinic}
              onChange={e => updateField('role_at_clinic', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              {roleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Personal Message (Optional)</label>
            <textarea
              value={formData.message}
              onChange={e => updateField('message', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              rows={3}
              placeholder="Add a personal note to the invitation..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
