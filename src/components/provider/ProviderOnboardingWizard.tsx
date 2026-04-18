import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { providerOnboardingService } from '../../services/providerOnboardingService';
import { api } from '../../lib/api-client';
import {
  Stethoscope, Shield, Building2, FileCheck, CheckCircle,
  Upload, X, AlertCircle, Clock
} from 'lucide-react';
import AddressAutocomplete, { ParsedAddress } from '../ui/AddressAutocomplete';
import { provinceNameToCode } from '../../lib/address-utils';

interface ProviderOnboardingWizardProps {
  onComplete: () => void;
  existingApplication?: any;
}

type WizardStep = 'professional' | 'license' | 'practice' | 'review';

const STEPS: { id: WizardStep; title: string; icon: React.ReactNode }[] = [
  { id: 'professional', title: 'Professional Info', icon: <Stethoscope size={18} /> },
  { id: 'license', title: 'License & Credentials', icon: <Shield size={18} /> },
  { id: 'practice', title: 'Practice Details', icon: <Building2 size={18} /> },
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

const FALLBACK_PROVIDER_TYPES = [
  { value: 'doctor', label: 'Doctor (MD)' },
  { value: 'dentist', label: 'Dentist' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'nurse', label: 'Nurse Practitioner' },
  { value: 'therapist', label: 'Therapist' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'other', label: 'Other' },
];

const LANGUAGES = [
  'English', 'French', 'Mandarin', 'Cantonese', 'Punjabi',
  'Hindi', 'Spanish', 'Arabic', 'Tagalog', 'Urdu',
  'Portuguese', 'Italian', 'German', 'Korean', 'Tamil',
];

export default function ProviderOnboardingWizard({ onComplete, existingApplication }: ProviderOnboardingWizardProps) {
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>('professional');
  const [applicationId, setApplicationId] = useState<string | null>(existingApplication?.id || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [providerTypes, setProviderTypes] = useState<{ value: string; label: string }[]>(FALLBACK_PROVIDER_TYPES);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);

  const [professionalInfo, setProfessionalInfo] = useState({
    provider_type: existingApplication?.provider_type || '',
    specialty: existingApplication?.specialty || '',
    sub_specialty: existingApplication?.sub_specialty || '',
    professional_title: existingApplication?.professional_title || '',
    years_of_experience: existingApplication?.years_of_experience?.toString() || '',
  });

  const [licenseInfo, setLicenseInfo] = useState({
    license_number: existingApplication?.license_number || '',
    license_province: existingApplication?.license_province || '',
    license_expiry: existingApplication?.license_expiry || '',
  });

  const [practiceInfo, setPracticeInfo] = useState({
    practice_name: existingApplication?.practice_name || '',
    practice_address_line1: existingApplication?.practice_address_line1 || '',
    practice_address_line2: existingApplication?.practice_address_line2 || '',
    practice_city: existingApplication?.practice_city || '',
    practice_province: existingApplication?.practice_province || '',
    practice_postal_code: existingApplication?.practice_postal_code || '',
    practice_phone: existingApplication?.practice_phone || '',
    languages_spoken: existingApplication?.languages_spoken || ['English'],
    accepts_new_patients: existingApplication?.accepts_new_patients ?? true,
    bio: existingApplication?.bio || '',
    professional_website: existingApplication?.professional_website || '',
  });

  useEffect(() => {
    loadProviderTypes();
    loadSpecialties();
    if (applicationId) {
      loadDocuments();
    }
  }, []);

  const loadProviderTypes = async () => {
    try {
      const { data } = await api.get<{ value: string; label: string }[]>('/public/provider-types');
      if (data && data.length > 0) setProviderTypes(data);
    } catch {
      // keep fallback
    }
  };

  const loadSpecialties = async () => {
    try {
      const { data } = await api.get<any[]>('/public/specialties');
      setSpecialties(data || []);
    } catch {
      setSpecialties([]);
    }
  };

  const loadDocuments = async () => {
    if (!applicationId) return;
    try {
      const docs = await providerOnboardingService.getApplicationDocuments(applicationId);
      setUploadedDocs(docs);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const stepIndex = STEPS.findIndex(s => s.id === currentStep);
  const progressPercentage = ((stepIndex + 1) / STEPS.length) * 100;

  const saveApplicationDraft = async () => {
    if (!user || !profile) return null;

    const applicationData: any = {
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone || '',
      date_of_birth: profile.date_of_birth || '2000-01-01',
      provider_type: professionalInfo.provider_type || 'doctor',
      specialty: professionalInfo.specialty || null,
      sub_specialty: professionalInfo.sub_specialty || null,
      professional_title: professionalInfo.professional_title || null,
      years_of_experience: professionalInfo.years_of_experience ? parseInt(professionalInfo.years_of_experience) : 0,
      license_number: licenseInfo.license_number || 'PENDING',
      license_province: licenseInfo.license_province || 'ON',
      license_expiry: licenseInfo.license_expiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      practice_name: practiceInfo.practice_name || null,
      practice_address_line1: practiceInfo.practice_address_line1 || null,
      practice_address_line2: practiceInfo.practice_address_line2 || null,
      practice_city: practiceInfo.practice_city || null,
      practice_province: practiceInfo.practice_province || null,
      practice_postal_code: practiceInfo.practice_postal_code || null,
      practice_phone: practiceInfo.practice_phone || null,
      languages_spoken: practiceInfo.languages_spoken,
      accepts_new_patients: practiceInfo.accepts_new_patients,
      bio: practiceInfo.bio || null,
      professional_website: practiceInfo.professional_website || null,
    };

    if (applicationId) {
      return await providerOnboardingService.updateApplication(applicationId, applicationData);
    } else {
      const app = await providerOnboardingService.createApplication(user.id, applicationData);
      setApplicationId(app.id);
      return app;
    }
  };

  const handleProfessionalNext = async () => {
    setError('');
    if (!professionalInfo.provider_type) {
      setError('Please select your provider type');
      return;
    }

    setLoading(true);
    try {
      await saveApplicationDraft();
      setCurrentStep('license');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseNext = async () => {
    setError('');
    if (!licenseInfo.license_number || !licenseInfo.license_province || !licenseInfo.license_expiry) {
      setError('Please fill in all license fields');
      return;
    }

    setLoading(true);
    try {
      await saveApplicationDraft();
      setCurrentStep('practice');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handlePracticeNext = async () => {
    setError('');
    setLoading(true);
    try {
      await saveApplicationDraft();
      setCurrentStep('review');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, documentType: string) => {
    if (!applicationId) {
      setError('Please save professional info first');
      return;
    }

    setLoading(true);
    try {
      const doc = await providerOnboardingService.uploadDocument(applicationId, file, documentType);
      setUploadedDocs(prev => [...prev, doc]);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!applicationId) return;

    setError('');
    setLoading(true);
    try {
      await saveApplicationDraft();
      await providerOnboardingService.submitApplication(applicationId);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    const current = practiceInfo.languages_spoken;
    if (current.includes(lang)) {
      setPracticeInfo({ ...practiceInfo, languages_spoken: current.filter((l: string) => l !== lang) });
    } else {
      setPracticeInfo({ ...practiceInfo, languages_spoken: [...current, lang] });
    }
  };

  const inputClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-gray-900';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-1">Provider Onboarding</h2>
          <p className="text-slate-300 text-sm mb-5">
            Complete your application to start accepting patients
          </p>

          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${
                      stepIndex > index
                        ? 'bg-sky-400 text-white'
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
                  <div className={`flex-1 h-0.5 mx-2 mt-[-12px] ${stepIndex > index ? 'bg-sky-400' : 'bg-slate-600'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="w-full bg-slate-600 rounded-full h-1.5 mt-3">
            <div
              className="bg-sky-400 h-1.5 rounded-full transition-all duration-300"
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

          {currentStep === 'professional' && (
            <ProfessionalInfoStep
              data={professionalInfo}
              onChange={setProfessionalInfo}
              specialties={specialties}
              providerTypes={providerTypes}
              inputClass={inputClass}
              labelClass={labelClass}
              loading={loading}
              onNext={handleProfessionalNext}
            />
          )}

          {currentStep === 'license' && (
            <LicenseStep
              data={licenseInfo}
              onChange={setLicenseInfo}
              uploadedDocs={uploadedDocs}
              onUpload={handleFileUpload}
              inputClass={inputClass}
              labelClass={labelClass}
              loading={loading}
              onBack={() => setCurrentStep('professional')}
              onNext={handleLicenseNext}
            />
          )}

          {currentStep === 'practice' && (
            <PracticeDetailsStep
              data={practiceInfo}
              onChange={setPracticeInfo}
              languages={LANGUAGES}
              toggleLanguage={toggleLanguage}
              inputClass={inputClass}
              labelClass={labelClass}
              loading={loading}
              onBack={() => setCurrentStep('license')}
              onNext={handlePracticeNext}
            />
          )}

          {currentStep === 'review' && (
            <ReviewStep
              professionalInfo={professionalInfo}
              licenseInfo={licenseInfo}
              practiceInfo={practiceInfo}
              uploadedDocs={uploadedDocs}
              specialties={specialties}
              providerTypes={providerTypes}
              loading={loading}
              onBack={() => setCurrentStep('practice')}
              onSubmit={handleSubmitApplication}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProfessionalInfoStep({ data, onChange, specialties, providerTypes, inputClass, labelClass, loading, onNext }: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Professional Information</h3>

      <div>
        <label className={labelClass}>Provider Type *</label>
        <select
          value={data.provider_type}
          onChange={(e) => onChange({ ...data, provider_type: e.target.value })}
          className={inputClass}
        >
          <option value="">Select type</option>
          {providerTypes.map((t: any) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Primary Specialty</label>
        <select
          value={data.specialty}
          onChange={(e) => onChange({ ...data, specialty: e.target.value })}
          className={inputClass}
        >
          <option value="">Select specialty</option>
          {specialties.map((s: any) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Sub-Specialty</label>
        <input
          type="text"
          value={data.sub_specialty}
          onChange={(e) => onChange({ ...data, sub_specialty: e.target.value })}
          placeholder="e.g., Interventional Cardiology"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Professional Title</label>
          <input
            type="text"
            value={data.professional_title}
            onChange={(e) => onChange({ ...data, professional_title: e.target.value })}
            placeholder="e.g., Dr., NP, RN"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Years of Experience</label>
          <input
            type="number"
            value={data.years_of_experience}
            onChange={(e) => onChange({ ...data, years_of_experience: e.target.value })}
            min="0"
            max="60"
            className={inputClass}
          />
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={loading}
        className="w-full px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:bg-gray-300 font-semibold transition-all"
      >
        {loading ? 'Saving...' : 'Continue'}
      </button>
    </div>
  );
}

function LicenseStep({ data, onChange, uploadedDocs, onUpload, inputClass, labelClass, loading, onBack, onNext }: any) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file, docType);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">License & Credentials</h3>

      <div>
        <label className={labelClass}>License Number *</label>
        <input
          type="text"
          value={data.license_number}
          onChange={(e) => onChange({ ...data, license_number: e.target.value })}
          placeholder="e.g., CPSO-12345"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Licensing Province *</label>
          <select
            value={data.license_province}
            onChange={(e) => onChange({ ...data, license_province: e.target.value })}
            className={inputClass}
          >
            <option value="">Select province</option>
            {PROVINCES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>License Expiry Date *</label>
          <input
            type="date"
            value={data.license_expiry}
            onChange={(e) => onChange({ ...data, license_expiry: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Upload Documents (optional)</h4>
        <p className="text-xs text-gray-500 mb-3">
          Upload your license certificate, board certifications, or other credentials. You can add more later.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Medical License</label>
            <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-sky-400 cursor-pointer transition-colors">
              <Upload size={18} className="text-gray-400" />
              <span className="text-sm text-gray-500">Choose file...</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, 'medical_license')}
              />
            </label>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Board Certification</label>
            <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-sky-400 cursor-pointer transition-colors">
              <Upload size={18} className="text-gray-400" />
              <span className="text-sm text-gray-500">Choose file...</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, 'board_certification')}
              />
            </label>
          </div>
        </div>

        {uploadedDocs.length > 0 && (
          <div className="mt-3 space-y-2">
            {uploadedDocs.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-2 text-sm bg-green-50 text-green-700 p-2 rounded-lg">
                <CheckCircle size={14} />
                <span>{doc.document_name}</span>
                <span className="text-xs text-green-500">({doc.document_type})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:bg-gray-300 font-semibold transition-all"
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

function PracticeDetailsStep({ data, onChange, languages, toggleLanguage, inputClass, labelClass, loading, onBack, onNext }: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Practice Details</h3>

      <div>
        <label className={labelClass}>Practice / Clinic Name</label>
        <input
          type="text"
          value={data.practice_name}
          onChange={(e) => onChange({ ...data, practice_name: e.target.value })}
          placeholder="e.g., Downtown Family Health Clinic"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Search Practice Address</label>
        <AddressAutocomplete
          placeholder="Start typing to search address..."
          onSelect={(addr: ParsedAddress) => {
            onChange({
              ...data,
              practice_address_line1: addr.addressLine1 || data.practice_address_line1,
              practice_city: addr.city || data.practice_city,
              practice_province: provinceNameToCode(addr.province) || data.practice_province,
              practice_postal_code: addr.postalCode || data.practice_postal_code,
            });
          }}
        />
        <p className="text-xs text-gray-500 mt-1">Pick a suggestion to auto-fill the fields below.</p>
      </div>

      <div>
        <label className={labelClass}>Practice Address</label>
        <input
          type="text"
          value={data.practice_address_line1}
          onChange={(e) => onChange({ ...data, practice_address_line1: e.target.value })}
          placeholder="Street address"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>City</label>
          <input
            type="text"
            value={data.practice_city}
            onChange={(e) => onChange({ ...data, practice_city: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Province</label>
          <select
            value={data.practice_province}
            onChange={(e) => onChange({ ...data, practice_province: e.target.value })}
            className={inputClass}
          >
            <option value="">Select</option>
            {PROVINCES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Postal Code</label>
          <input
            type="text"
            value={data.practice_postal_code}
            onChange={(e) => onChange({ ...data, practice_postal_code: e.target.value.toUpperCase() })}
            placeholder="A1A 1A1"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Practice Phone</label>
        <input
          type="tel"
          value={data.practice_phone}
          onChange={(e) => onChange({ ...data, practice_phone: e.target.value })}
          placeholder="+1 (555) 123-4567"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Bio / About</label>
        <textarea
          value={data.bio}
          onChange={(e) => onChange({ ...data, bio: e.target.value })}
          rows={3}
          placeholder="Tell patients about your experience and approach to care..."
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Professional Website</label>
        <input
          type="url"
          value={data.professional_website}
          onChange={(e) => onChange({ ...data, professional_website: e.target.value })}
          placeholder="https://www.yourpractice.com"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Languages Spoken</label>
        <div className="flex flex-wrap gap-2">
          {languages.map((lang: string) => (
            <button
              key={lang}
              type="button"
              onClick={() => toggleLanguage(lang)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                data.languages_spoken.includes(lang)
                  ? 'bg-sky-100 text-sky-700 border border-sky-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="accepts_new"
          checked={data.accepts_new_patients}
          onChange={(e) => onChange({ ...data, accepts_new_patients: e.target.checked })}
          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
        />
        <label htmlFor="accepts_new" className="text-sm text-gray-700">
          Currently accepting new patients
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:bg-gray-300 font-semibold transition-all"
        >
          {loading ? 'Saving...' : 'Review Application'}
        </button>
      </div>
    </div>
  );
}

function ReviewStep({ professionalInfo, licenseInfo, practiceInfo, uploadedDocs, specialties, providerTypes, loading, onBack, onSubmit }: any) {
  const specialtyName = specialties.find((s: any) => s.name === professionalInfo.specialty)?.name || professionalInfo.specialty;
  const providerTypeLabel = (providerTypes || FALLBACK_PROVIDER_TYPES).find((t: any) => t.value === professionalInfo.provider_type)?.label || professionalInfo.provider_type;
  const provinceLabel = PROVINCES.find(p => p.value === licenseInfo.license_province)?.label || licenseInfo.license_province;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Review Your Application</h3>
      <p className="text-sm text-gray-500">
        Please review your information before submitting. Your application will be reviewed by our team.
      </p>

      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Stethoscope size={16} className="text-sky-600" />
            Professional Information
          </h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div><span className="text-gray-500">Type:</span> <span className="text-gray-800 font-medium">{providerTypeLabel}</span></div>
            {specialtyName && <div><span className="text-gray-500">Specialty:</span> <span className="text-gray-800 font-medium">{specialtyName}</span></div>}
            {professionalInfo.professional_title && <div><span className="text-gray-500">Title:</span> <span className="text-gray-800 font-medium">{professionalInfo.professional_title}</span></div>}
            {professionalInfo.years_of_experience && <div><span className="text-gray-500">Experience:</span> <span className="text-gray-800 font-medium">{professionalInfo.years_of_experience} years</span></div>}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Shield size={16} className="text-sky-600" />
            License
          </h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div><span className="text-gray-500">Number:</span> <span className="text-gray-800 font-medium">{licenseInfo.license_number}</span></div>
            <div><span className="text-gray-500">Province:</span> <span className="text-gray-800 font-medium">{provinceLabel}</span></div>
            <div><span className="text-gray-500">Expiry:</span> <span className="text-gray-800 font-medium">{licenseInfo.license_expiry}</span></div>
          </div>
        </div>

        {(practiceInfo.practice_name || practiceInfo.practice_city) && (
          <div className="border-t border-gray-200 pt-3">
            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Building2 size={16} className="text-sky-600" />
              Practice
            </h4>
            <div className="text-sm space-y-1">
              {practiceInfo.practice_name && <div><span className="text-gray-500">Name:</span> <span className="text-gray-800 font-medium">{practiceInfo.practice_name}</span></div>}
              {practiceInfo.practice_city && (
                <div><span className="text-gray-500">Location:</span> <span className="text-gray-800 font-medium">{practiceInfo.practice_city}, {PROVINCES.find(p => p.value === practiceInfo.practice_province)?.label || practiceInfo.practice_province}</span></div>
              )}
              {practiceInfo.languages_spoken.length > 0 && (
                <div><span className="text-gray-500">Languages:</span> <span className="text-gray-800 font-medium">{practiceInfo.languages_spoken.join(', ')}</span></div>
              )}
            </div>
          </div>
        )}

        {uploadedDocs.length > 0 && (
          <div className="border-t border-gray-200 pt-3">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Uploaded Documents</h4>
            <div className="space-y-1">
              {uploadedDocs.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle size={14} className="text-green-500" />
                  {doc.document_name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <Clock size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          After submitting, your application will be reviewed by our team. This typically takes 2-5 business days.
          You will receive a notification once your application has been processed.
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:bg-gray-300 font-semibold transition-all"
        >
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </div>
  );
}
