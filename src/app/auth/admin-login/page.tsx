import { useTranslation } from 'react-i18next';
import AuthPageLayout from '../../../components/auth/AuthPageLayout';
import LoginFormFields from '../../../components/auth/LoginFormFields';
import { ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const { t } = useTranslation('auth');

  return (
    <AuthPageLayout
      title={t('login.adminTitle')}
      subtitle={t('login.adminSubtitle')}
      accentColor="slate"
    >
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-slate-100">
            <ShieldCheck className="w-5 h-5 text-slate-700" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('login.adminFormTitle')}</h2>
        </div>
        <p className="text-sm text-gray-500">{t('login.adminFormSubtitle')}</p>
      </div>

      <LoginFormFields
        allowedRoles={['admin', 'staff']}
        redirectPath="/dashboard/admin/dashboard"
        roleMismatchLinks={{
          patient: { label: t('login.roleMismatchPatient'), path: '/login' },
          provider: { label: t('login.roleMismatchProvider'), path: '/provider/login' },
          pharmacy: { label: t('login.roleMismatchBusiness'), path: '/portal/login' },
          clinic: { label: t('login.roleMismatchBusiness'), path: '/portal/login' },
        }}
        accentColor="slate"
        registerPath=""
        registerLabel=""
      />
    </AuthPageLayout>
  );
}
