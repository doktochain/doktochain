import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { providerOnboardingService, ProviderOnboardingApplication } from '../../services/providerOnboardingService';
import { supabase } from '../../lib/supabase';
import TermsCheckbox, { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from './TermsCheckbox';
import { User, Car as IdCard, Briefcase, Upload, CheckCircle } from 'lucide-react';
import AddressAutocomplete, { ParsedAddress } from '../ui/AddressAutocomplete';
import { provinceNameToCode } from '../../lib/address-utils';

const PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' }
];

const PROVIDER_TYPES = [
  { value: 'doctor', label: 'Medical Doctor (MD)' },
  { value: 'dentist', label: 'Dentist (DDS/DMD)' },
  { value: 'specialist', label: 'Medical Specialist' },
  { value: 'nurse', label: 'Nurse Practitioner' },
  { value: 'therapist', label: 'Therapist/Counselor' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'other', label: 'Other Healthcare Professional' }
];

const DOCUMENT_TYPES = [
  { value: 'government_id', label: 'Government-Issued ID', required: true },
  { value: 'medical_license', label: 'Medical License', required: true },
  { value: 'professional_liability_insurance', label: 'Liability Insurance', required: true },
  { value: 'educational_certificate', label: 'Educational Certificate', required: false },
  { value: 'board_certification', label: 'Board Certification', required: false },
  { value: 'cv_resume', label: 'CV/Resume', required: false }
];

