import { CheckCircle } from 'lucide-react';
import { BookingData } from '../../services/enhancedBookingService';

interface BookingConfirmationStepProps {
  appointmentId: string | null;
  bookingData: Partial<BookingData>;
  onNavigate: (path: string) => void;
}

const BRING_ITEMS = [
  "Government-issued photo ID (Driver's license or Passport)",
  'Insurance card (if applicable)',
  'List of current medications and dosages',
  'Any relevant medical records or test results',
  'Payment method for co-pay or service fee',
];

export default function BookingConfirmationStep({ appointmentId, bookingData, onNavigate }: BookingConfirmationStepProps) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
      <p className="text-gray-600 mb-2">Your appointment has been successfully scheduled.</p>
      <p className="text-sm text-gray-500 mb-8">
        Confirmation number: <span className="font-mono font-semibold">{appointmentId?.substring(0, 8)}</span>
      </p>

      <div className="max-w-2xl mx-auto mb-8 space-y-6">
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-6 text-left">
          <h3 className="font-semibold text-sky-900 mb-4">What's Next?</h3>
          <ul className="space-y-2 text-sm text-sky-800">
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-sky-600" /> Confirmation email sent to your inbox</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-sky-600" /> You'll receive reminders before your appointment</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-sky-600" /> View and manage your appointment from the dashboard</li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-4">What to Bring</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            {BRING_ITEMS.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-sky-600 mt-0.5 font-bold">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-4">Pre-Visit Instructions</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <p><strong>Arrive 15 minutes early</strong> to complete any remaining paperwork and check-in.</p>
            {bookingData.consultationType === 'virtual' && (
              <p>
                <strong>For virtual visits:</strong> Test your camera and microphone 10 minutes before
                your appointment. You'll receive a video link via email.
              </p>
            )}
            <p><strong>Prepare questions:</strong> Write down any questions or concerns you want to discuss.</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-left">
          <h3 className="font-semibold text-yellow-900 mb-3">Cancellation Policy</h3>
          <p className="text-sm text-yellow-800">
            You may cancel or reschedule your appointment up to <strong>24 hours in advance</strong> at no charge.
            Cancellations within 24 hours may incur a $50 fee. No-shows will be charged the full appointment fee.
          </p>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={() => onNavigate('/dashboard/patient/appointments')}
          className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium"
        >
          View My Appointments
        </button>
        <button
          onClick={() => onNavigate('/dashboard/patient/dashboard')}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
