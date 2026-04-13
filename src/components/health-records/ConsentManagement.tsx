import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { blockchainAuditService } from '../../services/blockchainAuditService';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Shield, X, Clock, User, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface Consent {
  id: string;
  provider_id: string;
  consent_type: string;
  record_types: string[];
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
  providers?: {
    id: string;
    practice_name: string;
    user_profiles: {
      first_name: string;
      last_name: string;
    };
  };
}

interface Props {
  patientId: string;
  onClose: () => void;
}

export default function ConsentManagement({ patientId, onClose }: Props) {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all' | 'revoked' | 'expired'>('active');
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);
  const [consentToRevoke, setConsentToRevoke] = useState<Consent | null>(null);

  useEffect(() => {
    loadConsents();
  }, [patientId, filter]);

  const loadConsents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('patient_consents')
        .select('*, providers(id, practice_name, user_profiles(first_name, last_name))')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data } = await query;
      setConsents((data as Consent[]) || []);
    } catch (error) {
      console.error('Error loading consents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeClick = (consent: Consent) => {
    setConsentToRevoke(consent);
    setConfirmRevokeOpen(true);
  };

  const handleRevokeConfirmed = async () => {
    if (!consentToRevoke) return;

    setConfirmRevokeOpen(false);
    setRevoking(consentToRevoke.id);
    try {
      const { error } = await supabase
        .from('patient_consents')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', consentToRevoke.id);

      if (error) throw error;

      await blockchainAuditService.logEvent({
        eventType: 'consent_revoked',
        resourceType: 'patient_consent',
        resourceId: consentToRevoke.id,
        actorId: patientId,
        actorRole: 'patient',
        actionData: {
          provider_id: consentToRevoke.provider_id,
          record_types: consentToRevoke.record_types,
        },
      });

      loadConsents();
    } catch (error) {
      console.error('Error revoking consent:', error);
      toast.error('Failed to revoke consent');
    } finally {
      setRevoking(null);
      setConsentToRevoke(null);
    }
  };

  const isExpired = (consent: Consent) => {
    if (!consent.end_date) return false;
    return new Date(consent.end_date) < new Date();
  };

  const getStatusBadge = (consent: Consent) => {
    if (consent.status === 'revoked') {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
          <XCircle className="w-3 h-3" />
          Revoked
        </span>
      );
    }
    if (isExpired(consent)) {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
          <Clock className="w-3 h-3" />
          Expired
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
        <CheckCircle className="w-3 h-3" />
        Active
      </span>
    );
  };

  const recordTypeLabels: Record<string, string> = {
    labResults: 'Lab Results',
    medications: 'Medications',
    allergies: 'Allergies',
    immunizations: 'Immunizations',
    clinicalNotes: 'Clinical Notes',
  };

  const getProviderName = (consent: Consent) => {
    const p = consent.providers;
    if (!p) return 'Unknown Provider';
    const name = `Dr. ${p.user_profiles?.first_name || ''} ${p.user_profiles?.last_name || ''}`.trim();
    return name || p.practice_name || 'Unknown Provider';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manage Consents</h2>
              <p className="text-sm text-gray-500">View and revoke provider access to your records</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="flex gap-2">
            {(['active', 'all', 'revoked', 'expired'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === f
                    ? 'bg-sky-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
            </div>
          ) : consents.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No {filter === 'all' ? '' : filter} consents found</p>
              <p className="text-sm text-gray-400 mt-1">
                Share your records with providers to see consents here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {consents.map((consent) => (
                <div
                  key={consent.id}
                  className={`border rounded-lg p-5 transition ${
                    consent.status === 'revoked' || isExpired(consent)
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-gray-200 bg-white hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-sky-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{getProviderName(consent)}</p>
                        {consent.providers?.practice_name && (
                          <p className="text-sm text-gray-500">{consent.providers.practice_name}</p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(consent)}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {consent.record_types.map((type) => (
                      <span
                        key={type}
                        className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-xs font-medium"
                      >
                        {recordTypeLabels[type] || type}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      From: {new Date(consent.start_date + 'T00:00:00').toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {consent.end_date
                        ? `Until: ${new Date(consent.end_date + 'T00:00:00').toLocaleDateString()}`
                        : 'Permanent access'}
                    </span>
                  </div>

                  {consent.status === 'active' && !isExpired(consent) && (
                    <button
                      onClick={() => handleRevokeClick(consent)}
                      disabled={revoking === consent.id}
                      className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm font-medium transition disabled:opacity-50"
                    >
                      {revoking === consent.id ? 'Revoking...' : 'Revoke Access'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmRevokeOpen}
        onOpenChange={setConfirmRevokeOpen}
        title="Revoke Access"
        description="Are you sure you want to revoke this access? The provider will no longer be able to view your records."
        confirmLabel="Revoke"
        variant="destructive"
        onConfirm={handleRevokeConfirmed}
      />
    </div>
  );
}
