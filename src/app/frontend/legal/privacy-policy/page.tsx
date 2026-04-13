import { useTranslation } from 'react-i18next';
import LegalPageLayout from '../../../../components/frontend/LegalPageLayout';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation('legal');

  return (
    <LegalPageLayout title={t('privacyPolicy')} lastUpdated="March 15, 2026">
      <h2>1. Introduction</h2>
      <p>{t('privacy.intro1')}</p>
      <p>{t('privacy.intro2')}</p>

      <h2>{t('privacy.section2.title')}</h2>
      <h3>{t('privacy.section2.personal.title')}</h3>
      <p>{t('privacy.section2.personal.intro')}</p>
      <ul>
        {t('privacy.section2.personal.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h3>{t('privacy.section2.health.title')}</h3>
      <p>{t('privacy.section2.health.intro')}</p>
      <ul>
        {t('privacy.section2.health.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h3>{t('privacy.section2.technical.title')}</h3>
      <ul>
        {t('privacy.section2.technical.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('privacy.section3.title')}</h2>
      <p>{t('privacy.section3.intro')}</p>
      <ul>
        {t('privacy.section3.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('privacy.section4.title')}</h2>
      <p>{t('privacy.section4.intro')}</p>
      <ul>
        {t('privacy.section4.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h2>{t('privacy.section5.title')}</h2>
      <p>{t('privacy.section5.intro')}</p>
      <ul>
        {t('privacy.section5.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>
      <p>{t('privacy.section5.noSale')}</p>

      <h2>{t('privacy.section6.title')}</h2>
      <p>{t('privacy.section6.intro')}</p>
      <ul>
        {t('privacy.section6.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('privacy.section7.title')}</h2>
      <p>{t('privacy.section7.content')}</p>

      <h2>{t('privacy.section8.title')}</h2>
      <p>{t('privacy.section8.intro')}</p>
      <ul>
        {t('privacy.section8.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('privacy.section9.title')}</h2>
      <p>{t('privacy.section9.content')}</p>

      <h2>{t('privacy.section10.title')}</h2>
      <p>{t('privacy.section10.intro')}</p>
      <ul>
        {t('privacy.section10.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </LegalPageLayout>
  );
}
