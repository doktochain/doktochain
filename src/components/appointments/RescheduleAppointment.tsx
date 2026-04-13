import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import { enhancedBookingService } from '../../services/enhancedBookingService';

interface RescheduleAppointmentProps {
  appointment: any;
  onReschedule: () => void;
  onCancel: () => void;
}

export default function RescheduleAppointment({
  appointment,
  onReschedule,
  onCancel,
}: RescheduleAppointmentProps) {
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const slots = await enhancedBookingService.getProviderAvailability(
        appointment.provider_id,
        today.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        appointment.appointment_type === 'virtual' ? 'virtual' : 'in_person'
      );
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedSlot) return;

    try {
      setLoading(true);
      await enhancedBookingService.rescheduleAppointment(
        appointment.id,
        selectedSlot.id,
        selectedSlot.slot_date,
        selectedSlot.slot_time,
        reason
      );
      onReschedule();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Failed to reschedule appointment');
    } finally {
      setLoading(false);
    }
  };

  const groupedSlots: Record<string, any[]> = {};
  availableSlots.forEach((slot) => {
    if (!groupedSlots[slot.slot_date]) {
      groupedSlots[slot.slot_date] = [];
    }
    groupedSlots[slot.slot_date].push(slot);
  });

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Reschedule Appointment</h2>

      <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-sky-900 mb-2">Current Appointment</h3>
        <div className="text-sky-800 space-y-1 text-sm">
          <p className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date(appointment.appointment_date + 'T00:00:00').toLocaleDateString('en-US', {
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
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">Rescheduling Policy</h3>
            <p className="text-sm text-yellow-800">
              You can reschedule your appointment up to 24 hours before the scheduled time at no
              charge. Rescheduling within 24 hours may incur a $25 fee.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reason for Rescheduling (Optional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Let us know why you need to reschedule..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Select New Date & Time</h3>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto" />
          </div>
        ) : Object.keys(groupedSlots).length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No available time slots in the next 30 days.
          </div>
        ) : (
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {Object.entries(groupedSlots).map(([date, slots]) => (
              <div key={date}>
                <h4 className="font-semibold text-lg mb-3">
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h4>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                  {slots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-4 py-2 border-2 rounded-lg transition text-sm ${
                        selectedSlot?.id === slot.id
                          ? 'border-sky-600 bg-sky-50 text-sky-700 font-medium'
                          : 'border-gray-200 hover:border-sky-400 hover:bg-sky-50'
                      }`}
                    >
                      {slot.slot_time?.substring(0, 5)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSlot && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-green-900 mb-2">New Appointment Time</h3>
          <div className="text-green-800 space-y-1 text-sm">
            <p className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(selectedSlot.slot_date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {selectedSlot.slot_time?.substring(0, 5)}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={onCancel}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Go Back
        </button>
        <button
          onClick={handleReschedule}
          disabled={!selectedSlot || loading}
          className="flex-1 px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Rescheduling...' : 'Confirm Reschedule'}
        </button>
      </div>
    </div>
  );
}
