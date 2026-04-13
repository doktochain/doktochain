import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Dashboard() {
  const { user, profile, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/', { replace: true });
      return;
    }

    if (redirected) return;

    const currentProfile = userProfile || profile;

    if (currentProfile?.role) {
      setRedirected(true);

      const roleRoutes: Record<string, string> = {
        'admin': '/dashboard/admin/dashboard',
        'provider': '/dashboard/provider/dashboard',
        'pharmacy': '/dashboard/pharmacy/dashboard',
        'clinic': '/dashboard/clinic/dashboard',
        'patient': '/dashboard/patient/dashboard'
      };

      const targetRoute = roleRoutes[currentProfile.role] || '/dashboard/patient/dashboard';
      navigate(targetRoute, { replace: true });
    }
  }, [userProfile, profile, navigate, authLoading, user, redirected]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-800 font-semibold text-lg">Loading your dashboard...</p>
      </div>
    </div>
  );
}
