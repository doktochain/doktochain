import { useTranslation } from 'react-i18next';
import LegalPageLayout from '../../../../components/frontend/LegalPageLayout';

export default function AccessibilityPage() {
  const { t } = useTranslation('legal');

  return (
    <LegalPageLayout title={t('accessibility.title')} lastUpdated="March 15, 2026">
      <h2>{t('accessibility.section1.title')}</h2>
      <p>{t('accessibility.section1.para1')}</p>
      <p>{t('accessibility.section1.para2')}</p>

      <h2>{t('accessibility.section2.title')}</h2>
      <p>{t('accessibility.section2.intro')}</p>
      <ul>
        {t('accessibility.section2.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h2>{t('accessibility.section3.title')}</h2>
      <h3>{t('accessibility.section3.visual.title')}</h3>
      <ul>
        {t('accessibility.section3.visual.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h3>{t('accessibility.section3.navigation.title')}</h3>
      <ul>
        {t('accessibility.section3.navigation.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h3>{t('accessibility.section3.content.title')}</h3>
      <ul>
        {t('accessibility.section3.content.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h3>{t('accessibility.section3.assistive.title')}</h3>
      <ul>
        {t('accessibility.section3.assistive.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('accessibility.section4.title')}</h2>
      <p>{t('accessibility.section4.intro')}</p>
      <ul>
        {t('accessibility.section4.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('accessibility.section5.title')}</h2>
      <p>{t('accessibility.section5.intro')}</p>
      <ul>
        {t('accessibility.section5.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('accessibility.section6.title')}</h2>
      <p>{t('accessibility.section6.content')}</p>

      <h2>{t('accessibility.section7.title')}</h2>
      <p>{t('accessibility.section7.intro')}</p>
      <ul>
        {t('accessibility.section7.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
      <p>{t('accessibility.section7.response')}</p>

      <h2>{t('accessibility.section8.title')}</h2>
      <p>{t('accessibility.section8.content')}</p>
    </LegalPageLayout>
  );
}
