import { forwardRef } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const LocalizedLink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, ...props }, ref) => {
    const { i18n } = useTranslation();
    const lang = i18n.language;

    const localizedTo = typeof to === 'string' && to.startsWith('/')
      ? `/${lang}${to}`
      : to;

    return <Link ref={ref} to={localizedTo} {...props} />;
  }
);

LocalizedLink.displayName = 'LocalizedLink';

export default LocalizedLink;
