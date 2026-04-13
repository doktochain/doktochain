import { useTranslation } from 'react-i18next';
import LocalizedLink from '../LocalizedLink';
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Phone, MapPin } from 'lucide-react';

const footerSections = [
  {
    titleKey: 'footer.forPatients',
    links: [
      { labelKey: 'footer.findDoctor', href: '/frontend/find-providers' },
      { labelKey: 'footer.bookAppointment', href: '/dashboard/patient/appointments/book' },
      { labelKey: 'footer.telemedicine', href: '/dashboard/patient/video-consultation' },
      { labelKey: 'footer.healthRecords', href: '/dashboard/patient/health-records' },
      { labelKey: 'footer.prescriptions', href: '/dashboard/patient/prescriptions' },
      { labelKey: 'footer.pharmacy', href: '/dashboard/patient/pharmacy' },
    ],
  },
  {
    titleKey: 'footer.forProviders',
    links: [
      { labelKey: 'footer.joinAsProvider', href: '/register?role=provider' },
      { labelKey: 'footer.providerLogin', href: '/provider/login' },
      { labelKey: 'footer.forBusiness', href: '/for-business' },
      { labelKey: 'footer.pricing', href: '/pricing' },
      { labelKey: 'footer.providerResources', href: '/frontend/help' },
    ],
  },
  {
    titleKey: 'footer.company',
    links: [
      { labelKey: 'footer.aboutUs', href: '/frontend/about' },
      { labelKey: 'footer.helpCenter', href: '/frontend/help' },
      { labelKey: 'footer.contactUs', href: '/frontend/help' },
      { labelKey: 'footer.findProviders', href: '/frontend/find-providers' },
    ],
  },
  {
    titleKey: 'footer.legal',
    links: [
      { labelKey: 'footer.privacyPolicy', href: '/legal/privacy-policy' },
      { labelKey: 'footer.termsOfService', href: '/legal/terms-of-service' },
      { labelKey: 'footer.cookiePolicy', href: '/legal/cookie-policy' },
      { labelKey: 'footer.hipaaCompliance', href: '/legal/hipaa-compliance' },
      { labelKey: 'footer.accessibility', href: '/legal/accessibility' },
      { labelKey: 'footer.refundPolicy', href: '/legal/refund-policy' },
    ],
  },
];

const provinces = [
  'Ontario', 'British Columbia', 'Alberta', 'Quebec', 'Manitoba',
  'Saskatchewan', 'Nova Scotia', 'New Brunswick', 'Newfoundland', 'PEI'
];

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation('frontend');

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          <div className="lg:col-span-2">
            <LocalizedLink to="/" className="inline-block mb-6">
              <img
                src="/image/doktochain_logo.png"
                alt="Doktochain"
                className="h-8 w-auto"
              />
            </LocalizedLink>
            <p className="text-gray-400 mb-6 leading-relaxed">
              {t('footer.description')}
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-blue-400" />
                <span>1-800-DOKTO-CHAIN</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-blue-400" />
                <span>support@doktochain.ca</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-blue-400" />
                <span>Toronto, ON, Canada</span>
              </div>
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.titleKey}>
              <h3 className="text-white font-semibold mb-4">{t(section.titleKey)}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.labelKey}>
                    <LocalizedLink
                      to={link.href}
                      className="hover:text-white transition-colors duration-200"
                    >
                      {t(link.labelKey)}
                    </LocalizedLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-8 mb-8">
          <h3 className="text-white font-semibold mb-4">{t('footer.serviceAreas')}</h3>
          <div className="flex flex-wrap gap-3">
            {provinces.map((province) => (
              <LocalizedLink
                key={province}
                to="#"
                className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors duration-200"
              >
                {province}
              </LocalizedLink>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6">
              <a href="#" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200">
                <Facebook className="w-6 h-6" />
              </a>
              <a href="https://x.com/doktochain" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200">
                <Twitter className="w-6 h-6" />
              </a>
              <a href="https://www.instagram.com/doktochain/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200">
                <Instagram className="w-6 h-6" />
              </a>
              <a href="https://www.linkedin.com/company/doktochain/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200">
                <Linkedin className="w-6 h-6" />
              </a>
              <a href="https://www.youtube.com/channel/UCF3f4vUZy_dq7X8Xmxezwaw" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200">
                <Youtube className="w-6 h-6" />
              </a>
            </div>

            <div className="flex items-center space-x-6 text-sm">
              <span>{t('footer.copyright', { year: currentYear })}</span>
              <div className="flex items-center space-x-4">
                <img src="https://img.shields.io/badge/HIPAA-Compliant-green" alt="HIPAA Compliant" className="h-5" />
                <img src="https://img.shields.io/badge/SSL-Secure-blue" alt="SSL Secure" className="h-5" />
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('footer.disclaimer')}
          </p>
        </div>
      </div>
    </footer>
  );
}
