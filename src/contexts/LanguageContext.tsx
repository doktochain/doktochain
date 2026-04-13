import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthState } from './AuthContext';
import { supabase } from '../lib/supabase';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  ALTERNATE_LANGUAGE,
} from '../lib/i18n';

interface LanguageContextType {
  language: SupportedLanguage;
  alternateLanguage: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  isLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { i18n } = useTranslation();
  const { user, userProfile } = useAuthState();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (userProfile?.language_preference) {
      const pref = userProfile.language_preference as SupportedLanguage;
      if (SUPPORTED_LANGUAGES.includes(pref)) {
        localStorage.setItem('doktochain_language', pref);
      }
    }
    setIsLoaded(true);
  }, [userProfile]);

  const setLanguage = useCallback(async (lang: SupportedLanguage) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem('doktochain_language', lang);
    document.documentElement.lang = lang;

    if (user) {
      try {
        await supabase
          .from('user_profiles')
          .update({ language_preference: lang })
          .eq('id', user.id);
      } catch {}
    }
  }, [i18n, user]);

  const toggleLanguage = useCallback(async () => {
    const current = i18n.language as SupportedLanguage;
    const next = ALTERNATE_LANGUAGE[current] || (current === 'en' ? 'fr' : 'en');
    await setLanguage(next);
  }, [i18n, setLanguage]);

  const value = useMemo<LanguageContextType>(() => {
    const current = (SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)
      ? i18n.language
      : DEFAULT_LANGUAGE) as SupportedLanguage;

    return {
      language: current,
      alternateLanguage: ALTERNATE_LANGUAGE[current],
      setLanguage,
      toggleLanguage,
      isLoaded,
    };
  }, [i18n.language, setLanguage, toggleLanguage, isLoaded]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used within LanguageProvider');
  }
  return context;
};
