import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { patientService } from '../../services/patientService';
import { supabase } from '../../lib/supabase';
import { User, Heart, ShieldCheck, CheckCircle } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  icon: React.ReactNode;
}

export default function ProfileCompletionWizard({ onComplete }: { onComplete: () => void }) {
  const { user, updateProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<any>(null);

  const [basicInfo, setBasicInfo] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'Canada',
  });

  const [emergencyContact, setEmergencyContact] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
  });

  const [healthInfo, setHealthInfo] = useState({
    health_card_number: '',
    health_card_province: '',
    blood_type: '',
    height_cm: '',
    weight_kg: '',
  });

  const steps: Step[] = [
    { id: 1, title: 'Basic Info', icon: <User size={18} /> },
    { id: 2, title: 'Emergency Contact', icon: <ShieldCheck size={18} /> },
    { id: 3, title: 'Health Info', icon: <Heart size={18} /> },
  ];

  useEffect(() => {
    loadPatientData();
  }, [user]);

  const loadPatientData = async () => {
    if (!user) return;
    try {
      const patientData = await patientService.getPatientByUserId(user.id);
      if (patientData) {
        setPatient(patientData);
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setBasicInfo({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          date_of_birth: profile.date_of_birth || '',
          gender: profile.gender || '',
          phone: profile.phone || '',
          address_line1: profile.address_line1 || '',
          address_line2: profile.address_line2 || '',
          city: profile.city || '',
          province: profile.province || '',
          postal_code: profile.postal_code || '',
          country: profile.country || 'Canada',
        });
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
    }
  };

  const handleBasicInfoSubmit = async () => {
    if (!user) return;
    if (!basicInfo.first_name || !basicInfo.last_name || !basicInfo.date_of_birth) {
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        first_name: basicInfo.first_name,
        last_name: basicInfo.last_name,
        date_of_birth: basicInfo.date_of_birth as any,
        gender: basicInfo.gender as any,
        phone: basicInfo.phone as any,
        address_line1: basicInfo.address_line1 as any,
        address_line2: basicInfo.address_line2 as any,
        city: basicInfo.city as any,
        province: basicInfo.province as any,
        postal_code: basicInfo.postal_code as any,
        country: basicInfo.country as any,
      });

      if (!patient) {
        const existingPatient = await patientService.getPatientByUserId(user.id);
        if (existingPatient) {
          setPatient(existingPatient);
        } else {
          const newPatient = await patientService.createPatient({ user_id: user.id });
          setPatient(newPatient);
        }
      }

      setCurrentStep(2);
    } catch (error) {
      console.error('Error saving basic info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyContactSubmit = async () => {
    if (!user) return;
    const patientId = patient?.id;
    if (!patientId) {
      setCurrentStep(3);
      return;
    }

    if (!emergencyContact.name || !emergencyContact.phone) {
      setCurrentStep(3);
      return;
    }

    setLoading(true);
    try {
      await patientService.addEmergencyContact(patientId, emergencyContact);
      setCurrentStep(3);
    } catch (error) {
      console.error('Error saving emergency contact:', error);
      setCurrentStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handleHealthInfoSubmit = async () => {
    if (!patient) {
      onComplete();
      return;
    }

    setLoading(true);
    try {
      const updates: any = { profile_completed: true };
      if (healthInfo.health_card_number) updates.health_card_number = healthInfo.health_card_number;
      if (healthInfo.health_card_province) updates.health_card_province = healthInfo.health_card_province;
      if (healthInfo.blood_type) updates.blood_type = healthInfo.blood_type;
      if (healthInfo.height_cm) updates.height_cm = Number(healthInfo.height_cm);
      if (healthInfo.weight_kg) updates.weight_kg = Number(healthInfo.weight_kg);

      await patientService.updatePatient(patient.id, updates);

      await new Promise(resolve => setTimeout(resolve, 200));

      onComplete();
    } catch (error: any) {
      console.error('Error saving health info:', error);
      const errorMessage = error?.message || 'Failed to save profile. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!patient) {
      onComplete();
      return;
    }

    setLoading(true);
    try {
      await patientService.updatePatient(patient.id, { profile_completed: true });

      await new Promise(resolve => setTimeout(resolve, 200));

      onComplete();
    } catch (error: any) {
      console.error('Error skipping profile:', error);
      const errorMessage = error?.message || 'Failed to skip profile. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = (currentStep / steps.length) * 100;

  const provinces = [
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

  const inputClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white">Complete Your Profile</h2>
            <button
              onClick={handleSkip}
              disabled={loading}
              className="text-slate-300 hover:text-white text-sm font-medium disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
          <p className="text-slate-300 text-sm mb-4">
            Help us personalize your experience
          </p>

          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${
                      currentStep > step.id
                        ? 'bg-teal-400 text-white'
                        : currentStep === step.id
                        ? 'bg-white text-slate-800'
                        : 'bg-slate-600 text-slate-400'
                    }`}
                  >
                    {currentStep > step.id ? <CheckCircle size={18} /> : step.icon}
                  </div>
                  <span className={`text-xs mt-1 ${currentStep >= step.id ? 'text-white' : 'text-slate-400'}`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 mt-[-12px] ${currentStep > step.id ? 'bg-teal-400' : 'bg-slate-600'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="w-full bg-slate-600 rounded-full h-1.5 mt-3">
            <div
              className="bg-teal-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="p-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input
                    type="text"
                    value={basicInfo.first_name}
                    onChange={(e) => setBasicInfo({ ...basicInfo, first_name: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input
                    type="text"
                    value={basicInfo.last_name}
                    onChange={(e) => setBasicInfo({ ...basicInfo, last_name: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Date of Birth *</label>
                  <input
                    type="date"
                    value={basicInfo.date_of_birth}
                    onChange={(e) => setBasicInfo({ ...basicInfo, date_of_birth: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Gender</label>
                  <select
                    value={basicInfo.gender}
                    onChange={(e) => setBasicInfo({ ...basicInfo, gender: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  type="tel"
                  value={basicInfo.phone}
                  onChange={(e) => setBasicInfo({ ...basicInfo, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Address</label>
                <input
                  type="text"
                  value={basicInfo.address_line1}
                  onChange={(e) => setBasicInfo({ ...basicInfo, address_line1: e.target.value })}
                  placeholder="Street address"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    value={basicInfo.city}
                    onChange={(e) => setBasicInfo({ ...basicInfo, city: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Province</label>
                  <select
                    value={basicInfo.province}
                    onChange={(e) => setBasicInfo({ ...basicInfo, province: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select</option>
                    {provinces.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Postal Code</label>
                  <input
                    type="text"
                    value={basicInfo.postal_code}
                    onChange={(e) => setBasicInfo({ ...basicInfo, postal_code: e.target.value.toUpperCase() })}
                    placeholder="A1A 1A1"
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                onClick={handleBasicInfoSubmit}
                disabled={loading || !basicInfo.first_name || !basicInfo.last_name || !basicInfo.date_of_birth}
                className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500 font-semibold transition-all"
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
              <p className="text-sm text-gray-500">Optional but recommended</p>

              <div>
                <label className={labelClass}>Contact Name</label>
                <input
                  type="text"
                  value={emergencyContact.name}
                  onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Relationship</label>
                <select
                  value={emergencyContact.relationship}
                  onChange={(e) => setEmergencyContact({ ...emergencyContact, relationship: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                  <option value="sibling">Sibling</option>
                  <option value="friend">Friend</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  type="tel"
                  value={emergencyContact.phone}
                  onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={emergencyContact.email}
                  onChange={(e) => setEmergencyContact({ ...emergencyContact, email: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={handleEmergencyContactSubmit}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 font-semibold transition-all"
                >
                  {loading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Health Information</h3>
              <p className="text-sm text-gray-500">Optional -- you can complete this later</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Health Card Number</label>
                  <input
                    type="text"
                    value={healthInfo.health_card_number}
                    onChange={(e) => setHealthInfo({ ...healthInfo, health_card_number: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Province</label>
                  <select
                    value={healthInfo.health_card_province}
                    onChange={(e) => setHealthInfo({ ...healthInfo, health_card_province: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select</option>
                    {provinces.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Blood Type</label>
                  <select
                    value={healthInfo.blood_type}
                    onChange={(e) => setHealthInfo({ ...healthInfo, blood_type: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Height (cm)</label>
                  <input
                    type="number"
                    value={healthInfo.height_cm}
                    onChange={(e) => setHealthInfo({ ...healthInfo, height_cm: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Weight (kg)</label>
                  <input
                    type="number"
                    value={healthInfo.weight_kg}
                    onChange={(e) => setHealthInfo({ ...healthInfo, weight_kg: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={handleHealthInfoSubmit}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 font-semibold transition-all"
                >
                  {loading ? 'Finishing...' : 'Complete Profile'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
