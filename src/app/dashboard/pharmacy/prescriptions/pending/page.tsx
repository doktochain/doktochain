import { useEffect, useState } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { supabase } from '../../../../../lib/supabase';
import { pharmacyPrescriptionService } from '../../../../../services/pharmacyPrescriptionService';
import { FileText, Clock, Check, X, Pill } from 'lucide-react';

export default function PharmacyPrescriptionsPending() {
  const { userProfile } = useAuth();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pharmacyId, setPharmacyId] = useState<string>('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadPharmacyId();
  }, [userProfile]);

  useEffect(() => {
    if (pharmacyId) {
      loadPendingPrescriptions();

      const channel = supabase
        .channel(`pharmacy-prescriptions-${pharmacyId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'prescriptions',
            filter: `pharmacy_id=eq.${pharmacyId}`,
          },
          () => {
            loadPendingPrescriptions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [pharmacyId]);

  const loadPharmacyId = async () => {
    if (!userProfile) return;

    const { data } = await supabase
      .from('pharmacies')
      .select('id')
      .eq('user_id', userProfile.id)
      .maybeSingle();

    if (data) {
      setPharmacyId(data.id);
    }
  };

  const loadPendingPrescriptions = async () => {
    setLoading(true);
    try {
      const result = await pharmacyPrescriptionService.getPendingPrescriptions(pharmacyId);
      setPrescriptions(result);
    } catch (error) {
      console.error('Error loading pending prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAccept = async (prescriptionId: string) => {
    try {
      await pharmacyPrescriptionService.updatePrescriptionStatus(prescriptionId, 'accepted');
      showToast('success', 'Prescription accepted');
      loadPendingPrescriptions();
    } catch (error) {
      console.error('Error accepting prescription:', error);
      showToast('error', 'Failed to accept prescription');
    }
  };

  const handleReject = async (prescriptionId: string) => {
    try {
      await pharmacyPrescriptionService.updatePrescriptionStatus(prescriptionId, 'rejected');
      showToast('success', 'Prescription rejected');
      loadPendingPrescriptions();
    } catch (error) {
      console.error('Error rejecting prescription:', error);
      showToast('error', 'Failed to reject prescription');
    }
  };

  const getPatientName = (rx: any) => {
    if (rx.patient?.first_name) return `${rx.patient.first_name} ${rx.patient.last_name}`;
    if (rx.patients?.user_profiles?.first_name) return `${rx.patients.user_profiles.first_name} ${rx.patients.user_profiles.last_name}`;
    return `Patient #${(rx.patient_id || '').substring(0, 8)}`;
  };

  const getProviderName = (rx: any) => {
    if (rx.provider?.first_name) return `Dr. ${rx.provider.first_name} ${rx.provider.last_name}`;
    if (rx.providers?.first_name) return `Dr. ${rx.providers.first_name} ${rx.providers.last_name}`;
    return `Provider #${(rx.provider_id || '').substring(0, 8)}`;
  };

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pending Prescriptions</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Review and process new prescriptions</p>
        </div>

        <button
          onClick={loadPendingPrescriptions}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{prescriptions.length}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading pending prescriptions...</p>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No pending prescriptions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((prescription) => (
              <div key={prescription.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Prescription #{prescription.id.substring(0, 8)}
                      </h3>
                      <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-semibold">
                        PENDING
                      </span>
                    </div>

                    {prescription.medication_name && (
                      <div className="flex items-center gap-2 mt-2 mb-2">
                        <Pill className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {prescription.medication_name}
                          {prescription.dosage ? ` - ${prescription.dosage}` : ''}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Patient</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {getPatientName(prescription)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Prescribed By</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {getProviderName(prescription)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Date Issued</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(prescription.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {prescription.status}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleAccept(prescription.id)}
                      className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition"
                      title="Accept"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleReject(prescription.id)}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition"
                      title="Reject"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
