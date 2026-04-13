import { useTranslation } from 'react-i18next';
import LocalizedLink from '../../../../components/LocalizedLink';
import LegalPageLayout from '../../../../components/frontend/LegalPageLayout';

export default function HipaaCompliancePage() {
  const { t } = useTranslation('legal');

  return (
    <LegalPageLayout title={t('hipaaCompliance')} lastUpdated="March 15, 2026">
      <h2>{t('hipaa.section1.title')}</h2>
      <p>{t('hipaa.section1.content')}</p>

      <h2>{t('hipaa.section2.title')}</h2>
      <p>{t('hipaa.section2.intro')}</p>
      <ul>
        {t('hipaa.section2.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>
      <p>{t('hipaa.section2.note')}</p>

      <h2>{t('hipaa.section3.title')}</h2>
      <p>{t('hipaa.section3.intro')}</p>

      <h3>{t('hipaa.section3.administrative.title')}</h3>
      <ul>
        {t('hipaa.section3.administrative.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h3>{t('hipaa.section3.technical.title')}</h3>
      <ul>
        {t('hipaa.section3.technical.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h3>{t('hipaa.section3.physical.title')}</h3>
      <ul>
        {t('hipaa.section3.physical.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('hipaa.section4.title')}</h2>
      <p>{t('hipaa.section4.intro')}</p>
      <ul>
        {t('hipaa.section4.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('hipaa.section5.title')}</h2>
      <p>{t('hipaa.section5.intro')}</p>
      <ul>
        {t('hipaa.section5.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('hipaa.section6.title')}</h2>
      <p>{t('hipaa.section6.intro')}</p>
      <ul>
        {t('hipaa.section6.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('hipaa.section7.title')}</h2>
      <p>{t('hipaa.section7.intro')}</p>
      <ul>
        {t('hipaa.section7.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('hipaa.section8.title')}</h2>
      <p>{t('hipaa.section8.intro')}</p>
      <ul>
        {t('hipaa.section8.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
      <p>
        {t('hipaa.section8.moreInfo')}{' '}
        <LocalizedLink to="/legal/privacy-policy" className="text-blue-600 hover:underline">{t('privacyPolicy')}</LocalizedLink>.
      </p>
    </LegalPageLayout>
  );
}
