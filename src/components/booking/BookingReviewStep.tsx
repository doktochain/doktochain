import { useState } from 'react';
import { AlertTriangle, Calendar, Clock, CreditCard, MapPin, Video, Phone, Home } from 'lucide-react';
import { BookingData } from '../../services/enhancedBookingService';

type Step = 'service' | 'method' | 'datetime' | 'questionnaire' | 'consent' | 'payment' | 'review' | 'confirmation';

interface BookingReviewStepProps {
  bookingData: Partial<BookingData>;
  selectedService: any;
  bookingFeeActive: boolean;
  bookingFeeAmount: number;
  reasonForVisit: string;
  onReasonChange: (val: string) => void;
  loading: boolean;
  onEdit: (step: Step) => void;
  onConfirm: () => void;
  onBack: () => void;
}

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-bold text-lg text-gray-900">{title}</h3>
        <button onClick={onEdit} className="text-sky-600 hover:text-sky-700 text-sm font-medium">
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

export default function BookingReviewStep({
  bookingData,
  selectedService,
  bookingFeeActive,
  bookingFeeAmount,
  reasonForVisit,
  onReasonChange,
  loading,
  onEdit,
  onConfirm,
  onBack,
}: BookingReviewStepProps) {
  const [confirmed, setConfirmed] = useState(false);
  const servicePrice = selectedService?.base_price || 0;
  const copay = bookingData.paymentMethod === 'insurance' ? 25 : 0;
  const subtotal = bookingData.paymentMethod === 'insurance' ? copay : servicePrice;
  const totalCost = subtotal + bookingFeeAmount;

  const methodIcons: Record<string, React.ElementType> = {
    virtual: Video, phone: Phone, in_person: MapPin, home_visit: Home,
  };
  const MethodIcon = methodIcons[bookingData.consultationType || ''] || MapPin;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Review & Confirm Your Booking</h2>

      {!bookingFeeActive && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-sky-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sky-900">No Booking Fee</h3>
              <p className="text-sm text-sky-800 mt-1">No platform booking fee will be charged for this appointment.</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <ReviewCard title="Appointment Details" onEdit={() => onEdit('service')}>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Service</span>
              <span className="font-semibold text-gray-900">{selectedService?.service_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration</span>
              <span className="text-gray-900">{selectedService?.duration_minutes} minutes</span>
            </div>
          </div>
        </ReviewCard>

        <ReviewCard title="Consultation Method" onEdit={() => onEdit('method')}>
          <p className="text-gray-900 capitalize flex items-center gap-2">
            <MethodIcon className="w-4 h-4" />
            {bookingData.consultationType?.replace('_', ' ')}
          </p>
        </ReviewCard>

        <ReviewCard title="Date & Time" onEdit={() => onEdit('datetime')}>
          <div className="space-y-2">
            <p className="text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {bookingData.appointmentDate && new Date(bookingData.appointmentDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              })}
            </p>
            <p className="text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {bookingData.appointmentTime?.substring(0, 5)}
            </p>
          </div>
        </ReviewCard>

        <ReviewCard title="Payment Method" onEdit={() => onEdit('payment')}>
          <p className="text-gray-900 capitalize flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            {bookingData.paymentMethod === 'insurance' ? 'Insurance' : 'Self-Pay'}
          </p>
          {bookingData.paymentMethod === 'insurance' && (
            <p className="text-sm text-gray-600 mt-1">Estimated co-pay: ${copay}</p>
          )}
        </ReviewCard>

        <div className="bg-sky-50 rounded-lg border border-sky-200 p-6">
          <h3 className="font-bold text-lg text-gray-900 mb-4">Cost Breakdown</h3>
          <div className="space-y-3">
            {bookingData.paymentMethod === 'insurance' ? (
              <>
                <div className="flex justify-between text-gray-700">
                  <span>Service Cost:</span>
                  <span>${servicePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Insurance Coverage:</span>
                  <span className="text-green-600">-${(servicePrice - copay).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Co-pay:</span>
                  <span>${copay.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-gray-700">
                <span>Service Cost:</span>
                <span>${servicePrice.toFixed(2)}</span>
              </div>
            )}
            {bookingFeeActive && bookingFeeAmount > 0 && (
              <div className="flex justify-between text-gray-700">
                <span>Booking Fee:</span>
                <span>${bookingFeeAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-sky-300 pt-3 flex justify-between items-center">
              <span className="font-bold text-gray-900">Total Cost:</span>
              <span className="text-3xl font-bold text-sky-600">${totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <label className="block text-sm font-medium text-gray-900 mb-2">Reason for Visit</label>
        <textarea
          value={reasonForVisit}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={3}
          placeholder="Briefly describe the reason for your visit..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="font-bold text-gray-900 mb-4">Reminder Preferences</h3>
        <div className="space-y-2">
          {['email', 'sms'].map((type) => (
            <label key={type} className="flex items-center">
              <input
                type="checkbox"
                checked={bookingData.reminderPreferences?.includes(type as any)}
                onChange={() => {}}
                className="mr-3 accent-sky-600"
              />
              <span className="text-gray-700 capitalize">{type === 'sms' ? 'SMS' : type} reminders</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <label className="flex items-start">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 mr-3 accent-sky-600"
          />
          <span className="text-sm text-gray-700">
            I have reviewed all the details above and confirm that the information is accurate.
            I understand the cancellation policy and agree to the terms and conditions.
          </span>
        </label>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-6 py-3 text-sky-600 border border-sky-600 rounded-lg hover:bg-sky-50 font-medium"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={loading || !confirmed}
          className="flex-1 px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Appointment...' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
}
