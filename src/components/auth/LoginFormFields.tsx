import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LocalizedLink from '../LocalizedLink';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Mail, Loader2 } from 'lucide-react';

const buttonColorMap: Record<string, string> = {
  teal: 'bg-teal-600 hover:bg-teal-700 focus-visible:outline-teal-600',
  sky: 'bg-sky-600 hover:bg-sky-700 focus-visible:outline-sky-600',
  slate: 'bg-slate-700 hover:bg-slate-800 focus-visible:outline-slate-700',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-emerald-600',
};

const linkColorMap: Record<string, string> = {
  teal: 'text-teal-600 hover:text-teal-700',
  sky: 'text-sky-600 hover:text-sky-700',
  slate: 'text-slate-600 hover:text-slate-700',
  emerald: 'text-emerald-600 hover:text-emerald-700',
};

interface LoginFormFieldsProps {
  allowedRoles: string[];
  redirectPath: string;
  roleMismatchLinks: Record<string, { label: string; path: string }>;
  accentColor: string;
  registerPath?: string;
  registerLabel?: string;
}

export default function LoginFormFields({
  allowedRoles,
  redirectPath,
  roleMismatchLinks,
  accentColor,
  registerPath = '/register',
  registerLabel = 'Create an account',
}: LoginFormFieldsProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [roleMismatch, setRoleMismatch] = useState<{ role: string; link: { label: string; path: string } } | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn, signOut, userProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  const buttonColors = buttonColorMap[accentColor] || buttonColorMap.teal;
  const linkColors = linkColorMap[accentColor] || linkColorMap.teal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRoleMismatch(null);
    setLoading(true);

    try {
      await signIn(email, password);

      let userRole: string | undefined;

      if (import.meta.env.VITE_API_URL) {
        // AWS: fetch role from /auth/me
        const { api } = await import('../../lib/api-client');
        const { data: profileData } = await api.get<{ role: string }>('/auth/me');
        userRole = profileData?.role;
      } else {
        // Supabase: fetch role directly
        const { supabase } = await import('../../lib/supabase');
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('email', email)
          .maybeSingle();
        userRole = profileData?.role;
      }

      userRole = userRole || userProfile?.role;

      if (userRole && !allowedRoles.includes(userRole)) {
        const mismatchLink = roleMismatchLinks[userRole];
        if (mismatchLink) {
          setRoleMismatch({ role: userRole, link: mismatchLink });
        } else {
          setError(t('login.noAccessError'));
        }
        await signOut();
        setLoading(false);
        return;
      }

      navigate(redirectPath, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      if (message.includes('Invalid login credentials')) {
        setError(t('login.invalidCredError'));
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {roleMismatch && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-800 mb-2" dangerouslySetInnerHTML={{ __html: t('login.registeredAs', { role: roleMismatch.role }) }} />
          <LocalizedLink
            to={roleMismatch.link.path}
            className={`text-sm font-medium ${linkColors} underline`}
          >
            {t('login.goTo', { label: roleMismatch.link.label })}
          </LocalizedLink>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
          {t('login.emailLabel')}
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Mail className="h-4 w-4 text-gray-400" />
          </div>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200 text-sm transition-colors"
            placeholder={t('login.emailPlaceholder')}
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
          {t('login.passwordLabel')}
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200 text-sm transition-colors"
            placeholder={t('login.passwordPlaceholder')}
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

      <button
        type="submit"
        disabled={loading}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm ${buttonColors} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('login.signingIn')}
          </>
        ) : (
          t('login.signIn')
        )}
      </button>

      {registerPath && (
        <p className="text-center text-sm text-gray-500 mt-6">
          {t('login.noAccount')}{' '}
          <LocalizedLink to={registerPath} className={`font-semibold ${linkColors}`}>
            {registerLabel}
          </LocalizedLink>
        </p>
      )}
    </form>
  );
}
