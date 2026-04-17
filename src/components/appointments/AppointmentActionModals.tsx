import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Appointment } from '../../services/appointmentService';
import { X, AlertCircle, Clock, DollarSign, FileText } from 'lucide-react';

interface ConfirmModalProps {
  appointment: Appointment;
  onConfirm: (appointmentId: string) => Promise<void>;
  onClose: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
}

export function ConfirmAppointmentModal({ appointment, onConfirm, onClose, onCancel, onReschedule }: ConfirmModalProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(appointment.id);
      onClose();
    } catch (error) {
      console.error('Failed to confirm appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Confirm Appointment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to confirm this appointment? The patient will be notified via email and SMS.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Patient:</span>{' '}
                {(appointment as any).patients?.user_profiles?.full_name || 'Unknown'}
              </div>
              <div>
                <span className="font-semibold">Date:</span>{' '}
                {new Date(appointment.appointment_date).toLocaleDateString()}
              </div>
              <div>
                <span className="font-semibold">Time:</span> {appointment.start_time} - {appointment.end_time}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleConfirm}
            disabled={loading || appointment.status === 'confirmed'}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Confirming...' : appointment.status === 'confirmed' ? 'Already Confirmed' : 'Confirm Appointment'}
          </button>
          {appointment.patient_id && (
            <button
              onClick={() => {
                const lang = i18n.language || 'en';
                navigate(`/${lang}/dashboard/provider/patients?patientId=${appointment.patient_id}`);
                onClose();
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View Patient Health Records
            </button>
          )}
          <div className="flex gap-2">
            {onReschedule && (
              <button
                onClick={onReschedule}
                disabled={appointment.status === 'cancelled' || appointment.status === 'completed'}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Reschedule
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={appointment.status === 'cancelled' || appointment.status === 'completed'}
                className="flex-1 px-4 py-2 border border-red-300 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                Cancel Appointment
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface CancelModalProps {
  appointment: Appointment;
  onCancel: (data: {
    appointmentId: string;
    reason: string;
    category: string;
    offerReschedule: boolean;
    cancellationFee: number;
  }) => Promise<void>;
  onClose: () => void;
}

export function CancelAppointmentModal({ appointment, onCancel, onClose }: CancelModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<string>('patient_request');
  const [offerReschedule, setOfferReschedule] = useState(true);
  const [cancellationFee, setCancellationFee] = useState(0);

  const categories = [
    { value: 'patient_request', label: 'Patient Request' },
    { value: 'provider_unavailable', label: 'Provider Unavailable' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'no_show', label: 'Patient No-Show' },
    { value: 'duplicate', label: 'Duplicate Booking' },
    { value: 'other', label: 'Other' },
  ];

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    setLoading(true);
    try {
      await onCancel({
        appointmentId: appointment.id,
        reason,
        category,
        offerReschedule,
        cancellationFee,
      });
      onClose();
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Cancel Appointment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Warning
              </h3>
              <p className="text-sm text-red-800 dark:text-red-200">
                This action will cancel the appointment and notify the patient. This cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cancellation Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for Cancellation *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Please provide detailed reason..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="offerReschedule"
              checked={offerReschedule}
              onChange={(e) => setOfferReschedule(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="offerReschedule" className="text-sm text-gray-700 dark:text-gray-300">
              Offer reschedule options to patient
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Cancellation Fee (if applicable)
            </label>
            <input
              type="number"
              value={cancellationFee}
              onChange={(e) => setCancellationFee(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Keep Appointment
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Cancelling...' : 'Cancel Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface RescheduleModalProps {
  appointment: Appointment;
  onReschedule: (appointmentId: string, newDate: string, newStartTime: string, newEndTime: string) => Promise<void>;
  onClose: () => void;
}

export function RescheduleAppointmentModal({ appointment, onReschedule, onClose }: RescheduleModalProps) {
  const [loading, setLoading] = useState(false);
  const [newDate, setNewDate] = useState(appointment.appointment_date);
  const [newStartTime, setNewStartTime] = useState(appointment.start_time);
  const [newEndTime, setNewEndTime] = useState(appointment.end_time);

  const handleReschedule = async () => {
    setLoading(true);
    try {
      await onReschedule(appointment.id, newDate, newStartTime, newEndTime);
      onClose();
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Reschedule Appointment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Date
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReschedule}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Rescheduling...' : 'Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
