import { useLanguage } from '../../hooks/useLanguage';

export const CURRENT_TERMS_VERSION = '2026-03-15';
export const CURRENT_PRIVACY_VERSION = '2026-03-15';

interface TermsCheckboxProps {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
  className?: string;
}

export default function TermsCheckbox({ accepted, onChange, className = '' }: TermsCheckboxProps) {
  const { currentLang } = useLanguage();
  const prefix = currentLang === 'fr' ? '/fr' : '/en';

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <input
        type="checkbox"
        id="terms-acceptance"
        checked={accepted}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer flex-shrink-0"
      />
      <label htmlFor="terms-acceptance" className="text-sm text-gray-600 leading-snug cursor-pointer select-none">
        I agree to the{' '}
        <a
          href={`${prefix}/legal/terms-of-service`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 hover:text-teal-700 underline underline-offset-2 font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          Terms of Service
        </a>{' '}
        and{' '}
        <a
          href={`${prefix}/legal/privacy-policy`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 hover:text-teal-700 underline underline-offset-2 font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          Privacy Policy
        </a>
      </label>
    </div>
  );
}
