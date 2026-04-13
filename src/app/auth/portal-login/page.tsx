import { useTranslation } from 'react-i18next';
import AuthPageLayout from '../../../components/auth/AuthPageLayout';
import LoginFormFields from '../../../components/auth/LoginFormFields';
import { Building2 } from 'lucide-react';

export default function BusinessPortalLoginPage() {
  const { t } = useTranslation('auth');

  return (
    <AuthPageLayout
      title={t('login.portalTitle')}
      subtitle={t('login.portalSubtitle')}
      accentColor="emerald"
    >
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-emerald-50">
            <Building2 className="w-5 h-5 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('login.portalFormTitle')}</h2>
        </div>
        <p className="text-sm text-gray-500">{t('login.portalFormSubtitle')}</p>
      </div>

      <LoginFormFields
        allowedRoles={['pharmacy', 'clinic']}
        redirectPath="/dashboard/pharmacy/dashboard"
        roleMismatchLinks={{
          patient: { label: t('login.roleMismatchPatient'), path: '/login' },
          provider: { label: t('login.roleMismatchProvider'), path: '/provider/login' },
          admin: { label: t('login.roleMismatchAdmin'), path: '/platform-admin/login' },
        }}
        accentColor="emerald"
        registerPath="/register?role=pharmacy"
        registerLabel={t('login.portalRegisterLabel')}
      />
    </AuthPageLayout>
  );
}
