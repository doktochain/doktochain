import { api } from '../lib/api-client';
import { fhirResourceFactory } from './fhirResourceFactory';

export interface Patient {
  id: string;
  user_id: string;
  health_card_number?: string;
  health_card_province?: string;
  health_card_expiry?: string;
  blood_type?: string;
  height_cm?: number;
  weight_kg?: number;
  medical_history?: string;
  chronic_conditions?: string[];
  is_minor: boolean;
  profile_completed: boolean;
}

export interface PatientAllergy {
  id: string;
  patient_id: string;
  allergen: string;
  reaction?: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  diagnosed_date?: string;
  notes?: string;
}

export interface PatientMedication {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  prescribing_provider?: string;
  notes?: string;
  is_active: boolean;
}

export interface EmergencyContact {
  id: string;
  patient_id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  is_primary: boolean;
}

export const patientService = {
  async getPatientByUserId(userId: string): Promise<Patient | null> {
    const { data, error } = await api.get<Patient>('/patients', {
      params: { user_id: userId, limit: '1' },
    });

    if (error) throw new Error(error.message);
    return data;
  },

  async createPatient(patientData: Partial<Patient>): Promise<Patient> {
    const { data, error } = await api.post<Patient>('/patients', patientData);

    if (error) throw new Error(error.message);
    return data!;
  },

  async updatePatient(patientId: string, updates: Partial<Patient>): Promise<Patient> {
    const { data, error } = await api.put<Patient>(`/patients/${patientId}`, updates);

    if (error) throw new Error(error.message);
    return data!;
  },

  async getAllergies(patientId: string): Promise<PatientAllergy[]> {
    const { data, error } = await api.get<PatientAllergy[]>('/patient-allergies', {
      params: { patient_id: patientId, order: 'created_at.desc' },
    });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async addAllergy(patientId: string, allergyData: Partial<PatientAllergy>): Promise<PatientAllergy> {
    const { data, error } = await api.post<PatientAllergy>('/patient-allergies', {
      ...allergyData,
      patient_id: patientId,
    });

    if (error) throw new Error(error.message);

    try {
      await fhirResourceFactory.createAllergyIntolerance({
        patientId,
        allergenCode: data!.allergen,
        allergenDisplay: data!.allergen,
        criticality: data!.severity === 'life-threatening' || data!.severity === 'severe' ? 'high' : 'low',
        reactionDescription: data!.reaction || undefined,
        onsetDatetime: data!.diagnosed_date || undefined,
        notes: data!.notes || undefined,
      });
    } catch {}

    return data!;
  },

  async deleteAllergy(allergyId: string): Promise<void> {
    const { error } = await api.delete(`/patient-allergies/${allergyId}`);

    if (error) throw new Error(error.message);
  },

  async getCurrentMedications(patientId: string): Promise<PatientMedication[]> {
    const { data, error } = await api.get<PatientMedication[]>(`/patients/${patientId}/medications`, {
      params: { active: 'true' },
    });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async addMedication(patientId: string, medicationData: Partial<PatientMedication>): Promise<PatientMedication> {
    const { data, error } = await api.post<PatientMedication>(`/patients/${patientId}/medications`, {
      ...medicationData,
      is_active: true,
    });
    if (error) throw new Error(error.message);
    return data!;
  },

  async updateMedication(medicationId: string, updates: Partial<PatientMedication>): Promise<PatientMedication> {
    const { data, error } = await api.put<PatientMedication>(`/patient-medications/${medicationId}`, updates);
    if (error) throw new Error(error.message);
    return data!;
  },

  async getEmergencyContacts(patientId: string): Promise<EmergencyContact[]> {
    const { data, error } = await api.get<EmergencyContact[]>('/emergency-contacts', {
      params: { patient_id: patientId, order: 'is_primary.desc' },
    });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async addEmergencyContact(patientId: string, contactData: Partial<EmergencyContact>): Promise<EmergencyContact> {
    const { data, error } = await api.post<EmergencyContact>('/emergency-contacts', {
      ...contactData,
      patient_id: patientId,
    });

    if (error) throw new Error(error.message);
    return data!;
  },

  async updateEmergencyContact(contactId: string, updates: Partial<EmergencyContact>): Promise<EmergencyContact> {
    const { data, error } = await api.put<EmergencyContact>(`/emergency-contacts/${contactId}`, updates);

    if (error) throw new Error(error.message);
    return data!;
  },

  async deleteEmergencyContact(contactId: string): Promise<void> {
    const { error } = await api.delete(`/emergency-contacts/${contactId}`);

    if (error) throw new Error(error.message);
  },
};
