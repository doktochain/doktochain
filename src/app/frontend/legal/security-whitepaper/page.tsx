import { useTranslation } from 'react-i18next';
import LegalPageLayout from '../../../../components/frontend/LegalPageLayout';

export default function SecurityWhitepaperPage() {
  const { t } = useTranslation('legal');

  return (
    <LegalPageLayout title={t('securityWhitepaper')} lastUpdated="April 6, 2026">
      <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded mb-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          {t('security.executiveSummary.title')}
        </h3>
        <p className="text-blue-800">
          {t('security.executiveSummary.content')}
        </p>
      </div>

      <h2>{t('security.section1.title')}</h2>
      <p>{t('security.section1.intro')}</p>

      <h3>{t('security.section1.hashChain.title')}</h3>
      <p>{t('security.section1.hashChain.intro')}</p>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section1.hashChain.hashFunction') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section1.hashChain.chainFormat') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section1.hashChain.immutability') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section1.hashChain.verification') }} />
      </ul>

      <h3>{t('security.section1.coverage.title')}</h3>
      <p>{t('security.section1.coverage.intro')}</p>
      <ul>
        {t('security.section1.coverage.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h3>{t('security.section1.patientAccess.title')}</h3>
      <p>{t('security.section1.patientAccess.content')}</p>

      <h2>{t('security.section2.title')}</h2>
      <p>{t('security.section2.intro')}</p>

      <h3>{t('security.section2.inTransit.title')}</h3>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section2.inTransit.protocol') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section2.inTransit.certificate') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section2.inTransit.cipherSuites') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section2.inTransit.forwardSecrecy') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section2.inTransit.hsts') }} />
      </ul>

      <h3>{t('security.section2.atRest.title')}</h3>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section2.atRest.algorithm') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section2.atRest.mode') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section2.atRest.keyManagement') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section2.atRest.database') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section2.atRest.fileStorage') }} />
      </ul>

      <h3>{t('security.section2.keyRotation.title')}</h3>
      <p>{t('security.section2.keyRotation.content')}</p>

      <h2>{t('security.section3.title')}</h2>
      <p>{t('security.section3.intro')}</p>

      <h3>{t('security.section3.howItWorks.title')}</h3>
      <p>{t('security.section3.howItWorks.intro')}</p>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section3.howItWorks.userIdentity') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section3.howItWorks.ownership') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section3.howItWorks.consentState') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section3.howItWorks.organizational') }} />
      </ul>

      <h3>{t('security.section3.consentBased.title')}</h3>
      <p>{t('security.section3.consentBased.intro')}</p>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section3.consentBased.existence') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section3.consentBased.scope') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section3.consentBased.timeWindow') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section3.consentBased.revocation') }} />
      </ul>
      <p>{t('security.section3.consentBased.failure')}</p>

      <h3>{t('security.section3.examples.title')}</h3>
      <p>{t('security.section3.examples.intro')}</p>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section3.examples.patientSelf') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section3.examples.provider') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section3.examples.pharmacy') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section3.examples.admin') }} />
      </ul>

      <h2>{t('security.section4.title')}</h2>
      <p>{t('security.section4.intro')}</p>

      <h3>{t('security.section4.dataMinimization.title')}</h3>
      <ul>
        {t('security.section4.dataMinimization.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h3>{t('security.section4.consentPrimitive.title')}</h3>
      <p>{t('security.section4.consentPrimitive.intro')}</p>
      <ul>
        {t('security.section4.consentPrimitive.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h3>{t('security.section4.staffRestrictions.title')}</h3>
      <p>{t('security.section4.staffRestrictions.intro')}</p>
      <ul>
        {t('security.section4.staffRestrictions.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('security.section5.title')}</h2>
      <p>{t('security.section5.intro')}</p>

      <h3>{t('security.section5.types.title')}</h3>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section5.types.directCare') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section5.types.prescription') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section5.types.healthRecord') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section5.types.research') }} />
      </ul>

      <h3>{t('security.section5.timeBound.title')}</h3>
      <p>{t('security.section5.timeBound.intro')}</p>
      <ul>
        <li>{t('security.section5.timeBound.directCare')}</li>
        <li>{t('security.section5.timeBound.prescription')}</li>
        <li>{t('security.section5.timeBound.healthRecord')}</li>
        <li>{t('security.section5.timeBound.emergency')}</li>
      </ul>

      <h3>{t('security.section5.revocation.title')}</h3>
      <p>{t('security.section5.revocation.intro')}</p>
      <ul>
        {t('security.section5.revocation.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('security.section6.title')}</h2>
      <p>{t('security.section6.intro')}</p>

      <h3>{t('security.section6.pipeda.title')}</h3>
      <p>{t('security.section6.pipeda.intro')}</p>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.pipeda.accountability') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.pipeda.purpose') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.pipeda.consent') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.pipeda.limiting') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.pipeda.useLimitation') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.pipeda.accuracy') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.pipeda.safeguards') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.pipeda.openness') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.pipeda.individualAccess') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.pipeda.complaints') }} />
      </ul>

      <h3>{t('security.section6.provincial.title')}</h3>
      <p>{t('security.section6.provincial.intro')}</p>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.provincial.ontario') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.provincial.alberta') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.provincial.bc') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.provincial.quebec') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.provincial.other') }} />
      </ul>

      <h3>{t('security.section6.hipaa.title')}</h3>
      <p>{t('security.section6.hipaa.intro')}</p>
      <ul>
        {t('security.section6.hipaa.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h3>{t('security.section6.fhir.title')}</h3>
      <p>{t('security.section6.fhir.intro')}</p>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.fhir.resources') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.fhir.coding') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.fhir.validation') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section6.fhir.export') }} />
      </ul>

      <h2>{t('security.section7.title')}</h2>
      <p>{t('security.section7.intro')}</p>

      <h3>{t('security.section7.hosting.title')}</h3>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.hosting.primary') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.hosting.dr') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.hosting.geographic') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.hosting.iac') }} />
      </ul>

      <h3>{t('security.section7.network.title')}</h3>
      <p>{t('security.section7.network.intro')}</p>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.network.private') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.network.outbound') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.network.pooling') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.network.entry') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.network.cdn') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.network.securityGroups') }} />
      </ul>

      <h3>{t('security.section7.keyManagement.title')}</h3>
      <p>{t('security.section7.keyManagement.intro')}</p>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.keyManagement.hsm') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.keyManagement.database') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.keyManagement.fileStorage') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.keyManagement.secrets') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.keyManagement.rotation') }} />
      </ul>

      <h3>{t('security.section7.monitoring.title')}</h3>
      <p>{t('security.section7.monitoring.intro')}</p>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.monitoring.apiLogging') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.monitoring.realtime') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.monitoring.flowLogs') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.monitoring.ledger') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.monitoring.alerting') }} />
      </ul>

      <h3>{t('security.section7.disaster.title')}</h3>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.disaster.rpo') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.disaster.rto') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.disaster.backup') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.disaster.multiAz') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.disaster.crossRegion') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.disaster.reproducibility') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section7.disaster.testing') }} />
      </ul>

      <h3>{t('security.section7.soc2.title')}</h3>
      <p>{t('security.section7.soc2.intro')}</p>
      <ul>
        {t('security.section7.soc2.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('security.section8.title')}</h2>
      <p>{t('security.section8.intro')}</p>

      <h3>{t('security.section8.fhirGateway.title')}</h3>
      <p>{t('security.section8.fhirGateway.intro')}</p>
      <ul>
        {t('security.section8.fhirGateway.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h3>{t('security.section8.provincial.title')}</h3>
      <p>{t('security.section8.provincial.intro')}</p>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section8.provincial.ontario') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section8.provincial.alberta') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section8.provincial.bc') }} />
      </ul>
      <p>{t('security.section8.provincial.note')}</p>

      <h3>{t('security.section8.prescription.title')}</h3>
      <p>{t('security.section8.prescription.intro')}</p>
      <ul>
        {t('security.section8.prescription.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h2>{t('security.section9.title')}</h2>

      <h3>{t('security.section9.penetration.title')}</h3>
      <p>{t('security.section9.penetration.intro')}</p>
      <ul>
        {t('security.section9.penetration.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <h3>{t('security.section9.codeReview.title')}</h3>
      <p>{t('security.section9.codeReview.content')}</p>

      <h3>{t('security.section9.incident.title')}</h3>
      <p>{t('security.section9.incident.intro')}</p>
      <ul>
        <li dangerouslySetInnerHTML={{ __html: t('security.section9.incident.detection') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section9.incident.response') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section9.incident.investigation') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section9.incident.notification') }} />
        <li dangerouslySetInnerHTML={{ __html: t('security.section9.incident.remediation') }} />
      </ul>

      <h2>{t('security.section10.title')}</h2>

      <h3>{t('security.section10.cryptographic.title')}</h3>
      <table className="w-full text-sm border-collapse my-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-3 text-left">
              {t('security.section10.cryptographic.tableHeaders.component')}
            </th>
            <th className="border border-gray-300 p-3 text-left">
              {t('security.section10.cryptographic.tableHeaders.standard')}
            </th>
            <th className="border border-gray-300 p-3 text-left">
              {t('security.section10.cryptographic.tableHeaders.details')}
            </th>
          </tr>
        </thead>
        <tbody>
          {t('security.section10.cryptographic.rows', { returnObjects: true }).map((row: any, idx: number) => (
            <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
              <td className="border border-gray-300 p-3">{row.component}</td>
              <td className="border border-gray-300 p-3">{row.standard}</td>
              <td className="border border-gray-300 p-3">{row.details}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{t('security.section10.regulatory.title')}</h3>
      <ul>
        {t('security.section10.regulatory.items', { returnObjects: true }).map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>

      <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded mt-8">
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          {t('security.commitment.title')}
        </h3>
        <p className="text-green-800">
          {t('security.commitment.content')}
        </p>
      </div>
    </LegalPageLayout>
  );
}
