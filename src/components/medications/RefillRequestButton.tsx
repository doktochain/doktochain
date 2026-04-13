import { useState } from 'react';
import { toast } from 'sonner';
import { ePrescriptionService } from '../../services/ePrescriptionService';
import { blockchainAuditService } from '../../services/blockchainAuditService';
import { notificationService } from '../../services/notificationService';
import { RefreshCw } from 'lucide-react';

interface RefillRequestButtonProps {
  prescriptionId: string;
  patientId: string;
  providerId: string;
  refillsRemaining: number;
  medicationName: string;
}

export default function RefillRequestButton({
  prescriptionId,
  patientId,
  providerId,
  refillsRemaining,
  medicationName
}: RefillRequestButtonProps) {
  const [requesting, setRequesting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');

  const handleRequestRefill = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the refill request');
      return;
    }

    setRequesting(true);
    try {
      await ePrescriptionService.requestRefillApproval(prescriptionId, patientId, reason);

      await blockchainAuditService.logEvent({
        event_type: 'refill_requested',
        resource_type: 'prescription',
        resource_id: prescriptionId,
        actor_id: patientId,
        actor_role: 'patient',
        action_data: {
          provider_id: providerId,
          medication_name: medicationName,
          reason
        }
      });

      await notificationService.create({
        user_id: providerId,
        title: 'Refill Request',
        message: `Patient has requested a refill for ${medicationName}`,
        type: 'prescription',
        priority: 'medium'
      });

      toast.success('Refill request sent successfully!');
      setShowModal(false);
      setReason('');
    } catch (error) {
      console.error('Error requesting refill:', error);
      toast.error('Failed to request refill');
    } finally {
      setRequesting(false);
    }
  };

  if (refillsRemaining <= 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-3 py-1 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 flex items-center gap-1"
      >
        <RefreshCw />
        Request Refill
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Request Refill</h3>
            <p className="text-gray-600 mb-4">
              Medication: <strong>{medicationName}</strong>
            </p>
            <p className="text-gray-600 mb-4">
              Refills Remaining: <strong>{refillsRemaining}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Refill *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="e.g., Running low on medication, Need to continue treatment..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={requesting}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestRefill}
                disabled={requesting || !reason.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {requesting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
