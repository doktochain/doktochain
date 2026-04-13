import { api } from '../lib/api-client';
import { consentService } from './consentService';
import { auditTrailService } from './auditTrailService';

export interface CrossProviderRecord {
  id: string;
  category: string;
  data: Record<string, any>;
  authored_by_provider_id: string;
  authored_by_provider_name: string;
  authored_date: string;
}

export interface PatientCompleteRecord {
  observations: CrossProviderRecord[];
  conditions: CrossProviderRecord[];
  medications: CrossProviderRecord[];
  procedures: CrossProviderRecord[];
  allergies: CrossProviderRecord[];
  clinicalNotes: CrossProviderRecord[];
  consentInfo: {
    scope: 'appointment' | 'broad';
    windowEnd: string | null;
    consentId: string;
  } | null;
}

async function getProviderNameMap(providerIds: string[]): Promise<Record<string, string>> {
  if (providerIds.length === 0) return {};

  const uniqueIds = [...new Set(providerIds)];
  const { data } = await api.get<any[]>('/providers', {
    params: { ids: uniqueIds },
  });

  const nameMap: Record<string, string> = {};
  data?.forEach((p: any) => {
    const profile = p.user_profiles;
    nameMap[p.id] = profile ? `Dr. ${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown Provider';
  });
  return nameMap;
}

export const fhirGatewayService = {
  async getPatientCompleteRecord(
    patientId: string,
    requestingProviderId: string,
    requestingUserId: string
  ): Promise<PatientCompleteRecord> {
    const consentResult = await consentService.verifyProviderConsent(patientId, requestingProviderId);

    if (!consentResult.hasConsent) {
      throw new Error(consentResult.reason || 'No active consent');
    }

    const consent = consentResult.consent!;
    const recordTypes = consent.record_types.length > 0 ? consent.record_types : null;

    const queries: Promise<any>[] = [];

    const shouldFetch = (type: string) => !recordTypes || recordTypes.includes(type);

    queries.push(shouldFetch('observations')
      ? api.get<any[]>('/fhir-observations', { params: { patient_id: patientId, limit: 200 } })
      : Promise.resolve({ data: [] }));

    queries.push(shouldFetch('conditions')
      ? api.get<any[]>('/fhir-conditions', { params: { patient_id: patientId, limit: 200 } })
      : Promise.resolve({ data: [] }));

    queries.push(shouldFetch('medications')
      ? api.get<any[]>('/fhir-medication-requests', { params: { patient_id: patientId, limit: 200 } })
      : Promise.resolve({ data: [] }));

    queries.push(shouldFetch('procedures')
      ? api.get<any[]>('/fhir-procedures', { params: { patient_id: patientId, limit: 200 } })
      : Promise.resolve({ data: [] }));

    queries.push(shouldFetch('allergies')
      ? api.get<any[]>('/fhir-allergy-intolerances', { params: { patient_id: patientId, limit: 200 } })
      : Promise.resolve({ data: [] }));

    queries.push(shouldFetch('clinical_notes')
      ? api.get<any[]>('/soap-notes', { params: { patient_id: patientId, limit: 200 } })
      : Promise.resolve({ data: [] }));

    const [obsResult, condResult, medResult, procResult, allergyResult, notesResult] = await Promise.all(queries);

    const allProviderIds = [
      ...(obsResult.data || []).map((r: any) => r.provider_id),
      ...(condResult.data || []).map((r: any) => r.provider_id),
      ...(medResult.data || []).map((r: any) => r.provider_id),
      ...(procResult.data || []).map((r: any) => r.provider_id),
      ...(allergyResult.data || []).map((r: any) => r.recorder_id || r.provider_id),
      ...(notesResult.data || []).map((r: any) => r.provider_id),
    ].filter(Boolean);

    const nameMap = await getProviderNameMap(allProviderIds);

    const mapRecords = (records: any[], category: string, dateField: string, providerField = 'provider_id'): CrossProviderRecord[] =>
      (records || []).map((r: any) => ({
        id: r.id,
        category,
        data: r,
        authored_by_provider_id: r[providerField] || '',
        authored_by_provider_name: nameMap[r[providerField]] || 'Unknown Provider',
        authored_date: r[dateField] || r.created_at || '',
      }));

    const crossProviderIds = new Set<string>();
    [obsResult.data, condResult.data, medResult.data, procResult.data, allergyResult.data, notesResult.data].forEach((records: any[]) => {
      (records || []).forEach((r: any) => {
        const pid = r.provider_id || r.recorder_id;
        if (pid && pid !== requestingProviderId) {
          crossProviderIds.add(pid);
        }
      });
    });

    if (crossProviderIds.size > 0) {
      await auditTrailService.logEventSafe({
        eventType: 'cross_provider_access',
        resourceType: 'health_record',
        resourceId: patientId,
        actorId: requestingUserId,
        actorRole: 'provider',
        actionData: {
          requesting_provider_id: requestingProviderId,
          originating_provider_ids: Array.from(crossProviderIds),
          consent_id: consent.id,
          consent_scope: consent.consent_scope,
          record_categories: recordTypes || ['all'],
        },
      });
    }

    const consentInfo = await consentService.getActiveConsentInfo(requestingProviderId, patientId);

    return {
      observations: mapRecords(obsResult.data, 'observation', 'effective_datetime'),
      conditions: mapRecords(condResult.data, 'condition', 'recorded_date'),
      medications: mapRecords(medResult.data, 'medication', 'authored_on'),
      procedures: mapRecords(procResult.data, 'procedure', 'performed_datetime'),
      allergies: mapRecords(allergyResult.data, 'allergy', 'recorded_date', 'recorder_id'),
      clinicalNotes: mapRecords(notesResult.data, 'clinical_note', 'created_at'),
      consentInfo,
    };
  },

  async getPatientOwnRecord(patientId: string): Promise<PatientCompleteRecord> {
    const [obsResult, condResult, medResult, procResult, allergyResult, notesResult] = await Promise.all([
      api.get<any[]>('/fhir-observations', { params: { patient_id: patientId, limit: 200 } }),
      api.get<any[]>('/fhir-conditions', { params: { patient_id: patientId, limit: 200 } }),
      api.get<any[]>('/fhir-medication-requests', { params: { patient_id: patientId, limit: 200 } }),
      api.get<any[]>('/fhir-procedures', { params: { patient_id: patientId, limit: 200 } }),
      api.get<any[]>('/fhir-allergy-intolerances', { params: { patient_id: patientId, limit: 200 } }),
      api.get<any[]>('/soap-notes', { params: { patient_id: patientId, limit: 200 } }),
    ]);

    const allProviderIds = [
      ...(obsResult.data || []).map((r: any) => r.provider_id),
      ...(condResult.data || []).map((r: any) => r.provider_id),
      ...(medResult.data || []).map((r: any) => r.provider_id),
      ...(procResult.data || []).map((r: any) => r.provider_id),
      ...(allergyResult.data || []).map((r: any) => r.recorder_id || r.provider_id),
      ...(notesResult.data || []).map((r: any) => r.provider_id),
    ].filter(Boolean);

    const nameMap = await getProviderNameMap(allProviderIds);

    const mapRecords = (records: any[], category: string, dateField: string, providerField = 'provider_id'): CrossProviderRecord[] =>
      (records || []).map((r: any) => ({
        id: r.id,
        category,
        data: r,
        authored_by_provider_id: r[providerField] || '',
        authored_by_provider_name: nameMap[r[providerField]] || 'Unknown Provider',
        authored_date: r[dateField] || r.created_at || '',
      }));

    return {
      observations: mapRecords(obsResult.data, 'observation', 'effective_datetime'),
      conditions: mapRecords(condResult.data, 'condition', 'recorded_date'),
      medications: mapRecords(medResult.data, 'medication', 'authored_on'),
      procedures: mapRecords(procResult.data, 'procedure', 'performed_datetime'),
      allergies: mapRecords(allergyResult.data, 'allergy', 'recorded_date', 'recorder_id'),
      clinicalNotes: mapRecords(notesResult.data, 'clinical_note', 'created_at'),
      consentInfo: null,
    };
  },
};
