import { useTranslation } from 'react-i18next';
import LegalPageLayout from '../../../../components/frontend/LegalPageLayout';

export default function RefundPolicyPage() {
  const { t } = useTranslation('legal');

  return (
    <LegalPageLayout title={t('refundPolicy')} lastUpdated="April 9, 2026">
      <h2>{t('refund.section1.title')}</h2>
      <p>{t('refund.section1.content')}</p>

      <h2>{t('refund.section2.title')}</h2>
      <p>{t('refund.section2.intro')}</p>

      <h3>{t('refund.section2.consultations.title')}</h3>
      <p>{t('refund.section2.consultations.intro')}</p>
      <ul>
        {(t('refund.section2.consultations.items', { returnObjects: true }) as string[]).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h3>{t('refund.section2.subscriptions.title')}</h3>
      <p>{t('refund.section2.subscriptions.intro')}</p>
      <ul>
        {(t('refund.section2.subscriptions.items', { returnObjects: true }) as string[]).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h3>{t('refund.section2.pharmacy.title')}</h3>
      <p>{t('refund.section2.pharmacy.intro')}</p>
      <ul>
        {(t('refund.section2.pharmacy.items', { returnObjects: true }) as string[]).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h2>{t('refund.section3.title')}</h2>
      <p>{t('refund.section3.intro')}</p>

      <h3>{t('refund.section3.full.title')}</h3>
      <p>{t('refund.section3.full.intro')}</p>
      <ul>
        {(t('refund.section3.full.items', { returnObjects: true }) as string[]).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h3>{t('refund.section3.partial.title')}</h3>
      <p>{t('refund.section3.partial.intro')}</p>
      <ul>
        {(t('refund.section3.partial.items', { returnObjects: true }) as string[]).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h3>{t('refund.section3.nonRefundable.title')}</h3>
      <p>{t('refund.section3.nonRefundable.intro')}</p>
      <ul>
        {(t('refund.section3.nonRefundable.items', { returnObjects: true }) as string[]).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h2>{t('refund.section4.title')}</h2>
      <p>{t('refund.section4.intro')}</p>
      <ul>
        {(t('refund.section4.items', { returnObjects: true }) as string[]).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h2>{t('refund.section5.title')}</h2>
      <p>{t('refund.section5.intro')}</p>
      <ul>
        {(t('refund.section5.items', { returnObjects: true }) as string[]).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h2>{t('refund.section6.title')}</h2>
      <p>{t('refund.section6.intro')}</p>
      <ul>
        {(t('refund.section6.items', { returnObjects: true }) as string[]).map((item: string, idx: number) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>

      <h2>{t('refund.section7.title')}</h2>
      <p>{t('refund.section7.content')}</p>

      <h2>{t('refund.section8.title')}</h2>
      <p>{t('refund.section8.intro')}</p>
      <ul>
        {(t('refund.section8.items', { returnObjects: true }) as string[]).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </LegalPageLayout>
  );
}
