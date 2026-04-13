import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: ('patient' | 'provider' | 'admin' | 'pharmacy' | 'clinic' | 'staff')[];
  redirectTo?: string;
}

function getLoginRoute(pathname: string, lang: string): string {
  const stripped = pathname.replace(/^\/(en|fr)/, '');
  if (stripped.startsWith('/dashboard/patient')) return `/${lang}/login`;
  if (stripped.startsWith('/dashboard/provider')) return `/${lang}/provider/login`;
  if (stripped.startsWith('/dashboard/pharmacy')) return `/${lang}/portal/login`;
  if (stripped.startsWith('/dashboard/clinic')) return `/${lang}/portal/login`;
  if (stripped.startsWith('/dashboard/admin')) return `/${lang}/platform-admin/login`;
  return `/${lang}/login`;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'en';

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const loginRoute = getLoginRoute(location.pathname, currentLang);
      navigate(loginRoute, { replace: true, state: { from: location.pathname } });
      return;
    }

    if (!userProfile?.role) {
      return;
    }

    if (!allowedRoles.includes(userProfile.role)) {
      if (redirectTo) {
        navigate(`/${currentLang}${redirectTo}`, { replace: true });
      } else {
        const defaultRedirects: Record<string, string> = {
          admin: `/${currentLang}/dashboard/admin/dashboard`,
          provider: `/${currentLang}/dashboard/provider/dashboard`,
          pharmacy: `/${currentLang}/dashboard/pharmacy/dashboard`,
          patient: `/${currentLang}/dashboard/patient/dashboard`,
          clinic: `/${currentLang}/dashboard/clinic/dashboard`,
          staff: `/${currentLang}/dashboard/admin/dashboard`,
        };
        const target = defaultRedirects[userProfile.role] || `/${currentLang}/dashboard/patient/dashboard`;
        navigate(target, { replace: true });
      }
    }
  }, [user, userProfile, loading, allowedRoles, navigate, redirectTo, location.pathname, currentLang]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-800 font-semibold">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!userProfile?.role) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <p className="text-gray-800 font-semibold text-lg">Loading profile...</p>
          <p className="mt-2 text-sm text-gray-600">Please wait while we load your account information.</p>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(userProfile.role)) {
    return null;
  }

  return <>{children}</>;
}
