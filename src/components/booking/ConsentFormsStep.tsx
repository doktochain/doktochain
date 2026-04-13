import { useState, useRef } from 'react';
import { CheckCircle, PenLine, Shield } from 'lucide-react';
import { ConsentForm } from '../../services/enhancedBookingService';
import { consentService } from '../../services/consentService';

interface ConsentFormsStepProps {
  forms: ConsentForm[];
  signedForms: Set<string>;
  onSignForm: (formId: string, signature: string) => void;
  onNext: () => void;
  onBack: () => void;
  patientId?: string;
  providerId?: string;
}

export default function ConsentFormsStep({
  forms,
  signedForms,
  onSignForm,
  onNext,
  onBack,
  patientId,
  providerId,
}: ConsentFormsStepProps) {
  const [currentForm, setCurrentForm] = useState<ConsentForm | null>(forms[0] || null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signature, setSignature] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataConsentGranted, setDataConsentGranted] = useState(false);
  const [consentDuration, setConsentDuration] = useState(90);
  const [grantingConsent, setGrantingConsent] = useState(false);

  const allFormsSigned = forms.every((form) => signedForms.has(form.id));
  const canProceed = allFormsSigned && (dataConsentGranted || !patientId || !providerId);

  const handleSignatureStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleSignatureDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleSignatureEnd = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL();
    setSignature(signatureData);
    setShowSignatureModal(false);
  };

  const handleFormSign = () => {
    if (!currentForm) return;
    onSignForm(currentForm.id, signature || 'Electronic Signature');
    const currentIndex = forms.findIndex((f) => f.id === currentForm.id);
    if (currentIndex < forms.length - 1) {
      setCurrentForm(forms[currentIndex + 1]);
      setSignature('');
    }
  };

  if (!currentForm) {
    return <div>No consent forms available</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Consent Forms</h2>
        <p className="text-gray-600">
          Please review and sign the following consent forms to proceed with your appointment.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex gap-2">
          {forms.map((form) => (
            <div
              key={form.id}
              className={`flex-1 h-2 rounded-full ${
                signedForms.has(form.id)
                  ? 'bg-green-500'
                  : currentForm.id === form.id
                  ? 'bg-sky-600'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>Form {forms.findIndex((f) => f.id === currentForm.id) + 1} of {forms.length}</span>
          <span>{forms.filter((f) => signedForms.has(f.id)).length} signed</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{currentForm.formTitle}</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {currentForm.formContent}
          </p>
        </div>

        {signedForms.has(currentForm.id) ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="font-semibold text-green-900">Form Signed</p>
              <p className="text-sm text-green-700">You have electronically signed this consent form</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <label className="flex items-start">
                <input type="checkbox" className="mt-1 mr-3 accent-sky-600" required />
                <span className="text-sm text-gray-700">
                  I have read and understand the above consent form. I agree to the terms and
                  conditions outlined.
                </span>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Electronic Signature
                </label>
                {signature ? (
                  <div className="border border-gray-300 rounded-lg p-4 bg-white">
                    <img src={signature} alt="Signature" className="h-20" />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSignatureModal(true)}
                    className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-sky-600 hover:bg-sky-50 transition flex flex-col items-center gap-2"
                  >
                    <PenLine className="w-6 h-6 text-gray-400" />
                    <span className="text-gray-600">Click to sign</span>
                  </button>
                )}
              </div>

              {signature && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setSignature('')}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Clear Signature
                  </button>
                  <button
                    onClick={handleFormSign}
                    className="flex-1 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium"
                  >
                    Sign This Form
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {patientId && providerId && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Shield className="w-5 h-5 text-teal-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900">Health Records Data Sharing</h3>
              <p className="text-sm text-gray-600 mt-1">
                By booking this appointment, you authorize the provider to access your health records for the duration specified below.
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Access Duration</label>
            <div className="flex gap-2">
              {[
                { value: 30, label: '30 days' },
                { value: 90, label: '90 days' },
                { value: 365, label: '1 year' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setConsentDuration(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    consentDuration === opt.value
                      ? 'border-teal-600 bg-teal-50 text-teal-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={dataConsentGranted}
              onChange={async (e) => {
                if (e.target.checked && !dataConsentGranted) {
                  setGrantingConsent(true);
                  const { error } = await consentService.grantConsent({
                    patientId,
                    providerId,
                    consentType: 'record_access',
                    recordTypes: [],
                    durationDays: consentDuration,
                  });
                  setGrantingConsent(false);
                  if (!error) {
                    setDataConsentGranted(true);
                  }
                } else {
                  setDataConsentGranted(false);
                }
              }}
              disabled={grantingConsent}
              className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 mt-0.5"
            />
            <span className="text-sm text-gray-700">
              I acknowledge and consent to sharing my health records with this provider for the selected duration.
            </span>
          </label>
          {dataConsentGranted && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              Data sharing consent granted
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-sky-600 border border-sky-600 rounded-lg hover:bg-sky-50 font-medium"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {canProceed ? 'Continue to Payment' : 'Complete All Steps to Continue'}
        </button>
      </div>

      {showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Draw Your Signature</h3>
            <div className="border-2 border-gray-300 rounded-lg mb-4 bg-white">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full cursor-crosshair"
                onMouseDown={handleSignatureStart}
                onMouseMove={handleSignatureDraw}
                onMouseUp={handleSignatureEnd}
                onMouseLeave={handleSignatureEnd}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={clearSignature}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveSignature}
                className="flex-1 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium"
              >
                Save Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
