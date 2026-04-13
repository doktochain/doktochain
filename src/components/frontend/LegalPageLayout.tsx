import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import LocalizedLink from '../LocalizedLink';
import Footer from './Footer';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  const { t } = useTranslation('legal');

  const legalNav = [
    { label: t('sidebar.privacy'), href: '/legal/privacy-policy' },
    { label: t('sidebar.terms'), href: '/legal/terms-of-service' },
    { label: t('sidebar.cookies'), href: '/legal/cookie-policy' },
    { label: t('sidebar.hipaa'), href: '/legal/hipaa-compliance' },
    { label: t('sidebar.security'), href: '/legal/security-whitepaper' },
    { label: t('sidebar.accessibility'), href: '/legal/accessibility' },
    { label: t('sidebar.refund'), href: '/legal/refund-policy' },
  ];

  return (
    <div className="min-h-screen bg-white pt-24">
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <LocalizedLink to="/" className="hover:text-gray-700 transition-colors">{t('home')}</LocalizedLink>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-900 font-medium">{title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          <aside className="hidden lg:block lg:col-span-3">
            <nav className="sticky top-24 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('sidebarLabel')}</p>
              {legalNav.map((item) => (
                <LocalizedLink
                  key={item.href}
                  to={item.href}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    title === item.label
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </LocalizedLink>
              ))}
            </nav>
          </aside>

          <main className="lg:col-span-9">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{title}</h1>
              <p className="text-sm text-gray-500">{t('lastUpdated', { date: lastUpdated })}</p>
            </div>

            <div className="legal-content space-y-6 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:text-gray-900 [&>h2]:mt-10 [&>h2]:mb-4 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-gray-900 [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:text-gray-600 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&>ul]:text-gray-600 [&_li]:leading-relaxed [&_strong]:text-gray-900 [&_strong]:font-semibold [&_a]:text-blue-600 [&_a:hover]:underline">
              {children}
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
