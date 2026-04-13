import { api } from '../lib/api-client';
import { blockchainAuditService } from './blockchainAuditService';
import { consentService } from './consentService';
import { auditLog } from './auditLogger';

export interface LabResult {
  id: string;
  patient_id: string;
  test_name: string;
  test_category: string;
  result_value: string;
  unit: string;
  reference_range_low?: number;
  reference_range_high?: number;
  abnormal_flag: 'normal' | 'high' | 'low' | 'critical';
  provider_id?: string;
  provider_comments?: string;
  order_date: string;
  result_date: string;
  lab_facility?: string;
  fhir_observation_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MedicationHistory {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  route: string;
  prescribing_provider_id?: string;
  prescribing_provider_name: string;
  pharmacy_name?: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'discontinued' | 'completed';
  indication?: string;
  fhir_medication_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Allergy {
  id: string;
  patient_id: string;
  allergen_name: string;
  allergen_type: 'medication' | 'food' | 'environmental' | 'other';
  reaction_type: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  date_identified: string;
  documented_by_provider_id?: string;
  documented_by_provider_name: string;
  notes?: string;
  status: 'active' | 'inactive' | 'resolved';
  fhir_allergy_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Immunization {
  id: string;
  patient_id: string;
  vaccine_name: string;
  vaccine_code?: string;
  dose_number: number;
  total_doses?: number;
  administration_date: string;
  location_administered: string;
  administering_provider: string;
  lot_number?: string;
  expiration_date?: string;
  next_dose_due_date?: string;
  route?: string;
  site?: string;
  fhir_immunization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ClinicalNote {
  id: string;
  patient_id: string;
  note_type: 'visit_note' | 'discharge_summary' | 'specialist_report' | 'operative_note' | 'progress_note';
  visit_date: string;
  provider_id?: string;
  provider_name: string;
  specialty?: string;
  facility_name?: string;
  chief_complaint?: string;
  diagnosis_codes?: string[];
  diagnosis_text?: string;
  treatment_plan?: string;
  note_content: string;
  is_shared_with_patient: boolean;
  fhir_document_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncStatus {
  id: string;
  patient_id: string;
  source_system: 'hospital' | 'lab' | 'imaging_center' | 'provider_ehr' | 'manual_upload';
  source_name: string;
  record_type: 'lab' | 'medication' | 'allergy' | 'immunization' | 'clinical_note' | 'imaging';
  last_sync_date: string;
  sync_status: 'success' | 'failed' | 'pending';
  records_synced: number;
  error_message?: string;
  fhir_endpoint?: string;
  created_at: string;
  updated_at: string;
}

export interface RecordShare {
  id: string;
  patient_id: string;
  shared_with_provider_id?: string;
  shared_with_email: string;
  record_types: string[];
  share_start_date: string;
  share_end_date?: string;
  access_code?: string;
  status: 'active' | 'expired' | 'revoked';
  created_at: string;
  updated_at: string;
}

export interface HealthTimelineEvent {
  id: string;
  date: string;
  type: 'lab' | 'medication' | 'allergy' | 'immunization' | 'clinical_note' | 'appointment';
  title: string;
  description: string;
  category: string;
  severity?: string;
  data: any;
}

class HealthRecordsService {
  async getLabResults(patientId: string, filters?: { category?: string; startDate?: string; endDate?: string; providerId?: string }) {
    if (filters?.providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, filters.providerId, 'lab_results');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const params: Record<string, string> = {
      patient_id: patientId,
      order: 'result_date.desc',
    };

    if (filters?.category) {
      params.test_category = filters.category;
    }
    if (filters?.startDate) {
      params.result_date_gte = filters.startDate;
    }
    if (filters?.endDate) {
      params.result_date_lte = filters.endDate;
    }

    const result = await api.get<LabResult[]>('/lab-results', { params });

    if (filters?.providerId && result.data) {
      try {
        await auditLog.dataAccessed('lab_result', patientId, filters.providerId, 'provider', {
          action: 'read', category: filters.category, records_count: result.data.length,
        });
      } catch {}
    }

    return result;
  }

  async getMedicationHistory(patientId: string, status?: 'active' | 'discontinued' | 'completed', providerId?: string) {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'medications');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const params: Record<string, string> = {
      patient_id: patientId,
      order: 'start_date.desc',
    };

    if (status) {
      params.status = status;
    }

    const result = await api.get<MedicationHistory[]>('/medication-history', { params });

    if (providerId && result.data) {
      try {
        await auditLog.dataAccessed('medication_history', patientId, providerId, 'provider', {
          action: 'read', status, records_count: result.data.length,
        });
      } catch {}
    }

    return result;
  }

  async getAllergies(patientId: string, status?: 'active' | 'inactive' | 'resolved', providerId?: string) {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'allergies');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const params: Record<string, string> = {
      patient_id: patientId,
      order: 'date_identified.desc',
    };

    if (status) {
      params.status = status;
    }

    const result = await api.get<Allergy[]>('/allergies', { params });

    if (providerId && result.data) {
      try {
        await auditLog.dataAccessed('allergy', patientId, providerId, 'provider', {
          action: 'read', status, records_count: result.data.length,
        });
      } catch {}
    }

    return result;
  }

  async getImmunizations(patientId: string, providerId?: string) {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'immunizations');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const result = await api.get<Immunization[]>('/immunizations', {
      params: { patient_id: patientId, order: 'administration_date.desc' },
    });

    if (providerId && result.data) {
      try {
        await auditLog.dataAccessed('immunization', patientId, providerId, 'provider', {
          action: 'read', records_count: result.data.length,
        });
      } catch {}
    }

    return result;
  }

  async getClinicalNotes(patientId: string, noteType?: string, providerId?: string) {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'clinical_notes');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const params: Record<string, string> = {
      patient_id: patientId,
      is_shared_with_patient: 'true',
      order: 'visit_date.desc',
    };

    if (noteType) {
      params.note_type = noteType;
    }

    const result = await api.get<ClinicalNote[]>('/clinical-notes', { params });

    if (providerId && result.data) {
      try {
        await auditLog.dataAccessed('clinical_note', patientId, providerId, 'provider', {
          action: 'read', note_type: noteType, records_count: result.data.length,
        });
      } catch {}
    }

    return result;
  }

  async getSyncStatus(patientId: string) {
    return await api.get<SyncStatus[]>('/health-record-sync-status', {
      params: { patient_id: patientId, order: 'last_sync_date.desc' },
    });
  }

  async getRecordShares(patientId: string) {
    return await api.get<RecordShare[]>('/record-shares', {
      params: { patient_id: patientId, order: 'created_at.desc' },
    });
  }

  async getLabTrends(patientId: string, testName: string, months: number = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return await api.get<Pick<LabResult, 'result_date' | 'result_value' | 'unit' | 'abnormal_flag' | 'reference_range_low' | 'reference_range_high'>[]>('/lab-results', {
      params: {
        patient_id: patientId,
        test_name: testName,
        result_date_gte: startDate.toISOString(),
        order: 'result_date.asc',
        select: 'result_date,result_value,unit,abnormal_flag,reference_range_low,reference_range_high',
      },
    });
  }

  async getHealthTimeline(patientId: string, startDate?: string, endDate?: string): Promise<HealthTimelineEvent[]> {
    const events: HealthTimelineEvent[] = [];

    const [labRes, medRes, allergyRes, immunRes, noteRes] = await Promise.all([
      this.getLabResults(patientId, { startDate, endDate }),
      this.getMedicationHistory(patientId),
      this.getAllergies(patientId),
      this.getImmunizations(patientId),
      this.getClinicalNotes(patientId),
    ]);

    if (labRes.data) {
      (labRes.data as LabResult[]).forEach((lab) => {
        events.push({
          id: lab.id,
          date: lab.result_date,
          type: 'lab',
          title: lab.test_name,
          description: `Result: ${lab.result_value} ${lab.unit || ''}`,
          category: lab.test_category,
          severity: lab.abnormal_flag,
          data: lab,
        });
      });
    }

    if (medRes.data) {
      (medRes.data as MedicationHistory[]).forEach((med) => {
        events.push({
          id: med.id,
          date: med.start_date,
          type: 'medication',
          title: med.medication_name,
          description: `${med.dosage} - ${med.frequency}`,
          category: 'Medication',
          data: med,
        });
      });
    }

    if (allergyRes.data) {
      (allergyRes.data as Allergy[]).forEach((allergy) => {
        events.push({
          id: allergy.id,
          date: allergy.date_identified,
          type: 'allergy',
          title: `Allergy: ${allergy.allergen_name}`,
          description: allergy.reaction_type,
          category: allergy.allergen_type,
          severity: allergy.severity,
          data: allergy,
        });
      });
    }

    if (immunRes.data) {
      (immunRes.data as Immunization[]).forEach((immun) => {
        events.push({
          id: immun.id,
          date: immun.administration_date,
          type: 'immunization',
          title: immun.vaccine_name,
          description: `Dose ${immun.dose_number}${immun.total_doses ? ` of ${immun.total_doses}` : ''}`,
          category: 'Immunization',
          data: immun,
        });
      });
    }

    if (noteRes.data) {
      (noteRes.data as ClinicalNote[]).forEach((note) => {
        events.push({
          id: note.id,
          date: note.visit_date,
          type: 'clinical_note',
          title: note.note_type.replace('_', ' ').toUpperCase(),
          description: note.chief_complaint || note.diagnosis_text || '',
          category: note.specialty || 'General',
          data: note,
        });
      });
    }

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async addLabResult(data: Omit<LabResult, 'id' | 'created_at' | 'updated_at'>) {
    if (data.provider_id) {
      const consent = await consentService.verifyProviderConsent(data.patient_id, data.provider_id, 'lab_results');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const result = await api.post<LabResult>('/lab-results', data);
    if (result.data) {
      try {
        await blockchainAuditService.logEvent({
          eventType: 'record_accessed',
          resourceType: 'lab_result',
          resourceId: result.data.id,
          actorId: data.provider_id,
          actorRole: 'provider',
          actionData: { action: 'created', test_name: data.test_name, patient_id: data.patient_id },
        });
      } catch {}
    }
    return result;
  }

  async addMedicationHistory(data: Omit<MedicationHistory, 'id' | 'created_at' | 'updated_at'>) {
    if (data.prescribing_provider_id) {
      const consent = await consentService.verifyProviderConsent(data.patient_id, data.prescribing_provider_id, 'medications');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const result = await api.post<MedicationHistory>('/medication-history', data);
    if (result.data) {
      try {
        await blockchainAuditService.logEvent({
          eventType: 'record_accessed',
          resourceType: 'medication_history',
          resourceId: result.data.id,
          actorId: data.prescribing_provider_id,
          actionData: { action: 'created', medication_name: data.medication_name, patient_id: data.patient_id },
        });
      } catch {}
    }
    return result;
  }

  async addAllergy(data: Omit<Allergy, 'id' | 'created_at' | 'updated_at'>) {
    if (data.documented_by_provider_id) {
      const consent = await consentService.verifyProviderConsent(data.patient_id, data.documented_by_provider_id, 'allergies');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const result = await api.post<Allergy>('/allergies', data);
    if (result.data) {
      try {
        await blockchainAuditService.logEvent({
          eventType: 'record_accessed',
          resourceType: 'allergy',
          resourceId: result.data.id,
          actorId: data.documented_by_provider_id,
          actionData: { action: 'created', allergen_name: data.allergen_name, patient_id: data.patient_id },
        });
      } catch {}
    }
    return result;
  }

  async addImmunization(data: Omit<Immunization, 'id' | 'created_at' | 'updated_at'>) {
    const result = await api.post<Immunization>('/immunizations', data);
    if (result.data) {
      try {
        await blockchainAuditService.logEvent({
          eventType: 'record_accessed',
          resourceType: 'immunization',
          resourceId: result.data.id,
          actionData: { action: 'created', vaccine_name: data.vaccine_name, patient_id: data.patient_id },
        });
      } catch {}
    }
    return result;
  }

  async updateLabResult(id: string, data: Partial<LabResult>, providerId?: string) {
    if (providerId) {
      const { data: existing } = await api.get<{ patient_id: string }>(`/lab-results/${id}`, {
        params: { select: 'patient_id' },
      });
      if (existing) {
        const consent = await consentService.verifyProviderConsent(existing.patient_id, providerId, 'lab_results');
        if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
      }
    }

    const result = await api.put<LabResult>(`/lab-results/${id}`, {
      ...data,
      updated_at: new Date().toISOString(),
    });

    if (providerId && result.data) {
      try {
        await auditLog.dataAccessed('lab_result', id, providerId, 'provider', { action: 'update' });
      } catch {}
    }

    return result;
  }

  async updateMedication(id: string, data: Partial<MedicationHistory>, providerId?: string) {
    if (providerId) {
      const { data: existing } = await api.get<{ patient_id: string }>(`/medication-history/${id}`, {
        params: { select: 'patient_id' },
      });
      if (existing) {
        const consent = await consentService.verifyProviderConsent(existing.patient_id, providerId, 'medications');
        if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
      }
    }

    const result = await api.put<MedicationHistory>(`/medication-history/${id}`, {
      ...data,
      updated_at: new Date().toISOString(),
    });

    if (providerId && result.data) {
      try {
        await auditLog.dataAccessed('medication_history', id, providerId, 'provider', { action: 'update' });
      } catch {}
    }

    return result;
  }

  async updateAllergy(id: string, data: Partial<Allergy>, providerId?: string) {
    if (providerId) {
      const { data: existing } = await api.get<{ patient_id: string }>(`/allergies/${id}`, {
        params: { select: 'patient_id' },
      });
      if (existing) {
        const consent = await consentService.verifyProviderConsent(existing.patient_id, providerId, 'allergies');
        if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
      }
    }

    const result = await api.put<Allergy>(`/allergies/${id}`, {
      ...data,
      updated_at: new Date().toISOString(),
    });

    if (providerId && result.data) {
      try {
        await auditLog.dataAccessed('allergy', id, providerId, 'provider', { action: 'update' });
      } catch {}
    }

    return result;
  }

  async createRecordShare(data: Omit<RecordShare, 'id' | 'created_at' | 'updated_at'>) {
    const result = await api.post<RecordShare>('/record-shares', data);
    if (result.data) {
      try {
        await blockchainAuditService.logEvent({
          eventType: 'record_shared',
          resourceType: 'record_share',
          resourceId: result.data.id,
          actorId: data.patient_id,
          actorRole: 'patient',
          actionData: { shared_with_email: data.shared_with_email, record_types: data.record_types, patient_id: data.patient_id },
        });
      } catch {}
    }
    return result;
  }

  async revokeRecordShare(shareId: string) {
    const result = await api.put<RecordShare>(`/record-shares/${shareId}`, {
      status: 'revoked',
      updated_at: new Date().toISOString(),
    });
    if (result.data) {
      try {
        await blockchainAuditService.logEvent({
          eventType: 'consent_revoked',
          resourceType: 'record_share',
          resourceId: shareId,
          actorId: result.data.patient_id,
          actorRole: 'patient',
          actionData: { action: 'revoked', shared_with_email: result.data.shared_with_email },
        });
      } catch {}
    }
    return result;
  }

  async deleteRecord(table: string, id: string, patientId?: string) {
    const result = await api.delete(`/${table}/${id}`);

    if (patientId) {
      try {
        await auditLog.dataAccessed(table, id, patientId, 'patient', { action: 'delete' });
      } catch {}
    }

    return result;
  }

  async exportRecords(patientId: string, format: 'json' | 'fhir', selectedRecords?: Record<string, boolean>) {
    try {
      await blockchainAuditService.logEvent({
        eventType: 'record_exported',
        resourceType: 'health_records',
        resourceId: patientId,
        actorId: patientId,
        actorRole: 'patient',
        actionData: { format, selected_records: selectedRecords },
      });
    } catch {}

    const include = selectedRecords || {
      labResults: true,
      medications: true,
      allergies: true,
      immunizations: true,
      clinicalNotes: true,
    };

    const [labs, meds, allergies, immuns, notes] = await Promise.all([
      include.labResults ? this.getLabResults(patientId) : Promise.resolve({ data: [] }),
      include.medications ? this.getMedicationHistory(patientId) : Promise.resolve({ data: [] }),
      include.allergies ? this.getAllergies(patientId) : Promise.resolve({ data: [] }),
      include.immunizations ? this.getImmunizations(patientId) : Promise.resolve({ data: [] }),
      include.clinicalNotes ? this.getClinicalNotes(patientId) : Promise.resolve({ data: [] }),
    ]);

    const records = {
      labResults: labs.data || [],
      medications: meds.data || [],
      allergies: allergies.data || [],
      immunizations: immuns.data || [],
      clinicalNotes: notes.data || [],
      exportDate: new Date().toISOString(),
    };

    if (format === 'json') {
      return JSON.stringify(records, null, 2);
    }

    return this.buildFhirBundle(patientId, records);
  }

  private buildFhirBundle(patientId: string, records: any): string {
    const entries: any[] = [];

    for (const lab of records.labResults) {
      entries.push({
        fullUrl: `urn:uuid:${lab.id}`,
        resource: {
          resourceType: 'Observation',
          id: lab.id,
          meta: { lastUpdated: lab.updated_at || lab.created_at },
          status: 'final',
          category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
          code: { text: lab.test_name, coding: [{ system: 'http://loinc.org', display: lab.test_name }] },
          subject: { reference: `Patient/${patientId}` },
          effectiveDateTime: lab.result_date,
          valueQuantity: { value: parseFloat(lab.result_value) || 0, unit: lab.unit, system: 'http://unitsofmeasure.org' },
          referenceRange: lab.reference_range_low != null ? [{ low: { value: lab.reference_range_low, unit: lab.unit }, high: { value: lab.reference_range_high, unit: lab.unit } }] : undefined,
          interpretation: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: lab.abnormal_flag }] }],
        },
      });
    }

    for (const med of records.medications) {
      entries.push({
        fullUrl: `urn:uuid:${med.id}`,
        resource: {
          resourceType: 'MedicationRequest',
          id: med.id,
          meta: { lastUpdated: med.updated_at || med.created_at },
          status: med.status === 'active' ? 'active' : med.status === 'discontinued' ? 'stopped' : 'completed',
          intent: 'order',
          medicationCodeableConcept: { text: med.medication_name },
          subject: { reference: `Patient/${patientId}` },
          authoredOn: med.start_date,
          dosageInstruction: [{ text: `${med.dosage} - ${med.frequency}`, route: { text: med.route } }],
          note: med.indication ? [{ text: med.indication }] : undefined,
        },
      });
    }

    for (const allergy of records.allergies) {
      entries.push({
        fullUrl: `urn:uuid:${allergy.id}`,
        resource: {
          resourceType: 'AllergyIntolerance',
          id: allergy.id,
          meta: { lastUpdated: allergy.updated_at || allergy.created_at },
          clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: allergy.status }] },
          type: 'allergy',
          category: [allergy.allergen_type === 'medication' ? 'medication' : allergy.allergen_type === 'food' ? 'food' : 'environment'],
          criticality: allergy.severity === 'life-threatening' ? 'high' : allergy.severity === 'severe' ? 'high' : 'low',
          code: { text: allergy.allergen_name },
          patient: { reference: `Patient/${patientId}` },
          onsetDateTime: allergy.date_identified,
          reaction: [{ manifestation: [{ coding: [{ display: allergy.reaction_type }] }], severity: allergy.severity }],
        },
      });
    }

    for (const imm of records.immunizations) {
      entries.push({
        fullUrl: `urn:uuid:${imm.id}`,
        resource: {
          resourceType: 'Immunization',
          id: imm.id,
          meta: { lastUpdated: imm.updated_at || imm.created_at },
          status: 'completed',
          vaccineCode: { text: imm.vaccine_name, coding: imm.vaccine_code ? [{ system: 'http://hl7.org/fhir/sid/cvx', code: imm.vaccine_code }] : undefined },
          patient: { reference: `Patient/${patientId}` },
          occurrenceDateTime: imm.administration_date,
          lotNumber: imm.lot_number,
          performer: [{ actor: { display: imm.administering_provider } }],
          protocolApplied: [{ doseNumberPositiveInt: imm.dose_number, seriesDosesPositiveInt: imm.total_doses }],
        },
      });
    }

    for (const note of records.clinicalNotes) {
      entries.push({
        fullUrl: `urn:uuid:${note.id}`,
        resource: {
          resourceType: 'DocumentReference',
          id: note.id,
          meta: { lastUpdated: note.updated_at || note.created_at },
          status: 'current',
          type: { text: note.note_type.replace('_', ' ') },
          subject: { reference: `Patient/${patientId}` },
          date: note.visit_date,
          author: [{ display: note.provider_name }],
          content: [{ attachment: { contentType: 'text/plain', data: btoa(note.note_content) } }],
          context: { event: note.diagnosis_codes?.map((c: string) => ({ coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: c }] })) },
        },
      });
    }

    const bundle = {
      resourceType: 'Bundle',
      id: `export-${Date.now()}`,
      type: 'collection',
      meta: { lastUpdated: new Date().toISOString() },
      timestamp: new Date().toISOString(),
      total: entries.length,
      entry: entries,
    };

    return JSON.stringify(bundle, null, 2);
  }

  getTestCategories() {
    return [
      'Chemistry',
      'Hematology',
      'Microbiology',
      'Immunology',
      'Pathology',
      'Radiology',
      'Cardiology',
      'Endocrinology',
      'Other',
    ];
  }

  getSeverityColor(severity: string) {
    switch (severity) {
      case 'mild':
        return 'text-yellow-600 bg-yellow-100';
      case 'moderate':
        return 'text-orange-600 bg-orange-100';
      case 'severe':
        return 'text-red-600 bg-red-100';
      case 'life-threatening':
        return 'text-red-800 bg-red-200';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  getAbnormalFlagColor(flag: string) {
    switch (flag) {
      case 'normal':
        return 'text-green-600 bg-green-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }
}

export const healthRecordsService = new HealthRecordsService();
