import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { supabase } from '../../../../../lib/supabase';
import { patientService } from '../../../../../services/patientService';
import { Pill, Clock, CheckCircle, AlertCircle, Calendar, Plus, X, Loader2, Send } from 'lucide-react';

interface RefillRequest {
  id: string;
  prescription_id: string;
  patient_id: string;
  provider_id: string;
  request_reason: string;
  status: string;
  response_notes: string | null;
  requested_at: string;
  responded_at: string | null;
  prescription?: {
    prescription_number: string;
    prescription_date: string;
    providers?: {
      user_profiles?: {
        first_name: string;
        last_name: string;
      };
    };
    prescription_items?: Array<{
      medication_name: string;
      strength: string;
      refills_remaining: number;
    }>;
  };
}

export default function RefillRequestsPage() {
  const { user } = useAuth();
  const [refillRequests, setRefillRequests] = useState<RefillRequest[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);

  useEffect(() => {
    if (user) loadRefillRequests();
  }, [user]);

  const loadRefillRequests = async () => {
    if (!user) return;
    setLoading(true);

    const patient = await patientService.getPatientByUserId(user.id);
    if (!patient) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('prescription_refill_requests')
      .select(`
        *,
        prescription:prescription_id (
          prescription_number,
          prescription_date,
          providers:provider_id (
            user_profiles:user_id (first_name, last_name)
          ),
          prescription_items (
            medication_name,
            strength,
            refills_remaining
          )
        )
      `)
      .eq('patient_id', patient.id)
      .order('requested_at', { ascending: false });

    if (!error && data) {
      setRefillRequests(data);
    }
    setLoading(false);
  };

  const loadAvailablePrescriptions = async () => {
    if (!user) return;
    const patient = await patientService.getPatientByUserId(user.id);
    if (!patient) return;

    const { data } = await supabase
      .from('prescriptions')
      .select(`
        id,
        prescription_number,
        prescription_date,
        providers:provider_id (
          user_profiles:user_id (first_name, last_name)
        ),
        prescription_items (
          medication_name,
          strength,
          refills_remaining
        )
      `)
      .eq('patient_id', patient.id)
      .in('status', ['filled', 'sent'])
      .order('prescription_date', { ascending: false });

    if (data) setPrescriptions(data);
  };

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200', label: 'Approved' };
      case 'pending':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-200', label: 'Pending' };
      case 'denied':
      case 'requires_approval':
        return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200', label: status === 'denied' ? 'Denied' : 'Requires Approval' };
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', label: status };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const approvedCount = refillRequests.filter((r) => r.status === 'approved').length;
  const pendingCount = refillRequests.filter((r) => r.status === 'pending').length;
  const deniedCount = refillRequests.filter((r) => r.status === 'denied' || r.status === 'requires_approval').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Refill Requests</h1>
          <p className="text-gray-600 mt-1">Manage your prescription refill requests</p>
        </div>
        <button
          onClick={() => {
            loadAvailablePrescriptions();
            setShowNewRequest(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Refill Request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-900">{approvedCount}</p>
              <p className="text-sm text-green-700">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-900">{pendingCount}</p>
              <p className="text-sm text-yellow-700">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-900">{deniedCount}</p>
              <p className="text-sm text-red-700">Need Action</p>
            </div>
          </div>
        </div>
      </div>

      {refillRequests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Pill className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No refill requests</h3>
          <p className="text-gray-600 mb-4">You haven't requested any refills yet</p>
          <button
            onClick={() => {
              loadAvailablePrescriptions();
              setShowNewRequest(true);
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Request Your First Refill
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {refillRequests.map((refill) => {
            const statusConfig = getStatusConfig(refill.status);
            const StatusIcon = statusConfig.icon;
            const medication = refill.prescription?.prescription_items?.[0];
            const providerProfile = refill.prescription?.providers?.user_profiles;

            return (
              <div key={refill.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Pill className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {medication ? `${medication.medication_name} ${medication.strength}` : 'Prescription Refill'}
                      </h3>
                      {providerProfile && (
                        <p className="text-sm text-gray-600">Dr. {providerProfile.first_name} {providerProfile.last_name}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Rx: {refill.prescription?.prescription_number || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Requested</p>
                      <p className="font-medium text-gray-900">{new Date(refill.requested_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {refill.responded_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500">Responded</p>
                        <p className="font-medium text-gray-900">{new Date(refill.responded_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  {medication && (
                    <div className="flex items-center gap-2 text-sm">
                      <Pill className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500">Refills Remaining</p>
                        <p className={`font-medium ${medication.refills_remaining === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {medication.refills_remaining}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {refill.request_reason && (
                  <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Reason:</span> {refill.request_reason}
                    </p>
                  </div>
                )}

                {refill.response_notes && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Provider Response:</span> {refill.response_notes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showNewRequest && (
        <NewRefillRequestModal
          prescriptions={prescriptions}
          onClose={() => setShowNewRequest(false)}
          onSubmit={async (prescriptionId: string, reason: string) => {
            if (!user) return;
            const patient = await patientService.getPatientByUserId(user.id);
            if (!patient) return;

            const prescription = prescriptions.find((p: any) => p.id === prescriptionId);
            const providerId = prescription?.providers?.user_profiles ? prescription.providers.id : null;

            await supabase.from('prescription_refill_requests').insert({
              prescription_id: prescriptionId,
              patient_id: patient.id,
              provider_id: providerId,
              request_reason: reason,
              status: 'pending',
            });

            setShowNewRequest(false);
            loadRefillRequests();
          }}
        />
      )}
    </div>
  );
}

const NewRefillRequestModal: React.FC<{
  prescriptions: any[];
  onClose: () => void;
  onSubmit: (prescriptionId: string, reason: string) => Promise<void>;
}> = ({ prescriptions, onClose, onSubmit }) => {
  const [selectedPrescription, setSelectedPrescription] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrescription) return;
    setSubmitting(true);
    await onSubmit(selectedPrescription, reason);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">New Refill Request</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Prescription *</label>
            <select
              value={selectedPrescription}
              onChange={(e) => setSelectedPrescription(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">Choose a prescription...</option>
              {prescriptions.map((rx: any) => {
                const med = rx.prescription_items?.[0];
                return (
                  <option key={rx.id} value={rx.id}>
                    {rx.prescription_number} - {med?.medication_name || 'Unknown'} {med?.strength || ''}
                  </option>
                );
              })}
            </select>
            {prescriptions.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">No prescriptions available for refill.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Refill</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g., Running low on medication, need before next appointment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedPrescription}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
