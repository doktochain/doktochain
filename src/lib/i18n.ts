import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from '../locales/en/common.json';
import enNav from '../locales/en/nav.json';
import enFrontend from '../locales/en/frontend.json';
import enAuth from '../locales/en/auth.json';
import enPatient from '../locales/en/patient.json';
import enProvider from '../locales/en/provider.json';
import enPharmacy from '../locales/en/pharmacy.json';
import enAdmin from '../locales/en/admin.json';
import enClinic from '../locales/en/clinic.json';
import enLegal from '../locales/en/legal.json';
import enMedical from '../locales/en/medical.json';
import enNotifications from '../locales/en/notifications.json';
import enPricing from '../locales/en/pricing.json';

import frCommon from '../locales/fr/common.json';
import frNav from '../locales/fr/nav.json';
import frFrontend from '../locales/fr/frontend.json';
import frAuth from '../locales/fr/auth.json';
import frPatient from '../locales/fr/patient.json';
import frProvider from '../locales/fr/provider.json';
import frPharmacy from '../locales/fr/pharmacy.json';
import frAdmin from '../locales/fr/admin.json';
import frClinic from '../locales/fr/clinic.json';
import frLegal from '../locales/fr/legal.json';
import frMedical from '../locales/fr/medical.json';
import frNotifications from '../locales/fr/notifications.json';
import frPricing from '../locales/fr/pricing.json';

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  fr: 'Fran\u00e7ais',
};

export const LANGUAGE_SHORT: Record<SupportedLanguage, string> = {
  en: 'EN',
  fr: 'FR',
};

export const ALTERNATE_LANGUAGE: Record<SupportedLanguage, SupportedLanguage> = {
  en: 'fr',
  fr: 'en',
};

const namespaces = [
  'common',
  'nav',
  'frontend',
  'auth',
  'patient',
  'provider',
  'pharmacy',
  'admin',
  'clinic',
  'legal',
  'medical',
  'notifications',
  'pricing',
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    detection: {
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0,
      lookupLocalStorage: 'doktochain_language',
    },
    fallbackLng: 'en',
    ns: [...namespaces],
    defaultNS: 'common',
    resources: {
      en: {
        common: enCommon,
        nav: enNav,
        frontend: enFrontend,
        auth: enAuth,
        patient: enPatient,
        provider: enProvider,
        pharmacy: enPharmacy,
        admin: enAdmin,
        clinic: enClinic,
        legal: enLegal,
        medical: enMedical,
        notifications: enNotifications,
        pricing: enPricing,
      },
      fr: {
        common: frCommon,
        nav: frNav,
        frontend: frFrontend,
        auth: frAuth,
        patient: frPatient,
        provider: frProvider,
        pharmacy: frPharmacy,
        admin: frAdmin,
        clinic: frClinic,
        legal: frLegal,
        medical: frMedical,
        notifications: frNotifications,
        pricing: frPricing,
      },
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
