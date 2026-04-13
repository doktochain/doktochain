import { supabase } from '../lib/supabase';
import { auditLog } from './auditLogger';
import { blockchainAuditService } from './blockchainAuditService';

export interface Medication {
  drug_name: string;
  generic_name?: string;
  brand_name?: string;
  din?: string;
  strength: string;
  form: string;
}

export interface EPrescription {
  id: string;
  prescription_number: string;
  patient_id: string;
  provider_id: string;
  appointment_id?: string;
  medication_name: string;
  medication_generic?: string;
  medication_brand?: string;
  dosage: string;
  frequency: string;
  quantity: number;
  refills: number;
  refills_remaining: number;
  special_instructions?: string;
  side_effects?: string;
  warnings?: string;
  drug_interactions?: any[];
  pharmacy_id?: string;
  status: 'pending' | 'sent' | 'received' | 'filled' | 'picked_up' | 'cancelled';
  prescribed_date: string;
  expiry_date: string;
  digital_signature?: string;
  created_at: string;
  updated_at: string;
}

export interface DrugInteraction {
  severity: 'high' | 'moderate' | 'low';
  description: string;
  drug_a: string;
  drug_b: string;
}

export interface AllergyCheck {
  has_allergy: boolean;
  allergen: string;
  severity: string;
  reaction: string;
}

