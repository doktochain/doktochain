import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import TermsCheckbox, { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '../auth/TermsCheckbox';
import {
  Building2, Clock, Shield, CheckCircle, AlertCircle, FileCheck
} from 'lucide-react';

interface PharmacyOnboardingWizardProps {
  onComplete: () => void;
}

type WizardStep = 'details' | 'hours' | 'license' | 'review';

const STEPS: { id: WizardStep; title: string; icon: React.ReactNode }[] = [
  { id: 'details', title: 'Pharmacy Details', icon: <Building2 size={18} /> },
  { id: 'hours', title: 'Business Hours', icon: <Clock size={18} /> },
  { id: 'license', title: 'License Info', icon: <Shield size={18} /> },
  { id: 'review', title: 'Review & Submit', icon: <FileCheck size={18} /> },
];

const PROVINCES = [
  { value: 'ON', label: 'Ontario' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'AB', label: 'Alberta' },
  { value: 'QC', label: 'Quebec' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'YT', label: 'Yukon' },
  { value: 'NU', label: 'Nunavut' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function PharmacyOnboardingWizard({ onComplete }: PharmacyOnboardingWizardProps) {
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [details, setDetails] = useState({
    pharmacy_name: '',
    phone: '',
    fax: '',
    email: profile?.email || '',
    address_line1: '',
    address_line2: '',
    city: '',
    province: '',
    postal_code: '',
    accepts_delivery: true,
  });

  const [hours, setHours] = useState(
    DAY_NAMES.map((_, i) => ({
      day_of_week: i,
      is_open: i >= 1 && i <= 5,
      opening_time: '09:00',
      closing_time: '18:00',
    }))
  );

  const [licenseInfo, setLicenseInfo] = useState({
    license_number: '',
    pharmacist_license: '',
    pharmacist_license_expiry: '',
  });

  const stepIndex = STEPS.findIndex(s => s.id === currentStep);
  const progressPercentage = ((stepIndex + 1) / STEPS.length) * 100;

  const handleDetailsNext = () => {
    setError('');
    if (!details.pharmacy_name || !details.phone || !details.email || !details.address_line1 || !details.city || !details.province || !details.postal_code) {
      setError('Please fill in all required fields');
      return;
    }
    setCurrentStep('hours');
  };

  const handleHoursNext = () => {
    setCurrentStep('license');
  };

  const handleLicenseNext = () => {
    setError('');
    if (!licenseInfo.license_number) {
      setError('Pharmacy license number is required');
      return;
    }
    setCurrentStep('review');
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy to continue');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const now = new Date().toISOString();
      await supabase.from('user_profiles').update({
        terms_accepted_at: now,
        privacy_accepted_at: now,
        terms_version: CURRENT_TERMS_VERSION,
        privacy_version: CURRENT_PRIVACY_VERSION,
      }).eq('id', user.id);

      const hoursObj: Record<string, any> = {};
      hours.forEach(h => {
        hoursObj[DAY_NAMES[h.day_of_week]] = h.is_open
          ? { open: h.opening_time, close: h.closing_time }
          : { closed: true };
      });

      const pharmacyData = {
        pharmacy_name: details.pharmacy_name,
        license_number: licenseInfo.license_number,
        phone: details.phone,
        fax: details.fax || null,
        email: details.email,
        address_line1: details.address_line1,
        address_line2: details.address_line2 || null,
        city: details.city,
        province: details.province,
        postal_code: details.postal_code,
        hours_of_operation: hoursObj,
        accepts_delivery: details.accepts_delivery,
        is_active: false,
        is_verified: false,
        onboarding_status: 'submitted',
      };

      const { data: existing } = await supabase
        .from('pharmacies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('pharmacies')
          .update(pharmacyData)
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('pharmacies')
          .insert({ user_id: user.id, ...pharmacyData });
        if (insertError) throw insertError;
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to submit pharmacy application');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-1">Pharmacy Onboarding</h2>
          <p className="text-slate-300 text-sm mb-5">
            Set up your pharmacy to start receiving prescriptions and orders
          </p>

          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${
                      stepIndex > index
                        ? 'bg-emerald-400 text-white'
                        : stepIndex === index
                        ? 'bg-white text-slate-800'
                        : 'bg-slate-600 text-slate-400'
                    }`}
                  >
                    {stepIndex > index ? <CheckCircle size={18} /> : step.icon}
                  </div>
                  <span className={`text-xs mt-1 whitespace-nowrap ${stepIndex >= index ? 'text-white' : 'text-slate-400'}`}>
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mt-[-12px] ${stepIndex > index ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="w-full bg-slate-600 rounded-full h-1.5 mt-3">
            <div
              className="bg-emerald-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {currentStep === 'details' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Pharmacy Details</h3>

              <div>
                <label className={labelClass}>Pharmacy Name *</label>
                <input
                  type="text"
                  value={details.pharmacy_name}
                  onChange={(e) => setDetails({ ...details, pharmacy_name: e.target.value })}
                  placeholder="e.g., HealthFirst Pharmacy"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Phone *</label>
                  <input
                    type="tel"
                    value={details.phone}
                    onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fax</label>
                  <input
                    type="tel"
                    value={details.fax}
                    onChange={(e) => setDetails({ ...details, fax: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email *</label>
                <input
                  type="email"
                  value={details.email}
                  onChange={(e) => setDetails({ ...details, email: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Street Address *</label>
                <input
                  type="text"
                  value={details.address_line1}
                  onChange={(e) => setDetails({ ...details, address_line1: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>City *</label>
                  <input
                    type="text"
                    value={details.city}
                    onChange={(e) => setDetails({ ...details, city: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Province *</label>
                  <select
                    value={details.province}
                    onChange={(e) => setDetails({ ...details, province: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select</option>
                    {PROVINCES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Postal Code *</label>
                  <input
                    type="text"
                    value={details.postal_code}
                    onChange={(e) => setDetails({ ...details, postal_code: e.target.value.toUpperCase() })}
                    placeholder="A1A 1A1"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="delivery"
                  checked={details.accepts_delivery}
                  onChange={(e) => setDetails({ ...details, accepts_delivery: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="delivery" className="text-sm text-gray-700">
                  Offers delivery service
                </label>
              </div>

              <button
                onClick={handleDetailsNext}
                className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-all"
              >
                Continue
              </button>
            </div>
          )}

          {currentStep === 'hours' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Business Hours</h3>
              <p className="text-sm text-gray-500">Set your typical operating hours</p>

              <div className="space-y-3">
                {hours.map((h, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-28">
                      <span className="font-medium text-gray-800 text-sm">{DAY_NAMES[h.day_of_week]}</span>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={h.is_open}
                        onChange={(e) => {
                          const updated = [...hours];
                          updated[index] = { ...updated[index], is_open: e.target.checked };
                          setHours(updated);
                        }}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-600">Open</span>
                    </label>
                    {h.is_open && (
                      <>
                        <input
                          type="time"
                          value={h.opening_time}
                          onChange={(e) => {
                            const updated = [...hours];
                            updated[index] = { ...updated[index], opening_time: e.target.value };
                            setHours(updated);
                          }}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                        />
                        <span className="text-gray-400 text-sm">to</span>
                        <input
                          type="time"
                          value={h.closing_time}
                          onChange={(e) => {
                            const updated = [...hours];
                            updated[index] = { ...updated[index], closing_time: e.target.value };
                            setHours(updated);
                          }}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                        />
                      </>
                    )}
                    {!h.is_open && (
                      <span className="text-sm text-gray-400">Closed</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCurrentStep('details')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={handleHoursNext}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-all"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {currentStep === 'license' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">License Information</h3>

              <div>
                <label className={labelClass}>Pharmacy License Number *</label>
                <input
                  type="text"
                  value={licenseInfo.license_number}
                  onChange={(e) => setLicenseInfo({ ...licenseInfo, license_number: e.target.value })}
                  placeholder="e.g., OCP-12345"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Pharmacist-in-Charge License Number</label>
                <input
                  type="text"
                  value={licenseInfo.pharmacist_license}
                  onChange={(e) => setLicenseInfo({ ...licenseInfo, pharmacist_license: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Pharmacist License Expiry Date</label>
                <input
                  type="date"
                  value={licenseInfo.pharmacist_license_expiry}
                  onChange={(e) => setLicenseInfo({ ...licenseInfo, pharmacist_license_expiry: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCurrentStep('hours')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={handleLicenseNext}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-all"
                >
                  Review Application
                </button>
              </div>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Review Your Pharmacy Information</h3>
              <p className="text-sm text-gray-500">
                Please review your details before submitting.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Building2 size={16} className="text-emerald-600" />
                    Pharmacy Details
                  </h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div><span className="text-gray-500">Name:</span> <span className="text-gray-800 font-medium">{details.pharmacy_name}</span></div>
                    <div><span className="text-gray-500">Phone:</span> <span className="text-gray-800 font-medium">{details.phone}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="text-gray-800 font-medium">{details.email}</span></div>
                    <div><span className="text-gray-500">City:</span> <span className="text-gray-800 font-medium">{details.city}, {PROVINCES.find(p => p.value === details.province)?.label}</span></div>
                    <div><span className="text-gray-500">Delivery:</span> <span className="text-gray-800 font-medium">{details.accepts_delivery ? 'Yes' : 'No'}</span></div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Clock size={16} className="text-emerald-600" />
                    Business Hours
                  </h4>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {hours.map(h => (
                      <div key={h.day_of_week}>
                        <span className="text-gray-500">{DAY_NAMES[h.day_of_week]}:</span>{' '}
                        <span className="text-gray-800 font-medium">
                          {h.is_open ? `${h.opening_time} - ${h.closing_time}` : 'Closed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Shield size={16} className="text-emerald-600" />
                    License
                  </h4>
                  <div className="text-sm">
                    <div><span className="text-gray-500">License #:</span> <span className="text-gray-800 font-medium">{licenseInfo.license_number}</span></div>
                    {licenseInfo.pharmacist_license && (
                      <div><span className="text-gray-500">Pharmacist License:</span> <span className="text-gray-800 font-medium">{licenseInfo.pharmacist_license}</span></div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <Clock size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  Your pharmacy will be reviewed and verified by our team before it goes live on the platform.
                </div>
              </div>

              <TermsCheckbox accepted={termsAccepted} onChange={setTermsAccepted} />

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('license')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !termsAccepted}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-all"
                >
                  {loading ? 'Creating Pharmacy...' : 'Submit & Create Pharmacy'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
