import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import LocalizedLink from '../LocalizedLink';
import { ArrowLeft, Shield } from 'lucide-react';

const colorMap = {
  teal: {
    gradient: 'from-teal-600 via-teal-700 to-teal-800',
    accent: 'text-teal-200',
    badge: 'bg-teal-500/20 text-teal-200',
  },
  sky: {
    gradient: 'from-sky-600 via-sky-700 to-sky-800',
    accent: 'text-sky-200',
    badge: 'bg-sky-500/20 text-sky-200',
  },
  slate: {
    gradient: 'from-slate-700 via-slate-800 to-slate-900',
    accent: 'text-slate-300',
    badge: 'bg-slate-500/20 text-slate-300',
  },
  emerald: {
    gradient: 'from-emerald-600 via-emerald-700 to-emerald-800',
    accent: 'text-emerald-200',
    badge: 'bg-emerald-500/20 text-emerald-200',
  },
};

interface AuthPageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  accentColor: 'teal' | 'sky' | 'slate' | 'emerald';
  showBackToHome?: boolean;
}

export default function AuthPageLayout({
  children,
  title,
  subtitle,
  accentColor,
  showBackToHome = true,
}: AuthPageLayoutProps) {
  const { t } = useTranslation('auth');
  const colors = colorMap[accentColor];

  return (
    <div className="min-h-screen flex">
      <div className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br ${colors.gradient} relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-white/50 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          <LocalizedLink to="/" className="mb-12">
            <img
              src="/image/doktochain_logo.png"
              alt="Doktochain"
              className="h-8 w-auto"
            />
          </LocalizedLink>

          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
            {title}
          </h1>
          <p className={`text-lg ${colors.accent} max-w-md leading-relaxed`}>
            {subtitle}
          </p>

          <div className="mt-12 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colors.badge}`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">{t('login.pipedaCompliant')}</p>
              <p className={`text-xs ${colors.accent}`}>{t('login.dataEncrypted')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col">
        {showBackToHome && (
          <div className="p-4 lg:p-6">
            <LocalizedLink
              to="/"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('login.backToHome')}
            </LocalizedLink>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-12">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
