import { api } from '../lib/api-client';
import { consentService } from './consentService';
import { auditLog } from './auditLogger';

export interface FHIRObservation {
  id?: string;
  patient_id: string;
  provider_id?: string;
  appointment_id?: string;
  observation_code: string;
  observation_display: string;
  category?: string[];
  value_quantity?: number;
  value_unit?: string;
  value_string?: string;
  value_boolean?: boolean;
  components?: any;
  reference_range_low?: number;
  reference_range_high?: number;
  reference_range_text?: string;
  interpretation?: 'normal' | 'abnormal' | 'critical' | 'high' | 'low';
  status?: string;
  effective_datetime?: string;
  notes?: string;
}

export interface FHIRCondition {
  id?: string;
  patient_id: string;
  provider_id?: string;
  appointment_id?: string;
  condition_code: string;
  condition_display: string;
  icd10_code?: string;
  snomed_code?: string;
  clinical_status?: 'active' | 'recurrence' | 'relapse' | 'inactive' | 'remission' | 'resolved';
  verification_status?: 'unconfirmed' | 'provisional' | 'differential' | 'confirmed' | 'refuted';
  category?: string[];
  severity?: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  onset_datetime?: string;
  onset_age?: number;
  abatement_datetime?: string;
  body_site?: string;
  notes?: string;
}

export interface FHIRMedicationRequest {
  id?: string;
  patient_id: string;
  provider_id: string;
  appointment_id?: string;
  medication_code: string;
  medication_display: string;
  din_number?: string;
  dosage_text?: string;
  dosage_quantity?: number;
  dosage_unit?: string;
  frequency?: string;
  route?: string;
  quantity_value?: number;
  quantity_unit?: string;
  supply_duration?: number;
  supply_duration_unit?: string;
  number_of_refills?: number;
  status?: string;
  intent?: string;
  reason_code?: string;
  interactions_checked?: boolean;
  interaction_warnings?: any;
  allergy_warnings?: any;
  notes?: string;
}

export interface FHIRProcedure {
  id?: string;
  patient_id: string;
  provider_id: string;
  appointment_id?: string;
  procedure_code: string;
  procedure_display: string;
  cpt_code?: string;
  snomed_code?: string;
  status?: string;
  category?: string;
  performed_datetime?: string;
  body_site?: string;
  laterality?: 'left' | 'right' | 'bilateral';
  outcome?: string;
  complications?: string[];
  follow_up?: string[];
  report?: string;
  notes?: string;
}

export interface SOAPNote {
  id?: string;
  patient_id: string;
  provider_id: string;
  appointment_id?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  chief_complaint?: string;
  history_present_illness?: string;
  review_of_systems?: any;
  physical_examination?: any;
  diagnoses?: string[];
  orders?: any;
  follow_up_plan?: string;
  follow_up_date?: string;
  status?: 'draft' | 'signed' | 'amended' | 'finalized';
  signed_at?: string;
}

export interface AuditLogEntry {
  resource_type: string;
  resource_id: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'sign' | 'share' | 'export';
  actor_id: string;
  actor_role?: string;
  actor_ip_address?: string;
  data_before?: any;
  data_after?: any;
  reason?: string;
  metadata?: any;
}

