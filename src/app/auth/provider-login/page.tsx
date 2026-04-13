import { useTranslation } from 'react-i18next';
import AuthPageLayout from '../../../components/auth/AuthPageLayout';
import LoginFormFields from '../../../components/auth/LoginFormFields';
import { Stethoscope } from 'lucide-react';

export default function ProviderLoginPage() {
  const { t } = useTranslation('auth');

  return (
    <AuthPageLayout
      title={t('login.providerTitle')}
      subtitle={t('login.providerSubtitle')}
      accentColor="sky"
    >
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-sky-50">
            <Stethoscope className="w-5 h-5 text-sky-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('login.providerFormTitle')}</h2>
        </div>
        <p className="text-sm text-gray-500">{t('login.providerFormSubtitle')}</p>
      </div>

      <LoginFormFields
        allowedRoles={['provider']}
        redirectPath="/dashboard/provider/dashboard"
        roleMismatchLinks={{
          patient: { label: t('login.roleMismatchPatient'), path: '/login' },
          pharmacy: { label: t('login.roleMismatchBusiness'), path: '/portal/login' },
          clinic: { label: t('login.roleMismatchBusiness'), path: '/portal/login' },
          admin: { label: t('login.roleMismatchAdmin'), path: '/platform-admin/login' },
        }}
        accentColor="sky"
        registerPath="/register?role=provider"
        registerLabel={t('login.providerRegisterLabel')}
      />
    </AuthPageLayout>
  );
}
