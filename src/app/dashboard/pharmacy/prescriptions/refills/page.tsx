import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../contexts/AuthContext';
import { supabase } from '../../../../../lib/supabase';
import { pharmacyPrescriptionService } from '../../../../../services/pharmacyPrescriptionService';
import { RefreshCw, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';

export default function PharmacyPrescriptionsRefills() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [refillRequests, setRefillRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pharmacyId, setPharmacyId] = useState<string>('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadPharmacyId();
  }, [userProfile]);

  useEffect(() => {
    if (pharmacyId) {
      loadRefillRequests();
    }
  }, [pharmacyId]);

  const loadPharmacyId = async () => {
    if (!userProfile) return;
    const { data } = await supabase
      .from('pharmacies')
      .select('id')
      .eq('user_id', userProfile.id)
      .maybeSingle();
    if (data) setPharmacyId(data.id);
  };

  const loadRefillRequests = async () => {
    setLoading(true);
    try {
      const result = await pharmacyPrescriptionService.getRefillRequests(pharmacyId);
      setRefillRequests(result || []);
    } catch (error) {
      console.error('Error loading refill requests:', error);
      setRefillRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRefill = async (prescriptionId: string) => {
    try {
      const current = refillRequests.find(r => r.id === prescriptionId);
      const newRefills = Math.max(0, (current?.refills_remaining || 1) - 1);

      await supabase
        .from('pharmacy_prescriptions')
        .update({
          refill_requested: false,
          refills_remaining: newRefills,
          last_filled_date: new Date().toISOString(),
        })
        .eq('id', prescriptionId);

      setToast({ type: 'success', message: 'Refill approved successfully' });
      setTimeout(() => setToast(null), 3000);
      loadRefillRequests();
    } catch (error) {
      console.error('Error approving refill:', error);
      setToast({ type: 'error', message: 'Failed to approve refill' });
      setTimeout(() => setToast(null), 3000);
    }
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Refill Requests</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage prescription refill requests</p>
        </div>
        <button
          onClick={loadRefillRequests}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Refills</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{refillRequests.length}</p>
            </div>
            <RefreshCw className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Urgent (No Refills Left)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {refillRequests.filter(r => r.refills_remaining === 0).length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Has Refills Available</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {refillRequests.filter(r => (r.refills_remaining || 0) > 0).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading refill requests...</p>
          </div>
        ) : refillRequests.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No pending refill requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prescription</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Medication</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Refills Left</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Request Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {refillRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      #{request.id.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {request.prescriptions?.patient?.first_name
                        ? `${request.prescriptions.patient.first_name} ${request.prescriptions.patient.last_name}`
                        : `Patient #${(request.patient_id || '').substring(0, 8)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {request.prescriptions?.medication_name || request.medication_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        request.refills_remaining === 0
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        {request.refills_remaining || 0} left
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(request.requested_at || request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleApproveRefill(request.id)}
                        className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Approve
                      </button>
                      <button
                        onClick={() => navigate('/dashboard/pharmacy/messages')}
                        className="inline-flex items-center gap-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-3 py-1 rounded text-xs font-medium transition"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Contact Provider
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
