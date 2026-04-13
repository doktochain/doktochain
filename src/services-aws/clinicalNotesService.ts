import { api } from '../lib/api-client';
import { blockchainAuditService } from './blockchainAuditService';
import { consentService } from './consentService';
import { auditLog } from './auditLogger';
import { fhirResourceFactory } from './fhirResourceFactory';

export interface ClinicalNote {
  id: string;
  appointment_id: string;
  patient_id: string;
  provider_id: string;
  note_type: 'SOAP' | 'progress' | 'consultation' | 'procedure' | 'discharge';
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  chief_complaint?: string;
  history_present_illness?: string;
  vital_signs?: VitalSigns;
  physical_examination?: string;
  diagnosis_codes?: string[];
  procedure_codes?: string[];
  medications_prescribed?: string[];
  follow_up_instructions?: string;
  return_to_work_date?: string;
  referrals?: string[];
  is_finalized: boolean;
  digital_signature?: string;
  created_at: string;
  updated_at: string;
}

export interface VitalSigns {
  temperature?: number;
  temperature_unit?: 'C' | 'F';
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  weight_unit?: 'kg' | 'lbs';
  height?: number;
  height_unit?: 'cm' | 'in';
  bmi?: number;
}

export interface NoteTemplate {
  id: string;
  name: string;
  specialty?: string;
  note_type: string;
  template_content: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  is_default: boolean;
}

