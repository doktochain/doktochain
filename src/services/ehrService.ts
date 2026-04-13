import { supabase } from '../lib/supabase';
import { consentService } from './consentService';
import { auditLog } from './auditLogger';

// FHIR Observation
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

// FHIR Condition
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

// FHIR Medication Request
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

// FHIR Procedure
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

// SOAP Note
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

// Blockchain Audit Log Entry
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
  // =====================================================
  // FHIR OBSERVATIONS
  // =====================================================

  async createObservation(observation: FHIRObservation, actorId: string): Promise<FHIRObservation> {
    if (observation.provider_id) {
      const consent = await consentService.verifyProviderConsent(observation.patient_id, observation.provider_id, 'observations');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const dataHash = await this.generateHash(observation);
    observation.data_hash = dataHash;

    const { data, error } = await supabase
      .from('fhir_observations')
      .insert(observation)
      .select()
      .single();

    if (error) throw error;

    // Create audit log
    await this.createAuditLog({
      resource_type: 'fhir_observation',
      resource_id: data.id,
      action: 'create',
      actor_id: actorId,
      data_after: observation,
    });

    // Store hash
    await this.storeDataHash('fhir_observation', data.id, dataHash);

    return data;
  },

  async getObservations(patientId: string, category?: string, providerId?: string): Promise<FHIRObservation[]> {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'observations');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    let query = supabase
      .from('fhir_observations')
      .select('*')
      .eq('patient_id', patientId)
      .order('effective_datetime', { ascending: false });

    if (category) {
      query = query.contains('category', [category]);
    }

    const { data, error } = await query;
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

  // =====================================================
  // FHIR CONDITIONS
  // =====================================================

  async createCondition(condition: FHIRCondition, actorId: string): Promise<FHIRCondition> {
    if (condition.provider_id) {
      const consent = await consentService.verifyProviderConsent(condition.patient_id, condition.provider_id, 'conditions');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const dataHash = await this.generateHash(condition);
    condition.data_hash = dataHash;

    const { data, error } = await supabase
      .from('fhir_conditions')
      .insert(condition)
      .select()
      .single();

    if (error) throw error;

    await this.createAuditLog({
      resource_type: 'fhir_condition',
      resource_id: data.id,
      action: 'create',
      actor_id: actorId,
      data_after: condition,
    });

    await this.storeDataHash('fhir_condition', data.id, dataHash);

    return data;
  },

  async getConditions(patientId: string, status?: string, providerId?: string): Promise<FHIRCondition[]> {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'conditions');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    let query = supabase
      .from('fhir_conditions')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_date', { ascending: false });

    if (status) {
      query = query.eq('clinical_status', status);
    }

    const { data, error } = await query;
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
    const { data: current } = await supabase
      .from('fhir_conditions')
      .select('*')
      .eq('id', conditionId)
      .single();

    if (current) {
      const consent = await consentService.verifyProviderConsent(current.patient_id, actorId, 'conditions');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const { error } = await supabase
      .from('fhir_conditions')
      .update({ clinical_status: status, updated_at: new Date().toISOString() })
      .eq('id', conditionId);

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

  // =====================================================
  // FHIR MEDICATION REQUESTS
  // =====================================================

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

    const { data, error } = await supabase
      .from('fhir_medication_requests')
      .insert(medication)
      .select()
      .single();

    if (error) throw error;

    await this.createAuditLog({
      resource_type: 'fhir_medication_request',
      resource_id: data.id,
      action: 'create',
      actor_id: actorId,
      data_after: medication,
    });

    await this.storeDataHash('fhir_medication_request', data.id, dataHash);

    return data;
  },

  async getMedicationRequests(patientId: string, status?: string, providerId?: string): Promise<FHIRMedicationRequest[]> {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'medications');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    let query = supabase
      .from('fhir_medication_requests')
      .select('*')
      .eq('patient_id', patientId)
      .order('authored_on', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
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
    // Get patient's current medications
    const currentMeds = await this.getMedicationRequests(medication.patient_id, 'active');

    // Get patient's allergies
    const { data: allergies } = await supabase
      .from('fhir_allergy_intolerances')
      .select('*')
      .eq('patient_id', medication.patient_id)
      .eq('clinical_status', 'active');

    // Check for allergy contraindications
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

  // =====================================================
  // FHIR PROCEDURES
  // =====================================================

  async createProcedure(procedure: FHIRProcedure, actorId: string): Promise<FHIRProcedure> {
    if (procedure.provider_id) {
      const consent = await consentService.verifyProviderConsent(procedure.patient_id, procedure.provider_id, 'procedures');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const dataHash = await this.generateHash(procedure);
    procedure.data_hash = dataHash;

    const { data, error } = await supabase
      .from('fhir_procedures')
      .insert(procedure)
      .select()
      .single();

    if (error) throw error;

    await this.createAuditLog({
      resource_type: 'fhir_procedure',
      resource_id: data.id,
      action: 'create',
      actor_id: actorId,
      data_after: procedure,
    });

    await this.storeDataHash('fhir_procedure', data.id, dataHash);

    return data;
  },

  async getProcedures(patientId: string, providerId?: string): Promise<FHIRProcedure[]> {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'procedures');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const { data, error } = await supabase
      .from('fhir_procedures')
      .select('*')
      .eq('patient_id', patientId)
      .order('performed_datetime', { ascending: false });

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

  // =====================================================
  // SOAP NOTES
  // =====================================================

  async createSOAPNote(note: SOAPNote, actorId: string): Promise<SOAPNote> {
    if (note.provider_id) {
      const consent = await consentService.verifyProviderConsent(note.patient_id, note.provider_id, 'clinical_notes');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const dataHash = await this.generateHash(note);
    note.data_hash = dataHash;

    const { data, error } = await supabase
      .from('soap_notes')
      .insert(note)
      .select()
      .single();

    if (error) throw error;

    await this.createAuditLog({
      resource_type: 'soap_note',
      resource_id: data.id,
      action: 'create',
      actor_id: actorId,
      data_after: note,
    });

    await this.storeDataHash('soap_note', data.id, dataHash);

    return data;
  },

  async updateSOAPNote(
    noteId: string,
    updates: Partial<SOAPNote>,
    actorId: string
  ): Promise<SOAPNote> {
    const { data: current } = await supabase
      .from('soap_notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (current) {
      const consent = await consentService.verifyProviderConsent(current.patient_id, actorId, 'clinical_notes');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const dataHash = await this.generateHash({ ...current, ...updates });
    updates.data_hash = dataHash;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('soap_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

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

    return data;
  },

  async signSOAPNote(noteId: string, providerId: string): Promise<void> {
    const { data: note } = await supabase
      .from('soap_notes')
      .select('patient_id')
      .eq('id', noteId)
      .maybeSingle();

    if (note) {
      const consent = await consentService.verifyProviderConsent(note.patient_id, providerId, 'clinical_notes');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const signatureData = await this.generateSignature(noteId, providerId);

    await supabase
      .from('soap_notes')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
        signature_hash: signatureData.hash,
      })
      .eq('id', noteId);

    // Store digital signature
    await supabase.from('provider_digital_signatures').insert({
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

    const { data, error } = await supabase
      .from('soap_notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

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
    const { data, error } = await supabase
      .from('soap_notes')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    try {
      await auditLog.dataAccessed('soap_note', 'provider_notes', providerId, 'provider', {
        action: 'read_own_notes', records_count: (data || []).length,
      });
    } catch {}

    return data || [];
  },

  // =====================================================
  // ICD-10 CODE LOOKUP
  // =====================================================

  async searchICD10Codes(searchTerm: string, limit: number = 20): Promise<any[]> {
    const { data, error } = await supabase
      .from('icd10_codes')
      .select('*')
      .or(`code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .eq('is_active', true)
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getCommonICD10Codes(): Promise<any[]> {
    const { data, error } = await supabase
      .from('icd10_codes')
      .select('*')
      .eq('commonly_used', true)
      .eq('is_active', true)
      .limit(50);

    if (error) throw error;
    return data || [];
  },

  // =====================================================
  // PROCEDURE CODE LOOKUP
  // =====================================================

  async searchProcedureCodes(searchTerm: string, codeSystem?: string, limit: number = 20): Promise<any[]> {
    let query = supabase
      .from('procedure_codes')
      .select('*')
      .or(`code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .eq('is_active', true)
      .limit(limit);

    if (codeSystem) {
      query = query.eq('code_system', codeSystem);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // =====================================================
  // BLOCKCHAIN & AUDIT
  // =====================================================

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

    // Get previous hash for blockchain chain
    const { data: previousEntry } = await supabase
      .from('blockchain_audit_log')
      .select('data_hash, block_number')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    await supabase.from('blockchain_audit_log').insert({
      ...entry,
      data_hash: dataHash,
      previous_hash: previousEntry?.data_hash || null,
      block_number: previousEntry ? previousEntry.block_number + 1 : 1,
    });
  },

  async storeDataHash(resourceType: string, resourceId: string, hash: string): Promise<void> {
    await supabase.from('clinical_data_hashes').insert({
      resource_type: resourceType,
      resource_id: resourceId,
      data_hash: hash,
      hash_algorithm: 'SHA-256',
    });
  },

  async getAuditTrail(resourceType: string, resourceId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('blockchain_audit_log')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async verifyDataIntegrity(resourceType: string, resourceId: string): Promise<boolean> {
    // Get current resource data
    const { data: resource } = await supabase
      .from(this.getTableName(resourceType))
      .select('*, data_hash')
      .eq('id', resourceId)
      .single();

    if (!resource) return false;

    // Recalculate hash
    const { data_hash, ...dataWithoutHash } = resource;
    const calculatedHash = await this.generateHash(dataWithoutHash);

    // Compare with stored hash
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

  // =====================================================
  // CLINICAL TEMPLATES
  // =====================================================

  async getTemplates(templateType?: string, specialty?: string): Promise<any[]> {
    let query = supabase
      .from('clinical_templates')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false });

    if (templateType) {
      query = query.eq('template_type', templateType);
    }

    if (specialty) {
      query = query.eq('specialty', specialty);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async incrementTemplateUsage(templateId: string): Promise<void> {
    const { data: template } = await supabase
      .from('clinical_templates')
      .select('usage_count')
      .eq('id', templateId)
      .single();

    if (template) {
      await supabase
        .from('clinical_templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', templateId);
    }
  },
};
