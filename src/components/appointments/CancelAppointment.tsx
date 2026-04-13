import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Calendar, Clock } from 'lucide-react';
import { enhancedBookingService } from '../../services/enhancedBookingService';

interface CancelAppointmentProps {
  appointment: any;
  onCancel: () => void;
  onClose: () => void;
}

export default function CancelAppointment({
  appointment,
  onCancel,
  onClose,
}: CancelAppointmentProps) {
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [loading, setLoading] = useState(false);

  const cancellationReasons = [
    'Scheduling conflict',
    'Feeling better',
    'Found another provider',
    'Transportation issues',
    'Cost concerns',
    'Personal reasons',
    'Other',
  ];

  const appointmentDate = new Date(appointment.appointment_date + 'T00:00:00');
  const now = new Date();
  const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const canCancelFree = hoursUntilAppointment > 24;

  const handleCancel = async () => {
    if (!reason) {
      toast.error('Please select a cancellation reason');
      return;
    }

    const finalReason = reason === 'Other' ? otherReason : reason;

    try {
      setLoading(true);
      await enhancedBookingService.cancelAppointment(appointment.id, finalReason);
      onCancel();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Cancel Appointment</h2>

      <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-sky-900 mb-2">Appointment Details</h3>
        <div className="text-sky-800 space-y-1 text-sm">
          <p className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {appointmentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {appointment.start_time?.substring(0, 5)}
          </p>
          {appointment.reason_for_visit && (
            <p className="text-sky-700 mt-2">Reason: {appointment.reason_for_visit}</p>
          )}
        </div>
      </div>

      <div
        className={`border rounded-lg p-4 mb-6 ${
          canCancelFree
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className={`w-5 h-5 mt-0.5 flex-shrink-0 ${canCancelFree ? 'text-green-600' : 'text-yellow-600'}`}
          />
          <div>
            <h3
              className={`font-semibold mb-1 ${
                canCancelFree ? 'text-green-900' : 'text-yellow-900'
              }`}
            >
              Cancellation Policy
            </h3>
            {canCancelFree ? (
              <p className="text-sm text-green-800">
                You can cancel this appointment at no charge as it is more than 24 hours away.
                You will receive a full refund if payment was made.
              </p>
            ) : (
              <div className="text-sm text-yellow-800 space-y-2">
                <p>
                  This appointment is within 24 hours. Cancelling may incur a $50 cancellation
                  fee.
                </p>
                <p>
                  If you paid with insurance, your co-pay will not be refunded. If you paid
                  out-of-pocket, you will be refunded minus the cancellation fee.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Reason for Cancellation *
        </label>
        <div className="space-y-2">
          {cancellationReasons.map((reasonOption) => (
            <label key={reasonOption} className="flex items-center">
              <input
                type="radio"
                name="reason"
                value={reasonOption}
                checked={reason === reasonOption}
                onChange={(e) => setReason(e.target.value)}
                className="mr-3 accent-sky-600"
              />
              <span className="text-gray-700">{reasonOption}</span>
            </label>
          ))}
        </div>
      </div>

      {reason === 'Other' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Please specify your reason
          </label>
          <textarea
            value={otherReason}
            onChange={(e) => setOtherReason(e.target.value)}
            rows={3}
            placeholder="Tell us why you're cancelling..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">After Cancellation</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>You will receive a cancellation confirmation email</li>
          <li>Your provider will be notified</li>
          <li>This appointment slot will become available for other patients</li>
          <li>You can book a new appointment anytime</li>
        </ul>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Keep Appointment
        </button>
        <button
          onClick={handleCancel}
          disabled={!reason || (reason === 'Other' && !otherReason) || loading}
          className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Cancelling...' : 'Cancel Appointment'}
        </button>
      </div>
    </div>
  );
}
