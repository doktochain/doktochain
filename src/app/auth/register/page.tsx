import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import LocalizedLink from '../../../components/LocalizedLink';
import { useAuth } from '../../../contexts/AuthContext';
import { authService } from '../../../services/authService';
import { SubscriptionService, type SubscriptionPlan } from '../../../services/subscriptionService';
import { Eye, EyeOff, Mail, User, Building2, Stethoscope, Heart, ArrowLeft, ArrowRight, Loader2, Shield } from 'lucide-react';
import SpecialtySearchSelect from '../../../components/auth/SpecialtySearchSelect';
import PlanSelector from '../../../components/auth/PlanSelector';
import TermsCheckbox, { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '../../../components/auth/TermsCheckbox';

type RoleTab = 'patient' | 'provider' | 'pharmacy' | 'clinic';

const tabColors: Record<string, { active: string; ring: string }> = {
  teal: { active: 'border-teal-600 text-teal-600', ring: 'focus-visible:outline-teal-600' },
  sky: { active: 'border-sky-600 text-sky-600', ring: 'focus-visible:outline-sky-600' },
  emerald: { active: 'border-emerald-600 text-emerald-600', ring: 'focus-visible:outline-emerald-600' },
};

const btnColors: Record<string, string> = {
  teal: 'bg-teal-600 hover:bg-teal-700',
  sky: 'bg-sky-600 hover:bg-sky-700',
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
};

const needsPlanSelection = (role: RoleTab) => role !== 'patient';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { t } = useTranslation('auth');

  const roleConfig: Record<RoleTab, { label: string; icon: typeof Heart; color: string; description: string }> = {
    patient: {
      label: t('register.rolePatient'),
      icon: Heart,
      color: 'teal',
      description: t('register.patientDesc'),
    },
    provider: {
      label: t('register.roleProvider'),
      icon: Stethoscope,
      color: 'sky',
      description: t('register.providerDesc'),
    },
    pharmacy: {
      label: t('register.rolePharmacy'),
      icon: Building2,
      color: 'emerald',
      description: t('register.pharmacyDesc'),
    },
    clinic: {
      label: t('register.roleClinic'),
      icon: Building2,
      color: 'emerald',
      description: t('register.clinicDesc'),
    },
  };

  const initialRole = (searchParams.get('role') as RoleTab) || 'patient';
  const initialPlanKey = searchParams.get('plan') || '';
  const initialBilling = (searchParams.get('billing') as 'monthly' | 'annual') || 'monthly';
  const promoCode = searchParams.get('promo') || '';

  const [activeRole, setActiveRole] = useState<RoleTab>(
    Object.keys(roleConfig).includes(initialRole) ? initialRole : 'patient'
  );

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [specialtyName, setSpecialtyName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(initialBilling);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    setStep(1);
    setError('');
    setSelectedPlan(null);
  }, [activeRole]);

  const config = roleConfig[activeRole];
  const colorKey = config.color;
  const colors = tabColors[colorKey];
  const btnColor = btnColors[colorKey];

  const needsSpecialty = activeRole === 'provider';
  const needsBusinessName = activeRole === 'pharmacy' || activeRole === 'clinic';
  const showPlanStep = needsPlanSelection(activeRole);

  const totalSteps = showPlanStep ? (needsSpecialty ? 3 : 2) : 1;

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!termsAccepted) {
      setError(t('register.termsRequired'));
      return;
    }

    if (needsSpecialty) {
      setStep(2);
    } else if (showPlanStep) {
      setStep(2);
    } else {
      handleRegister();
    }
  };

  const handleStep2Submit = () => {
    setError('');
    if (needsSpecialty && showPlanStep) {
      setStep(3);
    } else {
      handleRegister();
    }
  };

  const handlePlanSelect = (plan: SubscriptionPlan, billing: 'monthly' | 'annual') => {
    setSelectedPlan(plan);
    setBillingCycle(billing);
  };

  const handleRegister = async () => {
    setError('');
    setLoading(true);

    const now = new Date().toISOString();
    try {
      const userData: Record<string, string> = {
        first_name: firstName,
        last_name: lastName,
        terms_accepted_at: now,
        privacy_accepted_at: now,
        terms_version: CURRENT_TERMS_VERSION,
        privacy_version: CURRENT_PRIVACY_VERSION,
      };

      const newUser = await signUp(email, password, userData, activeRole);

      if (newUser) {
        await authService.finalizeRegistration(newUser.id, activeRole, {
          businessName: needsBusinessName ? businessName : undefined,
          specialtyId: activeRole === 'provider' ? specialtyId : undefined,
          specialtyName: activeRole === 'provider' ? specialtyName : undefined,
        });

        if (showPlanStep && selectedPlan) {
          if (selectedPlan.is_free) {
            await SubscriptionService.createSubscription({
              subscriber_id: newUser.id,
              subscriber_type: activeRole as 'provider' | 'clinic' | 'pharmacy',
              plan_id: selectedPlan.id,
              billing_interval: billingCycle,
              notes: promoCode ? `promo:${promoCode}` : undefined,
            });
          } else {
            await SubscriptionService.createSubscription({
              subscriber_id: newUser.id,
              subscriber_type: activeRole as 'provider' | 'clinic' | 'pharmacy',
              plan_id: selectedPlan.id,
              billing_interval: billingCycle,
              trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              notes: promoCode ? `promo:${promoCode}` : undefined,
            });
          }
        }
      }

      const redirectMap: Record<RoleTab, string> = {
        patient: '/dashboard/patient/dashboard',
        provider: '/dashboard/provider/dashboard',
        pharmacy: '/dashboard/pharmacy/dashboard',
        clinic: '/dashboard/clinic/dashboard',
      };
      navigate(redirectMap[activeRole], { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('register.registrationFailed');
      if (message.includes('already registered')) {
        setError(t('register.accountExistsError'));
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const roles: RoleTab[] = ['patient', 'provider', 'pharmacy', 'clinic'];

  const renderStepIndicator = () => {
    if (totalSteps <= 1) return null;
    const labels = needsSpecialty && showPlanStep
      ? [t('register.stepAccount'), t('register.stepSpecialty'), t('register.stepPlan')]
      : needsSpecialty
        ? [t('register.stepAccount'), t('register.stepSpecialty')]
        : [t('register.stepAccount'), t('register.stepPlan')];

    return (
      <div className="flex items-center justify-center gap-1 mb-5">
        {labels.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-1">
              {idx > 0 && <div className={`w-6 h-px ${isDone ? 'bg-blue-400' : 'bg-gray-200'}`} />}
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {isDone ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : stepNum}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPlanStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setStep(step - 1)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold text-gray-700">
          {needsSpecialty ? t('register.step3Plan') : t('register.step2Plan')}
        </h3>
      </div>

      <PlanSelector
        role={activeRole}
        initialPlanKey={initialPlanKey}
        initialBilling={initialBilling}
        promoCode={promoCode}
        onSelect={handlePlanSelect}
      />

      <button
        onClick={handleRegister}
        disabled={loading || !selectedPlan}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm ${btnColor} disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('register.creatingAccount')}
          </>
        ) : selectedPlan?.is_free ? (
          t('register.createAccount')
        ) : (
          t('register.startTrial')
        )}
      </button>

      {selectedPlan && !selectedPlan.is_free && (
        <p className="text-xs text-center text-gray-400">
          {t('register.trialNotCharged')}
          {billingCycle === 'annual' && selectedPlan.annual_price_cad
            ? ` ${t('register.afterTrialAnnual', { price: SubscriptionService.formatPrice(selectedPlan.annual_price_cad) })}`
            : ` ${t('register.afterTrialMonthly', { price: SubscriptionService.formatPrice(selectedPlan.monthly_price_cad) })}`}
        </p>
      )}
    </div>
  );

  const isPlanStep = showPlanStep && (
    (needsSpecialty && step === 3) ||
    (!needsSpecialty && step === 2)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-4 lg:p-6">
        <LocalizedLink
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('register.backToHome')}
        </LocalizedLink>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-4 sm:py-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <LocalizedLink to="/" className="inline-block mb-6">
              <img src="/image/doktochain_logo.png" alt="Doktochain" className="h-8 mx-auto" />
            </LocalizedLink>
            <h1 className="text-2xl font-bold text-gray-900">{t('register.createTitle')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('register.chooseRole')}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">
            <div className="flex border-b border-gray-200">
              {roles.map((role) => {
                const rc = roleConfig[role];
                const tc = tabColors[rc.color];
                const Icon = rc.icon;
                const isActive = activeRole === role;

                return (
                  <button
                    key={role}
                    onClick={() => setActiveRole(role)}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium border-b-2 transition-colors ${
                      isActive
                        ? tc.active
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {rc.label}
                  </button>
                );
              })}
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">{config.description}</p>

              {renderStepIndicator()}

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {isPlanStep ? renderPlanStep() : step === 1 ? (
                <form onSubmit={handleStep1Submit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('register.firstName')}
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          id="firstName"
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                          placeholder="John"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('register.lastName')}
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  {needsBusinessName && (
                    <div>
                      <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                        {activeRole === 'pharmacy' ? t('register.pharmacyName') : t('register.clinicName')}
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Building2 className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          id="businessName"
                          type="text"
                          required
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                          placeholder={activeRole === 'pharmacy' ? t('register.pharmacyPlaceholder') : t('register.clinicPlaceholder')}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="regEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('register.emailAddress')}
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        id="regEmail"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="regPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('register.password')}
                    </label>
                    <div className="relative">
                      <input
                        id="regPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                        placeholder={t('register.minChars')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <TermsCheckbox accepted={termsAccepted} onChange={setTermsAccepted} />

                  <button
                    type="submit"
                    disabled={loading || !termsAccepted}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm ${btnColor} disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('register.creatingAccount')}
                      </>
                    ) : totalSteps > 1 ? (
                      <>
                        {t('register.continue')}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      t('register.createAccount')
                    )}
                  </button>
                </form>
              ) : step === 2 && needsSpecialty ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => setStep(1)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h3 className="text-sm font-semibold text-gray-700">{t('register.step2Specialty')}</h3>
                  </div>

                  <SpecialtySearchSelect
                    value={specialtyId}
                    onChange={(id, name) => {
                      setSpecialtyId(id);
                      setSpecialtyName(name);
                    }}
                  />

                  <p className="text-xs text-gray-400">
                    {t('register.addMoreSpecialties')}
                  </p>

                  <button
                    onClick={handleStep2Submit}
                    disabled={loading}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm ${btnColor} disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('register.creatingAccount')}
                      </>
                    ) : showPlanStep ? (
                      <>
                        {t('register.continueToPlan')}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      t('register.createProviderAccount')
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('register.hasAccount')}{' '}
            <LocalizedLink to="/login" className="font-semibold text-teal-600 hover:text-teal-700">
              {t('register.signIn')}
            </LocalizedLink>
          </p>

          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5" />
            <span>{t('register.pipedaProtected')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