export default function ProviderRegistration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: user?.email || '',
    phone: '',
    date_of_birth: '',
    provider_type: '',
    specialty: '',
    sub_specialty: '',
    professional_title: '',
    license_number: '',
    license_province: '',
    license_expiry: '',
    years_of_experience: 0,
    practice_name: '',
    practice_address_line1: '',
    practice_city: '',
    practice_province: '',
    practice_postal_code: '',
    practice_phone: '',
    languages_spoken: ['en'],
    accepts_new_patients: true,
    bio: ''
  });

  const [documents, setDocuments] = useState<{ [key: string]: File | null }>({});
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (documentType: string, file: File | null) => {
    setDocuments(prev => ({ ...prev, [documentType]: file }));
  };

  const saveApplication = async (status: 'draft' | 'submitted' = 'draft') => {
    if (!user) return;

    setLoading(true);
    try {
      if (!applicationId) {
        const application = await providerOnboardingService.createApplication(user.id, {
          ...formData,
          application_status: status
        } as Partial<ProviderOnboardingApplication>);
        setApplicationId(application.id);
        return application.id;
      } else {
        await providerOnboardingService.updateApplication(applicationId, {
          ...formData,
          application_status: status
        } as Partial<ProviderOnboardingApplication>);
        return applicationId;
      }
    } catch (error) {
      console.error('Error saving application:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    await saveApplication('draft');
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleUploadDocument = async (documentType: string) => {
    const file = documents[documentType];
    if (!file || !applicationId) return;

    setLoading(true);
    try {
      await providerOnboardingService.uploadDocument(applicationId, file, documentType);
      setUploadedDocs(prev => new Set([...prev, documentType]));
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!termsAccepted) return;
    setLoading(true);
    try {
      if (user) {
        const now = new Date().toISOString();
        await supabase.from('user_profiles').update({
          terms_accepted_at: now,
          privacy_accepted_at: now,
          terms_version: CURRENT_TERMS_VERSION,
          privacy_version: CURRENT_PRIVACY_VERSION,
        }).eq('id', user.id);
      }

      const appId = await saveApplication('submitted');
      if (appId) {
        await providerOnboardingService.submitApplication(appId);
        await providerOnboardingService.createApprovalSteps(appId);
        navigate('/dashboard/provider/onboarding-status');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {[1, 2, 3, 4].map((stepNum) => (
        <div key={stepNum} className="flex items-center flex-1">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
            step >= stepNum ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-400'
          }`}>
            {step > stepNum ? <CheckCircle /> : stepNum}
          </div>
          {stepNum < 4 && (
            <div className={`flex-1 h-1 mx-2 ${step > stepNum ? 'bg-blue-600' : 'bg-gray-300'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="text-2xl text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Personal Information</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
          <input
            type="text"
            value={formData.first_name}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
          <input
            type="text"
            value={formData.last_name}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="(555) 123-4567"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
          <input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>
    </div>
  );

  const renderProfessionalInfo = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <IdCard className="text-2xl text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Professional Credentials</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Provider Type *</label>
        <select
          value={formData.provider_type}
          onChange={(e) => handleInputChange('provider_type', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select provider type</option>
          {PROVIDER_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
          <input
            type="text"
            value={formData.specialty}
            onChange={(e) => handleInputChange('specialty', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Cardiology, Pediatrics"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Professional Title</label>
          <input
            type="text"
            value={formData.professional_title}
            onChange={(e) => handleInputChange('professional_title', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., MD, DDS, NP"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">License Number *</label>
          <input
            type="text"
            value={formData.license_number}
            onChange={(e) => handleInputChange('license_number', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">License Province *</label>
          <select
            value={formData.license_province}
            onChange={(e) => handleInputChange('license_province', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select province</option>
            {PROVINCES.map(province => (
              <option key={province.code} value={province.code}>{province.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">License Expiry Date *</label>
          <input
            type="date"
            value={formData.license_expiry}
            onChange={(e) => handleInputChange('license_expiry', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
          <input
            type="number"
            value={formData.years_of_experience}
            onChange={(e) => handleInputChange('years_of_experience', parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Professional Bio</label>
        <textarea
          value={formData.bio}
          onChange={(e) => handleInputChange('bio', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Tell patients about your experience, approach to care, and areas of expertise..."
          maxLength={2000}
        />
        <p className="text-sm text-gray-500 mt-1">{formData.bio.length}/2000 characters</p>
      </div>
    </div>
  );

  const renderPracticeInfo = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Briefcase className="text-2xl text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Practice Information</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Practice/Clinic Name</label>
        <input
          type="text"
          value={formData.practice_name}
          onChange={(e) => handleInputChange('practice_name', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Search Practice Address</label>
        <AddressAutocomplete
          placeholder="Start typing to search address..."
          onSelect={(addr: ParsedAddress) => {
            setFormData((prev: any) => ({
              ...prev,
              practice_address_line1: addr.addressLine1 || prev.practice_address_line1,
              practice_city: addr.city || prev.practice_city,
              practice_province: provinceNameToCode(addr.province) || prev.practice_province,
              practice_postal_code: addr.postalCode || prev.practice_postal_code,
            }));
          }}
        />
        <p className="text-xs text-gray-500 mt-1">Pick a suggestion to auto-fill the fields below.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Practice Address</label>
        <input
          type="text"
          value={formData.practice_address_line1}
          onChange={(e) => handleInputChange('practice_address_line1', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Street address"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
          <input
            type="text"
            value={formData.practice_city}
            onChange={(e) => handleInputChange('practice_city', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
          <select
            value={formData.practice_province}
            onChange={(e) => handleInputChange('practice_province', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select</option>
            {PROVINCES.map(province => (
              <option key={province.code} value={province.code}>{province.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
          <input
            type="text"
            value={formData.practice_postal_code}
            onChange={(e) => handleInputChange('practice_postal_code', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="A1A 1A1"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Practice Phone</label>
        <input
          type="tel"
          value={formData.practice_phone}
          onChange={(e) => handleInputChange('practice_phone', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="(555) 123-4567"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="accepts_new_patients"
          checked={formData.accepts_new_patients}
          onChange={(e) => handleInputChange('accepts_new_patients', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="accepts_new_patients" className="text-sm font-medium text-gray-700">
          Currently accepting new patients
        </label>
      </div>
    </div>
  );

  const renderDocumentUpload = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Upload className="text-2xl text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Document Upload</h2>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          Please upload clear, legible copies of your credentials. All required documents must be uploaded before submission.
          Documents marked with * are required.
        </p>
      </div>

      <div className="space-y-4">
        {DOCUMENT_TYPES.map(docType => (
          <div key={docType.value} className="border border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {docType.label} {docType.required && <span className="text-red-500">*</span>}
              </label>
              {uploadedDocs.has(docType.value) && (
                <CheckCircle className="text-green-500" />
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                onChange={(e) => handleFileChange(docType.value, e.target.files?.[0] || null)}
                className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <button
                onClick={() => handleUploadDocument(docType.value)}
                disabled={!documents[docType.value] || uploadedDocs.has(docType.value) || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Upload
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Provider Registration</h1>
            <p className="text-gray-600">Complete your registration to join the DoktoChain network</p>
          </div>

          {renderStepIndicator()}

          <div className="min-h-[500px]">
            {step === 1 && renderPersonalInfo()}
            {step === 2 && renderProfessionalInfo()}
            {step === 3 && renderPracticeInfo()}
            {step === 4 && renderDocumentUpload()}
          </div>

          <div className="flex justify-between mt-8 pt-6 border-t">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={loading}
                className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {loading ? 'Saving...' : 'Next'}
              </button>
            ) : (
              <div className="ml-auto flex items-center gap-6">
                <TermsCheckbox accepted={termsAccepted} onChange={setTermsAccepted} />
                <button
                  onClick={handleSubmit}
                  disabled={loading || !termsAccepted}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
