import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { consentService } from '../../services/consentService';
import { fhirGatewayService, CrossProviderRecord, PatientCompleteRecord } from '../../services/fhirGatewayService';
import { auditTrailService } from '../../services/auditTrailService';
import {
  FileText, AlertCircle, Shield, Lock,
  Pill, Calendar, FlaskConical, X, ChevronDown, ChevronUp,
  Timer, CalendarClock, Users,
} from 'lucide-react';
import ConsentStatusBadge from '../ui/ConsentStatusBadge';

interface PatientChartViewerProps {
  patientId: string;
  onClose?: () => void;
}

export default function PatientChartViewer({ patientId, onClose }: PatientChartViewerProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasConsent, setHasConsent] = useState(false);
  const [consentInfo, setConsentInfo] = useState<PatientCompleteRecord['consentInfo']>(null);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [providerId, setProviderId] = useState('');
  const [record, setRecord] = useState<PatientCompleteRecord | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    allergies: true,
    medications: true,
    labs: false,
    notes: false,
    visits: false,
    conditions: false,
    procedures: false,
  });

  useEffect(() => {
    if (user && patientId) {
      loadProviderAndCheckConsent();
    }
  }, [user, patientId]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const loadProviderAndCheckConsent = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: provider } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (provider) {
        setProviderId(provider.id);

        const consentResult = await consentService.verifyProviderConsent(patientId, provider.id);

        if (consentResult.hasConsent) {
          setHasConsent(true);

          const completeRecord = await fhirGatewayService.getPatientCompleteRecord(
            patientId,
            provider.id,
            user.id
          );
          setRecord(completeRecord);
          setConsentInfo(completeRecord.consentInfo);

          await loadPatientDemographics();
        } else {
          setHasConsent(false);
        }
      }
    } catch (error) {
      console.error('Error loading provider:', error);
      setHasConsent(false);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientDemographics = async () => {
    const { data: patientRow } = await supabase
      .from('patients')
      .select('*, user_profiles(first_name, last_name, email, phone, date_of_birth, gender)')
      .eq('id', patientId)
      .maybeSingle();

    if (patientRow) {
      const profile = patientRow.user_profiles as any;
      setPatientInfo({
        ...patientRow,
        full_name: profile ? `${profile.first_name} ${profile.last_name}` : 'N/A',
        date_of_birth: profile?.date_of_birth || patientRow.date_of_birth,
        gender: profile?.gender,
        email: profile?.email,
        phone: profile?.phone,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <Lock className="w-10 h-10 text-red-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-4">
            Access Denied
          </h2>

          <div className="space-y-4 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              You do not have active consent to access this patient's health records.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Privacy Protection</p>
                  <p>
                    DoktoChain enforces database-level consent rules. The patient must grant you
                    explicit consent with time-based access windows before you can view their records.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-blue-800 mb-2">
                <strong>To gain access:</strong>
              </p>
              <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                <li>Request consent from the patient through the messaging system</li>
                <li>Patient must grant access through their Health Records sharing feature</li>
                <li>Access is time-limited and logged on the cryptographic audit trail</li>
              </ol>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="w-full mt-6 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  const SectionHeader = ({
    title,
    icon,
    section,
    count,
    iconColor,
  }: {
    title: string;
    icon: React.ReactNode;
    section: string;
    count: number;
    iconColor: string;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600"
    >
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <span className={iconColor}>{icon}</span>
        {title}
        <span className="text-sm font-normal text-gray-500">({count})</span>
      </h3>
      {expandedSections[section] ? (
        <ChevronUp className="w-5 h-5 text-gray-400" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-400" />
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Patient Chart</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {consentInfo && (
          <div className={`mb-6 p-3 rounded-lg border ${
            consentInfo.scope === 'appointment'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-teal-50 border-teal-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded ${
                consentInfo.scope === 'appointment' ? 'bg-blue-100' : 'bg-teal-100'
              }`}>
                {consentInfo.scope === 'appointment' ? (
                  <CalendarClock className="w-4 h-4 text-blue-600" />
                ) : (
                  <Shield className="w-4 h-4 text-teal-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    consentInfo.scope === 'appointment' ? 'text-blue-800' : 'text-teal-800'
                  }`}>
                    {consentInfo.scope === 'appointment' ? 'Appointment-Scoped Access' : 'Broad Consent Active'}
                  </span>
                  {consentInfo.scope === 'appointment' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      <Timer className="w-3 h-3" />
                      Time-limited
                    </span>
                  )}
                </div>
                {consentInfo.windowEnd && (
                  <p className={`text-xs mt-0.5 ${
                    consentInfo.scope === 'appointment' ? 'text-blue-600' : 'text-teal-600'
                  }`}>
                    {consentInfo.scope === 'appointment'
                      ? `Window closes: ${new Date(consentInfo.windowEnd).toLocaleString()}`
                      : `Expires: ${new Date(consentInfo.windowEnd).toLocaleDateString()}`
                    }
                  </p>
                )}
              </div>
              <Users className={`w-4 h-4 ${
                consentInfo.scope === 'appointment' ? 'text-blue-400' : 'text-teal-400'
              }`} />
            </div>
            <p className="text-xs mt-2 text-gray-600">
              Cross-provider data visible -- records from all treating providers are shown with attribution.
            </p>
          </div>
        )}

        {patientInfo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Patient Name</p>
              <p className="font-semibold text-gray-900 dark:text-white">{patientInfo.full_name || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Date of Birth</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {patientInfo.date_of_birth
                  ? new Date(patientInfo.date_of_birth).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Health Card</p>
              <p className="font-semibold text-gray-900 dark:text-white">{patientInfo.health_card_number || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Blood Type</p>
              <p className="font-semibold text-gray-900 dark:text-white">{patientInfo.blood_type || 'N/A'}</p>
            </div>
          </div>
        )}

        {record && (
          <div className="space-y-4">
            <RecordSection
              title="Allergies"
              icon={<AlertCircle className="w-5 h-5" />}
              section="allergies"
              records={record.allergies}
              iconColor="text-red-600"
              expanded={expandedSections.allergies}
              onToggle={() => toggleSection('allergies')}
              renderItem={(r) => (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-red-900">{r.data.allergen || r.data.code_display || 'Unknown'}</p>
                      <p className="text-sm text-red-700">
                        {r.data.allergen_type || r.data.category || ''} - {r.data.severity || r.data.criticality || ''} severity
                      </p>
                    </div>
                    <ProviderAttribution record={r} currentProviderId={providerId} />
                  </div>
                </div>
              )}
            />

            <RecordSection
              title="Current Medications"
              icon={<Pill className="w-5 h-5" />}
              section="medications"
              records={record.medications}
              iconColor="text-blue-600"
              expanded={expandedSections.medications}
              onToggle={() => toggleSection('medications')}
              renderItem={(r) => (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900">{r.data.medication_code_display || r.data.medication_name || 'Unknown'}</p>
                      <p className="text-sm text-blue-700">
                        {r.data.dosage_instruction || r.data.dosage || ''} {r.data.frequency ? `- ${r.data.frequency}` : ''}
                      </p>
                      <p className="text-xs text-blue-500 mt-1">
                        {r.data.status || ''}
                      </p>
                    </div>
                    <ProviderAttribution record={r} currentProviderId={providerId} />
                  </div>
                </div>
              )}
            />

            <RecordSection
              title="Conditions"
              icon={<FileText className="w-5 h-5" />}
              section="conditions"
              records={record.conditions}
              iconColor="text-amber-600"
              expanded={expandedSections.conditions}
              onToggle={() => toggleSection('conditions')}
              renderItem={(r) => (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-amber-900">{r.data.code_display || 'Unknown'}</p>
                      <p className="text-sm text-amber-700">{r.data.clinical_status || ''}</p>
                      {r.data.code_code && (
                        <p className="text-xs text-amber-500 mt-1">Code: {r.data.code_code}</p>
                      )}
                    </div>
                    <ProviderAttribution record={r} currentProviderId={providerId} />
                  </div>
                </div>
              )}
            />

            <RecordSection
              title="Clinical Notes"
              icon={<FileText className="w-5 h-5" />}
              section="notes"
              records={record.clinicalNotes}
              iconColor="text-sky-600"
              expanded={expandedSections.notes}
              onToggle={() => toggleSection('notes')}
              renderItem={(r) => (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-sky-900">
                      {new Date(r.authored_date).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        r.data.status === 'signed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {r.data.status}
                      </span>
                      <ProviderAttribution record={r} currentProviderId={providerId} />
                    </div>
                  </div>
                  {r.data.chief_complaint && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-sky-700">Chief Complaint:</p>
                      <p className="text-sm text-sky-900">{r.data.chief_complaint}</p>
                    </div>
                  )}
                  {r.data.assessment && (
                    <div>
                      <p className="text-xs font-semibold text-sky-700">Assessment:</p>
                      <p className="text-sm text-sky-900">{r.data.assessment}</p>
                    </div>
                  )}
                </div>
              )}
            />

            <RecordSection
              title="Procedures"
              icon={<FlaskConical className="w-5 h-5" />}
              section="procedures"
              records={record.procedures}
              iconColor="text-teal-600"
              expanded={expandedSections.procedures}
              onToggle={() => toggleSection('procedures')}
              renderItem={(r) => (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-teal-900">{r.data.code_display || 'Unknown'}</p>
                      <p className="text-sm text-teal-700">{r.data.status || ''}</p>
                    </div>
                    <ProviderAttribution record={r} currentProviderId={providerId} />
                  </div>
                </div>
              )}
            />
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Cryptographic Audit Trail</p>
            <p>
              All accesses to this patient chart are logged on an immutable cryptographic audit trail.
              Patient consent is enforced at the database level with time-based access windows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderAttribution({ record, currentProviderId }: { record: CrossProviderRecord; currentProviderId: string }) {
  const isCrossProvider = record.authored_by_provider_id && record.authored_by_provider_id !== currentProviderId;

  return (
    <div className="text-right flex-shrink-0 ml-3">
      <p className={`text-xs font-medium ${isCrossProvider ? 'text-amber-600' : 'text-gray-500'}`}>
        {record.authored_by_provider_name}
      </p>
      {isCrossProvider && (
        <span className="inline-flex items-center gap-1 text-xs text-amber-500">
          <Users className="w-3 h-3" />
          Other provider
        </span>
      )}
    </div>
  );
}

function RecordSection({
  title,
  icon,
  section,
  records,
  iconColor,
  expanded,
  onToggle,
  renderItem,
}: {
  title: string;
  icon: React.ReactNode;
  section: string;
  records: CrossProviderRecord[];
  iconColor: string;
  expanded: boolean;
  onToggle: () => void;
  renderItem: (record: CrossProviderRecord) => React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600"
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className={iconColor}>{icon}</span>
          {title}
          <span className="text-sm font-normal text-gray-500">({records.length})</span>
        </h3>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="pt-4">
          {records.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-sm">No {title.toLowerCase()} on file</p>
          ) : (
            <div className="grid gap-3">
              {records.map((r) => (
                <div key={r.id}>{renderItem(r)}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
