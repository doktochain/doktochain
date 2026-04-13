import { useTranslation } from 'react-i18next';
import LegalPageLayout from '../../../../components/frontend/LegalPageLayout';

export default function TermsOfServicePage() {
  const { t } = useTranslation('legal');

  return (
    <LegalPageLayout title={t('termsOfService')} lastUpdated="March 15, 2026">
      <h2>{t('terms.section1.title')}</h2>
      <p>{t('terms.section1.content')}</p>

      <h2>{t('terms.section2.title')}</h2>
      <p>{t('terms.section2.intro')}</p>
      <ul>
        {t('terms.section2.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
      <p dangerouslySetInnerHTML={{ __html: t('terms.section2.disclaimer') }} />

      <h2>{t('terms.section3.title')}</h2>
      <h3>{t('terms.section3.registration.title')}</h3>
      <p>{t('terms.section3.registration.content')}</p>

      <h3>{t('terms.section3.accountTypes.title')}</h3>
      <ul>
        {t('terms.section3.accountTypes.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h3>{t('terms.section3.security.title')}</h3>
      <p>{t('terms.section3.security.content')}</p>

      <h2>{t('terms.section4.title')}</h2>
      <p>{t('terms.section4.intro')}</p>
      <ul>
        {t('terms.section4.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('terms.section5.title')}</h2>
      <p>{t('terms.section5.intro')}</p>
      <ul>
        {t('terms.section5.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('terms.section6.title')}</h2>
      <p>{t('terms.section6.intro')}</p>
      <ul>
        {t('terms.section6.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('terms.section7.title')}</h2>
      <h3>{t('terms.section7.patientPayments.title')}</h3>
      <p>{t('terms.section7.patientPayments.content')}</p>

      <h3>{t('terms.section7.subscriptions.title')}</h3>
      <p>{t('terms.section7.subscriptions.content')}</p>

      <h3>{t('terms.section7.refunds.title')}</h3>
      <p>{t('terms.section7.refunds.content')}</p>

      <h2>{t('terms.section8.title')}</h2>
      <p>{t('terms.section8.content')}</p>

      <h2>{t('terms.section9.title')}</h2>
      <p>{t('terms.section9.intro')}</p>
      <ul>
        {t('terms.section9.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('terms.section10.title')}</h2>
      <p>{t('terms.section10.para1')}</p>
      <p>{t('terms.section10.para2')}</p>

      <h2>{t('terms.section11.title')}</h2>
      <p>{t('terms.section11.content')}</p>

      <h2>{t('terms.section12.title')}</h2>
      <p>{t('terms.section12.content')}</p>

      <h2>{t('terms.section13.title')}</h2>
      <p>{t('terms.section13.content')}</p>

      <h2>{t('terms.section14.title')}</h2>
      <p>{t('terms.section14.intro')}</p>
      <ul>
        {t('terms.section14.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </LegalPageLayout>
  );
}
