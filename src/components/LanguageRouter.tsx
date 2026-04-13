import { useEffect } from 'react';
import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, SupportedLanguage } from '../lib/i18n';

const detectLanguage = (): SupportedLanguage => {
  const stored = localStorage.getItem('doktochain_language');
  if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
    return stored as SupportedLanguage;
  }

  const navLang = navigator.language?.split('-')[0];
  if (navLang && SUPPORTED_LANGUAGES.includes(navLang as SupportedLanguage)) {
    return navLang as SupportedLanguage;
  }

  return DEFAULT_LANGUAGE;
};

export const LanguageRouter = () => {
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
      }
      document.documentElement.lang = lang;
    } else {
      const detected = detectLanguage();
      const currentPath = location.pathname + location.search + location.hash;
      navigate(`/${detected}${currentPath}`, { replace: true });
    }
  }, [lang, i18n, navigate, location.pathname, location.search, location.hash]);

  if (!lang || !SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
    return null;
  }

  return <Outlet />;
};

export default LanguageRouter;