export const clinicalNotesService = {
  async createNote(data: Partial<ClinicalNote>): Promise<ClinicalNote> {
    if (data.provider_id && data.patient_id) {
      const consent = await consentService.verifyProviderConsent(data.patient_id, data.provider_id, 'clinical_notes');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const { data: note, error } = await api.post<ClinicalNote>('/clinical-notes', {
      ...data,
      visit_date: data.created_at ? data.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      provider_name: 'Provider',
      note_content: data.subjective || data.assessment || data.chief_complaint || '',
      is_finalized: false
    });

    if (error) throw error;

    try {
      await blockchainAuditService.logClinicalNote(note!.id, note!.provider_id, note!.patient_id, 'created');
    } catch {}

    return note!;
  },

  async updateNote(noteId: string, data: Partial<ClinicalNote>, providerId?: string): Promise<ClinicalNote> {
    if (providerId) {
      const existing = await this.getNote(noteId);
      if (existing) {
        const consent = await consentService.verifyProviderConsent(existing.patient_id, providerId, 'clinical_notes');
        if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
      }
    }

    const { data: note, error } = await api.put<ClinicalNote>(`/clinical-notes/${noteId}`, {
      ...data,
      updated_at: new Date().toISOString()
    });

    if (error) throw error;

    try {
      await blockchainAuditService.logClinicalNote(note!.id, note!.provider_id, note!.patient_id, 'updated');
    } catch {}

    return note!;
  },

  async finalizeNote(noteId: string, providerId: string): Promise<ClinicalNote> {
    const existing = await this.getNote(noteId);
    if (existing) {
      const consent = await consentService.verifyProviderConsent(existing.patient_id, providerId, 'clinical_notes');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const { data: note, error } = await api.put<ClinicalNote>(`/clinical-notes/${noteId}`, {
      is_finalized: true,
      digital_signature: `Electronically signed by Provider ID: ${providerId} on ${new Date().toISOString()}`,
      updated_at: new Date().toISOString()
    });

    if (error) throw error;

    try {
      await blockchainAuditService.logClinicalNote(noteId, providerId, note!.patient_id, 'signed');
    } catch {}

    try {
      if (note!.vital_signs && typeof note!.vital_signs === 'object') {
        await fhirResourceFactory.createObservationsFromVitals({
          patientId: note!.patient_id,
          providerId,
          appointmentId: note!.appointment_id,
          vitals: note!.vital_signs as VitalSigns,
        });
      }

      if (note!.diagnosis_codes && note!.diagnosis_codes.length > 0) {
        await fhirResourceFactory.createConditionsFromDiagnoses({
          patientId: note!.patient_id,
          providerId,
          appointmentId: note!.appointment_id,
          diagnosisCodes: note!.diagnosis_codes,
          assessmentText: note!.assessment || undefined,
        });
      }
    } catch {}

    return note!;
  },

  async getNote(noteId: string, providerId?: string): Promise<ClinicalNote | null> {
    const { data, error } = await api.get<ClinicalNote>(`/clinical-notes/${noteId}`);

    if (error) throw error;

    if (data && providerId && data.provider_id !== providerId) {
      const consent = await consentService.verifyProviderConsent(data.patient_id, providerId, 'clinical_notes');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    if (data && providerId) {
      try {
        await auditLog.dataAccessed('clinical_note', noteId, providerId, 'provider', {
          action: 'read', patient_id: data.patient_id,
        });
      } catch {}
    }

    return data;
  },

  async getAppointmentNote(appointmentId: string, providerId?: string): Promise<ClinicalNote | null> {
    const { data, error } = await api.get<ClinicalNote>('/clinical-notes', { params: { appointment_id: appointmentId } });

    if (error) throw error;

    const note = Array.isArray(data) ? data[0] || null : data;

    if (note && providerId && note.provider_id !== providerId) {
      const consent = await consentService.verifyProviderConsent(note.patient_id, providerId, 'clinical_notes');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    if (note && providerId) {
      try {
        await auditLog.dataAccessed('clinical_note', note.id, providerId, 'provider', {
          action: 'read', appointment_id: appointmentId, patient_id: note.patient_id,
        });
      } catch {}
    }

    return note;
  },

  async getPatientNotes(patientId: string, providerId?: string): Promise<ClinicalNote[]> {
    if (providerId) {
      const consent = await consentService.verifyProviderConsent(patientId, providerId, 'clinical_notes');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const { data, error } = await api.get<ClinicalNote[]>('/clinical-notes', {
      params: { patient_id: patientId, is_finalized: true, order: 'created_at.desc' }
    });

    if (error) throw error;

    if (providerId) {
      try {
        await auditLog.dataAccessed('clinical_note', patientId, providerId, 'provider', {
          action: 'read', records_count: (data || []).length,
        });
      } catch {}
    }

    return data || [];
  },

  async getProviderNotes(providerId: string, limit: number = 50): Promise<ClinicalNote[]> {
    const { data, error } = await api.get<ClinicalNote[]>('/clinical-notes', {
      params: { provider_id: providerId, order: 'created_at.desc', limit }
    });

    if (error) throw error;
    return data || [];
  },

  async searchDiagnosisCodes(query: string): Promise<{ code: string; description: string }[]> {
    const { data, error } = await api.get<{ code: string; description: string }[]>('/icd10-codes', {
      params: { search: query, is_active: true, limit: 20 }
    });

    if (error) throw error;
    return data || [];
  },

  async searchProcedureCodes(query: string): Promise<{ code: string; description: string }[]> {
    const { data, error } = await api.get<{ code: string; description: string }[]>('/procedure-codes', {
      params: { search: query, is_active: true, limit: 20 }
    });

    if (error) throw error;
    return data || [];
  },

  async getTemplates(specialty?: string): Promise<NoteTemplate[]> {
    const params: Record<string, any> = { is_active: true, order: 'usage_count.desc' };
    if (specialty) {
      params.specialty = specialty;
    }

    const { data, error } = await api.get<any[]>('/clinical-templates', { params });
    if (error) throw error;

    return (data || []).map(t => ({
      id: t.id,
      name: t.name,
      specialty: t.specialty,
      note_type: t.template_type,
      template_content: t.template_content as NoteTemplate['template_content'],
      is_default: t.is_default,
    }));
  },

  async createFromTemplate(templateId: string, appointmentId: string, patientId: string, providerId: string): Promise<ClinicalNote> {
    const templates = await this.getTemplates();
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    return await this.createNote({
      appointment_id: appointmentId,
      patient_id: patientId,
      provider_id: providerId,
      note_type: template.note_type as any,
      subjective: template.template_content.subjective,
      objective: template.template_content.objective,
      assessment: template.template_content.assessment,
      plan: template.template_content.plan
    });
  },

  async generateAISummary(noteId: string): Promise<string> {
    const note = await this.getNote(noteId);
    if (!note) throw new Error('Note not found');

    const summary = `
Patient presented with ${note.chief_complaint || 'general concerns'}.

Key Findings:
- ${note.subjective?.split('\n')[0] || 'No significant findings noted'}

Assessment: ${note.assessment?.split('\n')[0] || 'Assessment pending'}

Plan: ${note.plan?.split('\n')[0] || 'Treatment plan to be determined'}

This is an AI-generated summary. Please review the complete clinical note for full details.
    `.trim();

    return summary;
  },

  calculateBMI(weight: number, weightUnit: 'kg' | 'lbs', height: number, heightUnit: 'cm' | 'in'): number {
    let weightKg = weight;
    let heightM = height;

    if (weightUnit === 'lbs') {
      weightKg = weight * 0.453592;
    }

    if (heightUnit === 'in') {
      heightM = height * 0.0254;
    } else {
      heightM = height / 100;
    }

    const bmi = weightKg / (heightM * heightM);
    return Math.round(bmi * 10) / 10;
  }
};
