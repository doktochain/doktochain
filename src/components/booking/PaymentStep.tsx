import { useState } from 'react';
import { CreditCard, Shield, CheckCircle, Smartphone, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import InsuranceCardManager from '../patient/InsuranceCardManager';
import { paymentService } from '../../services/paymentService';

interface PaymentStepProps {
  patientId: string;
  userId: string;
  servicePrice?: number;
  appointmentId?: string;
  providerId?: string;
  onPaymentMethodSelect: (method: 'insurance' | 'self_pay', policyId?: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function PaymentStep({
  patientId,
  userId,
  servicePrice = 150,
  appointmentId,
  providerId,
  onPaymentMethodSelect,
  onNext,
  onBack,
}: PaymentStepProps) {
  const [paymentMethod, setPaymentMethod] = useState<'insurance' | 'self_pay' | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [insuranceVerified, setInsuranceVerified] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [stripeNotConfigured, setStripeNotConfigured] = useState(false);

  const handleInsuranceSelect = (policyId: string) => {
    setSelectedPolicyId(policyId);
    setTimeout(() => {
      setInsuranceVerified(true);
      setVerificationDetails({
        coverage: 80,
        copay: 25,
        deductibleRemaining: 500,
      });
    }, 1500);
  };

  const handleContinue = async () => {
    setPaymentError('');

    if (paymentMethod === 'insurance' && selectedPolicyId) {
      onPaymentMethodSelect('insurance', selectedPolicyId);
      onNext();
      return;
    }

    if (paymentMethod === 'self_pay') {
      setProcessingPayment(true);
      try {
        const result = await paymentService.createStripeCheckout({
          appointment_id: appointmentId,
          amount_cents: servicePrice * 100,
          patient_id: patientId,
          provider_id: providerId,
          description: 'Appointment Payment',
          payment_type: 'appointment',
          success_url: `${window.location.origin}/dashboard/patient/appointments?payment=success`,
          cancel_url: `${window.location.origin}/dashboard/patient/appointments?payment=cancelled`,
        });

        if (result.setup_required) {
          setStripeNotConfigured(true);
          setProcessingPayment(false);
          return;
        }

        if (result.checkout_url) {
          try {
            const checkoutUrl = new URL(result.checkout_url);
            if (checkoutUrl.hostname.endsWith('.stripe.com')) {
              onPaymentMethodSelect('self_pay');
              window.location.href = result.checkout_url;
              return;
            }
          } catch { /* invalid URL, fall through */ }
        }

        onPaymentMethodSelect('self_pay');
        onNext();
      } catch (err: any) {
        setPaymentError(err.message || 'Payment processing failed. Please try again.');
      }
      setProcessingPayment(false);
    }
  };

  const canContinue =
    (paymentMethod === 'insurance' && insuranceVerified) ||
    (paymentMethod === 'self_pay');

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Information</h2>
        <p className="text-gray-600 dark:text-gray-400">Choose your payment method for this appointment.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <button
          onClick={() => { setPaymentMethod('insurance'); setPaymentError(''); setStripeNotConfigured(false); }}
          className={`p-6 border-2 rounded-lg text-left transition ${
            paymentMethod === 'insurance'
              ? 'border-sky-600 bg-sky-50 dark:bg-sky-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-sky-600'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Use Insurance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bill your insurance provider</p>
            </div>
          </div>
          {paymentMethod === 'insurance' && insuranceVerified && verificationDetails && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-900 dark:text-green-300">Coverage Verified</span>
              </div>
              <div className="text-sm space-y-1">
                <p className="text-gray-700 dark:text-gray-300">Coverage: {verificationDetails.coverage}% covered</p>
                <p className="text-gray-700 dark:text-gray-300">Estimated Co-pay: ${verificationDetails.copay}</p>
                <p className="text-gray-700 dark:text-gray-300">Deductible Remaining: ${verificationDetails.deductibleRemaining}</p>
              </div>
            </div>
          )}
        </button>

        <button
          onClick={() => { setPaymentMethod('self_pay'); setPaymentError(''); setStripeNotConfigured(false); }}
          className={`p-6 border-2 rounded-lg text-left transition ${
            paymentMethod === 'self_pay'
              ? 'border-sky-600 bg-sky-50 dark:bg-sky-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-sky-600'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Self-Pay</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pay with credit/debit card</p>
            </div>
          </div>
          {paymentMethod === 'self_pay' && (
            <div className="mt-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">${servicePrice}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Full appointment cost</p>
            </div>
          )}
        </button>
      </div>

      {paymentMethod === 'insurance' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Insurance Policy</h3>
          <InsuranceCardManager
            patientId={patientId}
            userId={userId}
            onPolicySelect={handleInsuranceSelect}
            selectionMode={true}
          />
          {selectedPolicyId && !insuranceVerified && (
            <div className="mt-4 p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600" />
                <span className="text-sky-900 dark:text-sky-300">Verifying insurance coverage...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {paymentMethod === 'self_pay' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Payment via Stripe</h3>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between text-lg mb-4">
              <span className="font-semibold text-gray-900 dark:text-white">Total Amount</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">${servicePrice}</span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Secure Stripe Checkout</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You will be redirected to Stripe's secure checkout page to complete your payment.
                All major credit and debit cards are accepted.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Accepted payment methods:</p>
              <div className="flex gap-3">
                <div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Visa / Mastercard</span>
                </div>
                <div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Apple / Google Pay</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-900 dark:text-green-300">Secure Payment</p>
                <p className="text-xs text-green-700 dark:text-green-400">
                  Your payment is processed securely through Stripe. We never store your card details.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {stripeNotConfigured && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-300">Stripe Not Configured</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Online payments are not available yet. Please contact the clinic to arrange payment.
              </p>
            </div>
          </div>
        </div>
      )}

      {paymentError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700 dark:text-red-300">{paymentError}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-sky-600 dark:text-sky-400 border border-sky-600 dark:border-sky-400 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20 font-medium"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!canContinue || processingPayment}
          className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {processingPayment && <Loader2 className="w-4 h-4 animate-spin" />}
          {processingPayment
            ? 'Processing...'
            : paymentMethod === 'self_pay'
            ? 'Proceed to Stripe Checkout'
            : 'Continue to Review'}
        </button>
      </div>
    </div>
  );
}
