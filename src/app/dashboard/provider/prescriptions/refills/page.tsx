import { useState, useEffect } from 'react';
import { Check, X, Clock, AlertCircle, User, Pill, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { prescriptionService } from '../../../../../services/prescriptionService';
import { useAuth } from '../../../../../contexts/AuthContext';
import { providerService } from '../../../../../services/providerService';
import { ConfirmDialog } from '../../../../../components/ui/confirm-dialog';

export default function RefillRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      loadProvider();
    }
  }, [user]);

  useEffect(() => {
    if (providerId) {
      loadRefillRequests();
    }
  }, [providerId]);

  const loadProvider = async () => {
    if (!user) return;
    try {
      const provider = await providerService.getProviderByUserId(user.id);
      if (provider) {
        setProviderId(provider.id);
      } else {
        setProviderId(user.id);
      }
    } catch (error) {
      console.error('Error loading provider:', error);
      setProviderId(user.id);
    }
  };

  const loadRefillRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await prescriptionService.getProviderRefillRequests(user.id);
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading refill requests:', error);
      toast.error('Unable to load refill requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    setActionLoading(requestId);
    try {
      await prescriptionService.approveRefill(requestId, user.id);
      await loadRefillRequests();
    } catch (error) {
      console.error('Error approving refill:', error);
      toast.error('Failed to approve refill request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    const reason = prompt('Please provide a reason for denial:');
    if (!reason) return;

    setActionLoading(requestId);
    try {
      await prescriptionService.denyRefill(requestId, reason, user?.id);
      await loadRefillRequests();
    } catch (error) {
      console.error('Error denying refill:', error);
      toast.error('Failed to deny refill request');
    } finally {
      setActionLoading(null);
    }
  };

  const executeBulkApprove = async () => {
    if (!user) return;
    const pendingRequests = requests.filter((req) => req.status === 'pending');
    setShowBulkConfirm(false);
    setActionLoading('bulk');
    try {
      for (const req of pendingRequests) {
        await prescriptionService.approveRefill(req.id, user.id);
      }
      await loadRefillRequests();
    } catch (error) {
      console.error('Error bulk approving:', error);
      toast.error('Some refill requests could not be approved');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const deniedCount = requests.filter((r) => r.status === 'denied').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Refill Authorization Queue
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and approve prescription refill requests
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadRefillRequests}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowBulkConfirm(true)}
            disabled={pendingCount === 0 || actionLoading === 'bulk'}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            {actionLoading === 'bulk' && <Loader2 className="w-4 h-4 animate-spin" />}
            Bulk Approve All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{pendingCount}</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{approvedCount}</p>
            </div>
            <Check className="w-12 h-12 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Denied</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{deniedCount}</p>
            </div>
            <X className="w-12 h-12 text-red-500" />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'denied'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {f}
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white text-blue-600 text-xs rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No refill requests
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              There are no refill requests matching the selected filter.
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {request.prescription?.patient?.full_name || request.patient_name || 'Unknown Patient'}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-semibold ${
                        request.status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : request.status === 'denied'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}
                    >
                      {request.status?.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Pill className="w-4 h-4" />
                      <span>
                        {request.prescription_items?.[0]?.medication_name || request.medication_name || 'N/A'}
                        {request.prescription_items?.[0]?.strength ? ` ${request.prescription_items[0].strength}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <User className="w-4 h-4" />
                      <span className="capitalize">
                        Requested by: {request.requested_by || 'patient'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Requested: {new Date(request.created_at || request.request_date).toLocaleDateString()}
                      </span>
                    </div>
                    {request.prescription?.prescription_number && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>Rx #{request.prescription.prescription_number}</span>
                      </div>
                    )}
                  </div>

                  {request.reason && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">Reason: </span>
                        {request.reason}
                      </p>
                    </div>
                  )}

                  {request.denial_reason && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 rounded">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        <span className="font-semibold">Denial Reason: </span>
                        {request.denial_reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {request.status === 'pending' && (
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={actionLoading === request.id}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
                  >
                    {actionLoading === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => handleDeny(request.id)}
                    disabled={actionLoading === request.id}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Deny
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowDetailsModal(true);
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition-colors"
                  >
                    View Full Details
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={showBulkConfirm}
        onOpenChange={setShowBulkConfirm}
        title="Bulk Approve Refills"
        description={`Approve ${requests.filter((r) => r.status === 'pending').length} pending refill requests?`}
        confirmLabel="Approve All"
        onConfirm={executeBulkApprove}
      />

      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Refill Request Details
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Patient</label>
                  <p className="text-gray-900 dark:text-white font-semibold">
                    {selectedRequest.prescription?.patient?.full_name || selectedRequest.patient_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Prescription #</label>
                  <p className="text-gray-900 dark:text-white font-semibold">
                    {selectedRequest.prescription?.prescription_number || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Medication</label>
                  <p className="text-gray-900 dark:text-white font-semibold">
                    {selectedRequest.prescription_items?.[0]?.medication_name || 'N/A'}
                    {selectedRequest.prescription_items?.[0]?.strength ? ` ${selectedRequest.prescription_items[0].strength}` : ''}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                  <p className="text-gray-900 dark:text-white font-semibold capitalize">
                    {selectedRequest.status}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Requested</label>
                  <p className="text-gray-900 dark:text-white font-semibold">
                    {new Date(selectedRequest.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Requested By</label>
                  <p className="text-gray-900 dark:text-white font-semibold capitalize">
                    {selectedRequest.requested_by || 'patient'}
                  </p>
                </div>
              </div>

              {selectedRequest.reason && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Reason</label>
                  <p className="text-gray-900 dark:text-white mt-1">{selectedRequest.reason}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      handleApprove(selectedRequest.id);
                      setShowDetailsModal(false);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      handleDeny(selectedRequest.id);
                      setShowDetailsModal(false);
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
                  >
                    Deny
                  </button>
                </>
              )}
              <button
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
