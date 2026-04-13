import { supabase } from '../lib/supabase';
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
  // Get patient by user ID
  async getPatientByUserId(userId: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Create patient profile
  async createPatient(patientData: Partial<Patient>): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .insert(patientData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update patient
  async updatePatient(patientId: string, updates: Partial<Patient>): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', patientId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get patient allergies
  async getAllergies(patientId: string): Promise<PatientAllergy[]> {
    const { data, error } = await supabase
      .from('patient_allergies')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add allergy
  async addAllergy(patientId: string, allergyData: Partial<PatientAllergy>): Promise<PatientAllergy> {
    const { data, error } = await supabase
      .from('patient_allergies')
      .insert({ ...allergyData, patient_id: patientId })
      .select()
      .single();

    if (error) throw error;

    try {
      await fhirResourceFactory.createAllergyIntolerance({
        patientId,
        allergenCode: data.allergen,
        allergenDisplay: data.allergen,
        criticality: data.severity === 'life-threatening' || data.severity === 'severe' ? 'high' : 'low',
        reactionDescription: data.reaction || undefined,
        onsetDatetime: data.diagnosed_date || undefined,
        notes: data.notes || undefined,
      });
    } catch {}

    return data;
  },

  // Delete allergy
  async deleteAllergy(allergyId: string): Promise<void> {
    const { error } = await supabase
      .from('patient_allergies')
      .delete()
      .eq('id', allergyId);

    if (error) throw error;
  },

  // Get current medications
  async getCurrentMedications(patientId: string): Promise<PatientMedication[]> {
    const { data, error } = await supabase
      .from('patient_medications')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add medication
  async addMedication(patientId: string, medicationData: Partial<PatientMedication>): Promise<PatientMedication> {
    const { data, error } = await supabase
      .from('patient_medications')
      .insert({ ...medicationData, patient_id: patientId, is_active: true })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update medication
  async updateMedication(medicationId: string, updates: Partial<PatientMedication>): Promise<PatientMedication> {
    const { data, error } = await supabase
      .from('patient_medications')
      .update(updates)
      .eq('id', medicationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get emergency contacts
  async getEmergencyContacts(patientId: string): Promise<EmergencyContact[]> {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('patient_id', patientId)
      .order('is_primary', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add emergency contact
  async addEmergencyContact(patientId: string, contactData: Partial<EmergencyContact>): Promise<EmergencyContact> {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert({ ...contactData, patient_id: patientId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update emergency contact
  async updateEmergencyContact(contactId: string, updates: Partial<EmergencyContact>): Promise<EmergencyContact> {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .update(updates)
      .eq('id', contactId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete emergency contact
  async deleteEmergencyContact(contactId: string): Promise<void> {
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId);

    if (error) throw error;
  },
};
