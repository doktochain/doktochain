import { useTranslation } from 'react-i18next';
import LegalPageLayout from '../../../../components/frontend/LegalPageLayout';

export default function CookiePolicyPage() {
  const { t } = useTranslation('legal');

  return (
    <LegalPageLayout title={t('cookiePolicy')} lastUpdated="March 15, 2026">
      <h2>{t('cookies.section1.title')}</h2>
      <p>{t('cookies.section1.content')}</p>

      <h2>{t('cookies.section2.title')}</h2>
      <p>{t('cookies.section2.intro')}</p>

      <h3>{t('cookies.section2.essential.title')}</h3>
      <p>{t('cookies.section2.essential.intro')}</p>
      <ul>
        {t('cookies.section2.essential.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h3>{t('cookies.section2.functional.title')}</h3>
      <p>{t('cookies.section2.functional.intro')}</p>
      <ul>
        {t('cookies.section2.functional.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h3>{t('cookies.section2.analytics.title')}</h3>
      <p>{t('cookies.section2.analytics.intro')}</p>
      <ul>
        {t('cookies.section2.analytics.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
      <p>{t('cookies.section2.analytics.note')}</p>

      <h2>{t('cookies.section3.title')}</h2>
      <p>{t('cookies.section3.intro')}</p>
      <ul>
        {t('cookies.section3.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>
      <p>{t('cookies.section3.note')}</p>

      <h2>{t('cookies.section4.title')}</h2>
      <p>{t('cookies.section4.intro')}</p>

      <h3>{t('cookies.section4.browser.title')}</h3>
      <p>{t('cookies.section4.browser.content')}</p>

      <h3>{t('cookies.section4.controls.title')}</h3>
      <ul>
        {t('cookies.section4.controls.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h2>{t('cookies.section5.title')}</h2>
      <p>{t('cookies.section5.content')}</p>

      <h2>{t('cookies.section6.title')}</h2>
      <p>{t('cookies.section6.content')}</p>

      <h2>{t('cookies.section7.title')}</h2>
      <p>{t('cookies.section7.intro')}</p>
      <ul>
        {t('cookies.section7.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </LegalPageLayout>
  );
}
