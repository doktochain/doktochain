import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Check, Stethoscope, User, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import TermsCheckbox, { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from './TermsCheckbox';

interface NewRegistrationFlowProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

type RegistrationStep = 'role' | 'credentials' | 'specialty';

export default function NewRegistrationFlow({ onClose, onSwitchToLogin }: NewRegistrationFlowProps) {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [step, setStep] = useState<RegistrationStep>('role');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    loadSpecialties();
  }, []);

  const loadSpecialties = async () => {
    try {
      const { data } = await supabase
        .from('specialties_master')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      setSpecialties(data || []);
    } catch (err) {
      console.error('Error loading specialties:', err);
    }
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    if (role === 'provider') {
      setStep('specialty');
    } else {
      setStep('credentials');
    }
  };

  const handleSpecialtyNext = () => {
    if (!selectedSpecialty) {
      setError('Please select a specialty');
      return;
    }
    setError('');
    setStep('credentials');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);

    const now = new Date().toISOString();
    try {
      await signUp(
        formData.email,
        formData.password,
        {
          first_name: formData.firstName,
          last_name: formData.lastName,
          terms_accepted_at: now,
          privacy_accepted_at: now,
          terms_version: CURRENT_TERMS_VERSION,
          privacy_version: CURRENT_PRIVACY_VERSION,
        },
        selectedRole
      );

      if (selectedRole === 'provider' && selectedSpecialty) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const specialty = specialties.find(s => s.id === selectedSpecialty);
          await supabase
            .from('providers')
            .update({ specialty: specialty?.name || '' })
            .eq('user_id', user.id);
        }
      }

      onClose();

      await new Promise(resolve => setTimeout(resolve, 200));

      const roleRoutes: Record<string, string> = {
        patient: '/dashboard/patient/dashboard',
        provider: '/dashboard/provider/dashboard',
        pharmacy: '/dashboard/pharmacy/dashboard',
      };

      navigate(roleRoutes[selectedRole] || '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = step === 'role' ? 0 : step === 'specialty' ? 1 : 2;
  const totalSteps = selectedRole === 'provider' ? 3 : 2;

  const roles = [
    {
      value: 'patient',
      label: 'Patient',
      description: 'Book appointments, manage health records, and connect with providers',
      icon: <User className="text-teal-600 text-xl group-hover:text-white" />,
      bgColor: 'bg-teal-100 group-hover:bg-teal-500',
      hoverBorder: 'hover:border-teal-500 hover:bg-teal-50',
    },
    {
      value: 'provider',
      label: 'Healthcare Provider',
      description: 'Manage schedule, conduct consultations, and write prescriptions',
      icon: <Stethoscope className="text-sky-600 text-xl group-hover:text-white" />,
      bgColor: 'bg-sky-100 group-hover:bg-sky-500',
      hoverBorder: 'hover:border-sky-500 hover:bg-sky-50',
    },
    {
      value: 'pharmacy',
      label: 'Pharmacy',
      description: 'Receive prescriptions, manage inventory, and fulfill orders',
      icon: <Building2 className="text-emerald-600 text-xl group-hover:text-white" />,
      bgColor: 'bg-emerald-100 group-hover:bg-emerald-500',
      hoverBorder: 'hover:border-emerald-500 hover:bg-emerald-50',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X size={28} />
        </button>

        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-8 py-6">
          <h2 className="text-2xl font-bold text-white mb-4">Create Account</h2>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  stepIndex >= index ? 'bg-white' : 'bg-slate-500'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-8">
          {step === 'role' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">
                I want to join as a...
              </h3>

              {roles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => handleRoleSelect(role.value)}
                  className={`w-full flex items-center gap-4 p-5 border-2 border-gray-200 rounded-xl ${role.hoverBorder} transition group`}
                >
                  <div className={`${role.bgColor} p-3 rounded-full transition`}>
                    {role.icon}
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-800">{role.label}</p>
                    <p className="text-sm text-gray-500">{role.description}</p>
                  </div>
                  <ArrowRight className="text-gray-400 group-hover:text-gray-600" />
                </button>
              ))}
            </div>
          )}

          {step === 'specialty' && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <div className="bg-sky-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Stethoscope className="text-sky-600 text-xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Primary Specialty</h3>
                <p className="text-sm text-gray-500">Select your primary area of practice</p>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {specialties.map((specialty) => (
                  <button
                    key={specialty.id}
                    onClick={() => { setSelectedSpecialty(specialty.id); setError(''); }}
                    className={`w-full p-3 border-2 rounded-lg text-left transition ${
                      selectedSpecialty === specialty.id
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 hover:border-sky-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedSpecialty === specialty.id
                            ? 'border-sky-500 bg-sky-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedSpecialty === specialty.id && (
                          <Check className="text-white text-xs" />
                        )}
                      </div>
                      <p className="font-medium text-gray-800">{specialty.name}</p>
                    </div>
                  </button>
                ))}
                {specialties.length === 0 && (
                  <p className="text-center py-4 text-gray-500">Loading specialties...</p>
                )}
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('role'); setError(''); }}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={handleSpecialtyNext}
                  className="flex-1 bg-slate-800 text-white py-3 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 'credentials' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Account Details
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Signing up as <span className="font-medium text-gray-700 capitalize">{selectedRole}</span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Re-enter password"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
              )}

              <TermsCheckbox accepted={termsAccepted} onChange={setTermsAccepted} />

              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className="w-full bg-slate-800 text-white py-3 rounded-lg hover:bg-slate-700 font-semibold disabled:opacity-50 transition-all"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep(selectedRole === 'provider' ? 'specialty' : 'role');
                }}
                className="w-full text-gray-600 hover:text-gray-800 text-sm"
              >
                Back
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToLogin}
              className="text-slate-700 hover:text-slate-900 text-sm font-medium"
            >
              Already have an account? Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
