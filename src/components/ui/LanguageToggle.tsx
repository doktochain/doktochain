import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguageContext } from '../../contexts/LanguageContext';
import {
  LANGUAGE_SHORT,
  LANGUAGE_NAMES,
  ALTERNATE_LANGUAGE,
} from '../../lib/i18n';

interface LanguageToggleProps {
  variant?: 'light' | 'dark';
}

export const LanguageToggle = ({ variant = 'light' }: LanguageToggleProps) => {
  const { language, setLanguage } = useLanguageContext();
  const navigate = useNavigate();
  const location = useLocation();

  const alternateLang = ALTERNATE_LANGUAGE[language];
  const alternateName = LANGUAGE_NAMES[alternateLang];

  const handleToggle = async () => {
    await setLanguage(alternateLang);
    const pathWithoutLang = location.pathname.replace(/^\/(en|fr)/, '');
    navigate(
      `/${alternateLang}${pathWithoutLang || '/'}${location.search}${location.hash}`,
      { replace: true }
    );
  };

  const baseClasses = 'inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantClasses = variant === 'light'
    ? 'text-white hover:bg-white/20 focus:ring-white/50'
    : 'text-gray-700 hover:bg-gray-100 focus:ring-gray-300';

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`${baseClasses} ${variantClasses}`}
      title={alternateName}
      aria-label={alternateName}
    >
      <span lang={alternateLang}>
        {LANGUAGE_SHORT[alternateLang]}
      </span>
    </button>
  );
};

export default LanguageToggle;
