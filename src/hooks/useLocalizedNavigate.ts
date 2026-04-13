import { useNavigate, NavigateOptions } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const useLocalizedNavigate = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  return (to: string, options?: NavigateOptions) => {
    const path = to.startsWith('/') ? `/${i18n.language}${to}` : to;
    navigate(path, options);
  };
};

export default useLocalizedNavigate;