export const ePrescriptionService = {
  async searchMedications(query: string): Promise<Medication[]> {
    const mockMedications = [
      { drug_name: 'Amoxicillin', generic_name: 'Amoxicillin', strength: '500mg', form: 'Capsule', din: '02240001' },
      { drug_name: 'Lipitor', brand_name: 'Lipitor', generic_name: 'Atorvastatin', strength: '20mg', form: 'Tablet', din: '02240002' },
      { drug_name: 'Metformin', generic_name: 'Metformin', strength: '500mg', form: 'Tablet', din: '02240003' },
      { drug_name: 'Lisinopril', generic_name: 'Lisinopril', strength: '10mg', form: 'Tablet', din: '02240004' },
      { drug_name: 'Levothyroxine', generic_name: 'Levothyroxine', strength: '50mcg', form: 'Tablet', din: '02240005' },
      { drug_name: 'Omeprazole', generic_name: 'Omeprazole', strength: '20mg', form: 'Capsule', din: '02240006' },
      { drug_name: 'Amlodipine', generic_name: 'Amlodipine', strength: '5mg', form: 'Tablet', din: '02240007' },
      { drug_name: 'Metoprolol', generic_name: 'Metoprolol', strength: '50mg', form: 'Tablet', din: '02240008' },
      { drug_name: 'Albuterol', generic_name: 'Salbutamol', strength: '100mcg', form: 'Inhaler', din: '02240009' },
      { drug_name: 'Sertraline', generic_name: 'Sertraline', strength: '50mg', form: 'Tablet', din: '02240010' }
    ];

    return mockMedications.filter(med =>
      med.drug_name.toLowerCase().includes(query.toLowerCase()) ||
      (med.generic_name && med.generic_name.toLowerCase().includes(query.toLowerCase()))
    );
  },

  async checkDrugInteractions(patientId: string, newMedication: string): Promise<DrugInteraction[]> {
    const { data: currentMeds } = await supabase
      .from('patient_medications')
      .select('medication_name')
      .eq('patient_id', patientId)
      .eq('is_active', true);

    const interactions: DrugInteraction[] = [];

    const knownInteractions: { [key: string]: { [key: string]: DrugInteraction } } = {
      'Warfarin': {
        'Aspirin': {
          severity: 'high',
          description: 'Increased bleeding risk when combined',
          drug_a: 'Warfarin',
          drug_b: 'Aspirin'
        }
      },
      'Metformin': {
        'Alcohol': {
          severity: 'moderate',
          description: 'May increase risk of lactic acidosis',
          drug_a: 'Metformin',
          drug_b: 'Alcohol'
        }
      }
    };

    currentMeds?.forEach((med: any) => {
      if (knownInteractions[med.medication_name]?.[newMedication]) {
        interactions.push(knownInteractions[med.medication_name][newMedication]);
      }
      if (knownInteractions[newMedication]?.[med.medication_name]) {
        interactions.push(knownInteractions[newMedication][med.medication_name]);
      }
    });

    return interactions;
  },

  async checkAllergies(patientId: string, medication: string): Promise<AllergyCheck[]> {
    const { data: allergies } = await supabase
      .from('patient_allergies')
      .select('*')
      .eq('patient_id', patientId)
      .eq('allergen_type', 'medication');

    const allergyChecks: AllergyCheck[] = [];

    allergies?.forEach((allergy: any) => {
      if (allergy.allergen.toLowerCase().includes(medication.toLowerCase()) ||
          medication.toLowerCase().includes(allergy.allergen.toLowerCase())) {
        allergyChecks.push({
          has_allergy: true,
          allergen: allergy.allergen,
          severity: allergy.severity,
          reaction: allergy.reaction
        });
      }
    });

    return allergyChecks;
  },

  async createPrescription(providerId: string, data: Partial<EPrescription>): Promise<EPrescription> {
    const prescriptionNumber = `RX${Date.now()}`;
    const prescribedDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const { data: prescription, error } = await supabase
      .from('e_prescriptions')
      .insert({
        prescription_number: prescriptionNumber,
        provider_id: providerId,
        patient_id: data.patient_id,
        appointment_id: data.appointment_id,
        medication_name: data.medication_name,
        medication_generic: data.medication_generic,
        medication_brand: data.medication_brand,
        dosage: data.dosage,
        frequency: data.frequency,
        quantity: data.quantity,
        refills: data.refills,
        refills_remaining: data.refills,
        special_instructions: data.special_instructions,
        side_effects: data.side_effects,
        warnings: data.warnings,
        drug_interactions: data.drug_interactions,
        pharmacy_id: data.pharmacy_id,
        status: 'pending',
        prescribed_date: prescribedDate.toISOString(),
        expiry_date: expiryDate.toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    try {
      await auditLog.prescriptionCreated(prescription.id, providerId, {
        patient_id: data.patient_id,
        medication: data.medication_name,
      });
    } catch {}

    return prescription;
  },

  async sendToPharmacy(prescriptionId: string, pharmacyId: string): Promise<void> {
    const { error } = await supabase
      .from('e_prescriptions')
      .update({
        pharmacy_id: pharmacyId,
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', prescriptionId);

    if (error) throw error;

    await supabase.from('pharmacy_communications').insert({
      prescription_id: prescriptionId,
      pharmacy_id: pharmacyId,
      message_type: 'new_prescription',
      message: 'New prescription sent',
      status: 'sent'
    });

    try {
      await auditLog.prescriptionSentToPharmacy(prescriptionId, pharmacyId, 'provider', {
        pharmacy_id: pharmacyId,
      });
    } catch {}
  },

  async getPrescription(prescriptionId: string): Promise<EPrescription | null> {
    const { data, error } = await supabase
      .from('e_prescriptions')
      .select('*, patients(*, user_profiles(*)), providers(*, user_profiles(*))')
      .eq('id', prescriptionId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getProviderPrescriptions(providerId: string, limit: number = 50): Promise<EPrescription[]> {
    const { data, error } = await supabase
      .from('e_prescriptions')
      .select('*, patients(*, user_profiles(first_name, last_name))')
      .eq('provider_id', providerId)
      .order('prescribed_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getPatientPrescriptions(patientId: string): Promise<EPrescription[]> {
    const { data, error } = await supabase
      .from('e_prescriptions')
      .select('*, providers(*, user_profiles(first_name, last_name))')
      .eq('patient_id', patientId)
      .order('prescribed_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updatePrescriptionStatus(prescriptionId: string, status: EPrescription['status']): Promise<void> {
    const { error } = await supabase
      .from('e_prescriptions')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', prescriptionId);

    if (error) throw error;
  },

  async requestRefillApproval(prescriptionId: string, patientId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('prescription_refill_requests')
      .insert({
        prescription_id: prescriptionId,
        patient_id: patientId,
        request_reason: reason,
        status: 'pending'
      });

    if (error) throw error;
  },

  async approveRefill(prescriptionId: string, providerId: string): Promise<void> {
    const { data: prescription } = await supabase
      .from('e_prescriptions')
      .select('refills_remaining')
      .eq('id', prescriptionId)
      .single();

    if (prescription && prescription.refills_remaining > 0) {
      await supabase
        .from('e_prescriptions')
        .update({
          refills_remaining: prescription.refills_remaining - 1,
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', prescriptionId);
    } else {
      throw new Error('No refills remaining');
    }
  },

  async denyRefill(prescriptionId: string, providerId: string, reason: string): Promise<void> {
    await supabase
      .from('prescription_refill_requests')
      .update({
        status: 'denied',
        denial_reason: reason,
        reviewed_by: providerId,
        reviewed_at: new Date().toISOString()
      })
      .eq('prescription_id', prescriptionId);
  },

  async cancelPrescription(prescriptionId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('e_prescriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', prescriptionId);

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'prescription_cancelled',
        resourceType: 'prescription',
        resourceId: prescriptionId,
        actionData: { reason },
      });
    } catch {}
  },

  async getPharmacyCommunications(prescriptionId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('pharmacy_communications')
      .select('*')
      .eq('prescription_id', prescriptionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};