export const ehrService = {
  async createObservation(observation: FHIRObservation, actorId: string): Promise<FHIRObservation> {
    if (observation.provider_id) {
      const consent = await consentService.verifyProviderConsent(observation.patient_id, observation.provider_id, 'observations');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const dataHash = await this.generateHash(observation);
    observation.data_hash = dataHash;

    const { data, error } = await api.post<FHIRObservation>('/fhir-observations', observation);

    if (error) throw error;

    await this.createAuditLog({
      resource_type: 'fhir_observation',
      resource_id: data!.id!,
      action: 'create',
      actor_id: actorId,
      data_after: observation,
    });

    await this.storeDataHash('fhir_observation', data!.id!, dataHash);

    return data!;
  },

  async getObservations(patientId: string, category?: string, providerId?: string): Promise<FHIRObservation[]> {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'observations');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const params: Record<string, any> = { patient_id: patientId, order: 'effective_datetime.desc' };
    if (category) {
      params.category = category;
    }

    const { data, error } = await api.get<FHIRObservation[]>('/fhir-observations', { params });
    if (error) throw error;

    if (providerId) {
      try {
        await auditLog.dataAccessed('fhir_observation', patientId, providerId, 'provider', {
          action: 'read', category, records_count: (data || []).length,
        });
      } catch {}
    }

    return data || [];
  },

  async createCondition(condition: FHIRCondition, actorId: string): Promise<FHIRCondition> {
    if (condition.provider_id) {
      const consent = await consentService.verifyProviderConsent(condition.patient_id, condition.provider_id, 'conditions');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const dataHash = await this.generateHash(condition);
    condition.data_hash = dataHash;

    const { data, error } = await api.post<FHIRCondition>('/fhir-conditions', condition);

    if (error) throw error;

    await this.createAuditLog({
      resource_type: 'fhir_condition',
      resource_id: data!.id!,
      action: 'create',
      actor_id: actorId,
      data_after: condition,
    });

    await this.storeDataHash('fhir_condition', data!.id!, dataHash);

    return data!;
  },

  async getConditions(patientId: string, status?: string, providerId?: string): Promise<FHIRCondition[]> {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'conditions');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const params: Record<string, any> = { patient_id: patientId, order: 'recorded_date.desc' };
    if (status) {
      params.clinical_status = status;
    }

    const { data, error } = await api.get<FHIRCondition[]>('/fhir-conditions', { params });
    if (error) throw error;

    if (providerId) {
      try {
        await auditLog.dataAccessed('fhir_condition', patientId, providerId, 'provider', {
          action: 'read', status, records_count: (data || []).length,
        });
      } catch {}
    }

    return data || [];
  },

  async updateConditionStatus(
    conditionId: string,
    status: string,
    actorId: string
  ): Promise<void> {
    const { data: current } = await api.get<any>(`/fhir-conditions/${conditionId}`);

    if (current) {
      const consent = await consentService.verifyProviderConsent(current.patient_id, actorId, 'conditions');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const { error } = await api.put(`/fhir-conditions/${conditionId}`, {
      clinical_status: status,
      updated_at: new Date().toISOString()
    });

    if (error) throw error;

    await this.createAuditLog({
      resource_type: 'fhir_condition',
      resource_id: conditionId,
      action: 'update',
      actor_id: actorId,
      data_before: current,
      data_after: { ...current, clinical_status: status },
      reason: `Status changed to ${status}`,
    });
  },

  async createMedicationRequest(
    medication: FHIRMedicationRequest,
    actorId: string
  ): Promise<FHIRMedicationRequest> {
    if (medication.provider_id) {
      const consent = await consentService.verifyProviderConsent(medication.patient_id, medication.provider_id, 'medications');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    await this.checkDrugInteractions(medication);

    const dataHash = await this.generateHash(medication);
    medication.data_hash = dataHash;

    const { data, error } = await api.post<FHIRMedicationRequest>('/fhir-medication-requests', medication);

    if (error) throw error;

    await this.createAuditLog({
      resource_type: 'fhir_medication_request',
      resource_id: data!.id!,
      action: 'create',
      actor_id: actorId,
      data_after: medication,
    });

    await this.storeDataHash('fhir_medication_request', data!.id!, dataHash);

    return data!;
  },

  async getMedicationRequests(patientId: string, status?: string, providerId?: string): Promise<FHIRMedicationRequest[]> {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'medications');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const params: Record<string, any> = { patient_id: patientId, order: 'authored_on.desc' };
    if (status) {
      params.status = status;
    }

    const { data, error } = await api.get<FHIRMedicationRequest[]>('/fhir-medication-requests', { params });
    if (error) throw error;

    if (providerId) {
      try {
        await auditLog.dataAccessed('fhir_medication_request', patientId, providerId, 'provider', {
          action: 'read', status, records_count: (data || []).length,
        });
      } catch {}
    }

    return data || [];
  },

  async checkDrugInteractions(medication: FHIRMedicationRequest): Promise<void> {
    const currentMeds = await this.getMedicationRequests(medication.patient_id, 'active');

    const { data: allergies } = await api.get<any[]>('/fhir-allergy-intolerances', {
      params: { patient_id: medication.patient_id, clinical_status: 'active' }
    });

    const allergyWarnings: any[] = [];
    allergies?.forEach((allergy) => {
      if (
        medication.medication_display.toLowerCase().includes(allergy.allergen_display.toLowerCase())
      ) {
        allergyWarnings.push({
          allergen: allergy.allergen_display,
          severity: allergy.criticality,
          reaction: allergy.reaction_description,
        });
      }
    });

    medication.allergy_warnings = allergyWarnings.length > 0 ? allergyWarnings : null;
    medication.interactions_checked = true;
  },

  async createProcedure(procedure: FHIRProcedure, actorId: string): Promise<FHIRProcedure> {
    if (procedure.provider_id) {
      const consent = await consentService.verifyProviderConsent(procedure.patient_id, procedure.provider_id, 'procedures');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const dataHash = await this.generateHash(procedure);
    procedure.data_hash = dataHash;

    const { data, error } = await api.post<FHIRProcedure>('/fhir-procedures', procedure);

    if (error) throw error;

    await this.createAuditLog({
      resource_type: 'fhir_procedure',
      resource_id: data!.id!,
      action: 'create',
      actor_id: actorId,
      data_after: procedure,
    });

    await this.storeDataHash('fhir_procedure', data!.id!, dataHash);

    return data!;
  },

  async getProcedures(patientId: string, providerId?: string): Promise<FHIRProcedure[]> {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'procedures');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const { data, error } = await api.get<FHIRProcedure[]>('/fhir-procedures', {
      params: { patient_id: patientId, order: 'performed_datetime.desc' }
    });

    if (error) throw error;

    if (providerId) {
      try {
        await auditLog.dataAccessed('fhir_procedure', patientId, providerId, 'provider', {
          action: 'read', records_count: (data || []).length,
        });
      } catch {}
    }

    return data || [];
  },

  async createSOAPNote(note: SOAPNote, actorId: string): Promise<SOAPNote> {
    if (note.provider_id) {
      const consent = await consentService.verifyProviderConsent(note.patient_id, note.provider_id, 'clinical_notes');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const dataHash = await this.generateHash(note);
    note.data_hash = dataHash;

    const { data, error } = await api.post<SOAPNote>('/soap-notes', note);

    if (error) throw error;

    await this.createAuditLog({
      resource_type: 'soap_note',
      resource_id: data!.id!,
      action: 'create',
      actor_id: actorId,
      data_after: note,
    });

    await this.storeDataHash('soap_note', data!.id!, dataHash);

    return data!;
  },

  async updateSOAPNote(
    noteId: string,
    updates: Partial<SOAPNote>,
    actorId: string
  ): Promise<SOAPNote> {
    const { data: current } = await api.get<any>(`/soap-notes/${noteId}`);

    if (current) {
      const consent = await consentService.verifyProviderConsent(current.patient_id, actorId, 'clinical_notes');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const dataHash = await this.generateHash({ ...current, ...updates });
    updates.data_hash = dataHash;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await api.put<SOAPNote>(`/soap-notes/${noteId}`, updates);

    if (error) throw error;

    await this.createAuditLog({
      resource_type: 'soap_note',
      resource_id: noteId,
      action: 'update',
      actor_id: actorId,
      data_before: current,
      data_after: data,
    });

    await this.storeDataHash('soap_note', noteId, dataHash);

    return data!;
  },

  async signSOAPNote(noteId: string, providerId: string): Promise<void> {
    const { data: note } = await api.get<{ patient_id: string }>(`/soap-notes/${noteId}`);

    if (note) {
      const consent = await consentService.verifyProviderConsent(note.patient_id, providerId, 'clinical_notes');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const signatureData = await this.generateSignature(noteId, providerId);

    await api.put(`/soap-notes/${noteId}`, {
      status: 'signed',
      signed_at: new Date().toISOString(),
      signature_hash: signatureData.hash,
    });

    await api.post('/provider-digital-signatures', {
      provider_id: providerId,
      resource_type: 'soap_note',
      resource_id: noteId,
      signature_data: signatureData.signature,
      attestation_text: 'I attest that this clinical documentation is accurate and complete.',
    });

    await this.createAuditLog({
      resource_type: 'soap_note',
      resource_id: noteId,
      action: 'sign',
      actor_id: providerId,
    });
  },

  async getSOAPNotes(patientId: string, providerId?: string): Promise<SOAPNote[]> {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'clinical_notes');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const { data, error } = await api.get<SOAPNote[]>('/soap-notes', {
      params: { patient_id: patientId, order: 'created_at.desc' }
    });

    if (error) throw error;

    if (providerId) {
      try {
        await auditLog.dataAccessed('soap_note', patientId, providerId, 'provider', {
          action: 'read', records_count: (data || []).length,
        });
      } catch {}
    }

    return data || [];
  },

  async getSOAPNotesByProvider(providerId: string): Promise<SOAPNote[]> {
    const { data, error } = await api.get<SOAPNote[]>('/soap-notes', {
      params: { provider_id: providerId, order: 'created_at.desc' }
    });

    if (error) throw error;

    try {
      await auditLog.dataAccessed('soap_note', 'provider_notes', providerId, 'provider', {
        action: 'read_own_notes', records_count: (data || []).length,
      });
    } catch {}

    return data || [];
  },

  async searchICD10Codes(searchTerm: string, limit: number = 20): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/icd10-codes', {
      params: { search: searchTerm, is_active: true, limit }
    });

    if (error) throw error;
    return data || [];
  },

  async getCommonICD10Codes(): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/icd10-codes', {
      params: { commonly_used: true, is_active: true, limit: 50 }
    });

    if (error) throw error;
    return data || [];
  },

  async searchProcedureCodes(searchTerm: string, codeSystem?: string, limit: number = 20): Promise<any[]> {
    const params: Record<string, any> = { search: searchTerm, is_active: true, limit };
    if (codeSystem) {
      params.code_system = codeSystem;
    }

    const { data, error } = await api.get<any[]>('/procedure-codes', { params });
    if (error) throw error;
    return data || [];
  },

  async generateHash(data: any): Promise<string> {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async generateSignature(resourceId: string, providerId: string): Promise<{ hash: string; signature: string }> {
    const timestamp = new Date().toISOString();
    const dataToSign = `${resourceId}:${providerId}:${timestamp}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const signatureData = `${hash}:${providerId}`;
    const signatureBuffer = encoder.encode(signatureData);
    const signatureHashBuffer = await crypto.subtle.digest('SHA-256', signatureBuffer);
    const signatureArray = Array.from(new Uint8Array(signatureHashBuffer));
    const signature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return { hash, signature };
  },

  async createAuditLog(entry: AuditLogEntry): Promise<void> {
    const dataHash = await this.generateHash({
      ...entry,
      timestamp: new Date().toISOString(),
    });

    const { data: previousEntry } = await api.get<any>('/blockchain-audit-log', {
      params: { order: 'timestamp.desc', limit: 1 }
    });

    const prev = Array.isArray(previousEntry) ? previousEntry[0] : previousEntry;

    await api.post('/blockchain-audit-log', {
      ...entry,
      data_hash: dataHash,
      previous_hash: prev?.data_hash || null,
      block_number: prev ? prev.block_number + 1 : 1,
    });
  },

  async storeDataHash(resourceType: string, resourceId: string, hash: string): Promise<void> {
    await api.post('/clinical-data-hashes', {
      resource_type: resourceType,
      resource_id: resourceId,
      data_hash: hash,
      hash_algorithm: 'SHA-256',
    });
  },

  async getAuditTrail(resourceType: string, resourceId: string): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/blockchain-audit-log', {
      params: { resource_type: resourceType, resource_id: resourceId, order: 'timestamp.desc' }
    });

    if (error) throw error;
    return data || [];
  },

  async verifyDataIntegrity(resourceType: string, resourceId: string): Promise<boolean> {
    const tablePath = this.getUrlPath(resourceType);
    const { data: resource } = await api.get<any>(`/${tablePath}/${resourceId}`);

    if (!resource) return false;

    const { data_hash, ...dataWithoutHash } = resource;
    const calculatedHash = await this.generateHash(dataWithoutHash);

    return calculatedHash === data_hash;
  },

  getTableName(resourceType: string): string {
    const tableMap: Record<string, string> = {
      fhir_observation: 'fhir_observations',
      fhir_condition: 'fhir_conditions',
      fhir_medication_request: 'fhir_medication_requests',
      fhir_procedure: 'fhir_procedures',
      soap_note: 'soap_notes',
    };
    return tableMap[resourceType] || resourceType;
  },

  getUrlPath(resourceType: string): string {
    const pathMap: Record<string, string> = {
      fhir_observation: 'fhir-observations',
      fhir_condition: 'fhir-conditions',
      fhir_medication_request: 'fhir-medication-requests',
      fhir_procedure: 'fhir-procedures',
      soap_note: 'soap-notes',
    };
    return pathMap[resourceType] || resourceType;
  },

  async getTemplates(templateType?: string, specialty?: string): Promise<any[]> {
    const params: Record<string, any> = { is_active: true, order: 'usage_count:desc' };
    if (templateType) {
      params.template_type = templateType;
    }
    if (specialty) {
      params.specialty = specialty;
    }

    const { data, error } = await api.get<any[]>('/clinical-templates', { params });
    if (error) throw error;
    return data || [];
  },

  async createTemplate(template: {
    template_name: string;
    template_type: string;
    specialty?: string;
    description?: string;
    template_structure?: any;
    is_system_template?: boolean;
    created_by?: string;
  }): Promise<any> {
    const { data, error } = await api.post<any>('/clinical-templates', {
      ...template,
      is_active: true,
      usage_count: 0,
    });
    if (error) throw error;
    return data;
  },

  async updateTemplate(templateId: string, updates: Record<string, any>): Promise<any> {
    const { data, error } = await api.put<any>(`/clinical-templates/${templateId}`, updates);
    if (error) throw error;
    return data;
  },

  async deleteTemplate(templateId: string): Promise<void> {
    const { error } = await api.delete(`/clinical-templates/${templateId}`);
    if (error) throw error;
  },

  async incrementTemplateUsage(templateId: string): Promise<void> {
    const { data: template } = await api.get<any>(`/clinical-templates/${templateId}`);

    if (template) {
      await api.put(`/clinical-templates/${templateId}`, {
        usage_count: (template.usage_count || 0) + 1
      });
    }
  },
};
