import { supabase } from '../lib/supabase';
import { blockchainAuditService } from './blockchainAuditService';
import { consentService } from './consentService';
import { notificationService } from './notificationService';

export interface PrescriptionValidation {
  id: string;
  prescription_id: string;
  pharmacy_id: string;
  validated_by: string;
  validation_type: 'drug-interaction' | 'allergy-check' | 'dosage-validation' | 'duplicate-therapy' | 'insurance-formulary';
  validation_status: 'passed' | 'warning' | 'failed';
  validation_details?: any;
  flags?: any[];
  resolution_notes?: string;
}

export interface PrescriptionRejection {
  id: string;
  prescription_id: string;
  pharmacy_id: string;
  rejected_by: string;
  rejection_reason: string;
  detailed_notes: string;
  alternative_suggestions?: any;
  resolution_status: 'pending' | 'resolved' | 'cancelled';
}

export const pharmacyPrescriptionService = {
  async getPrescriptionQueue(pharmacyId: string, status?: string) {
    let query = supabase
      .from('prescriptions')
      .select('*, patients(*, user_profiles(*)), providers(*), prescription_items(*)')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const prescriptions = data || [];
    const verified: typeof prescriptions = [];
    for (const rx of prescriptions) {
      if (rx.patient_id) {
        const consent = await consentService.verifyPharmacyConsent(rx.patient_id, pharmacyId, 'prescription');
        if (consent.hasConsent) {
          verified.push(rx);
        }
      }
    }
    return verified;
  },

  async getPrescriptionById(prescriptionId: string) {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*, patients(*, user_profiles(*)), providers(*), prescription_items(*), pharmacy_communications(*)')
      .eq('id', prescriptionId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async validatePrescription(data: Partial<PrescriptionValidation>) {
    const { data: validation, error } = await supabase
      .from('prescription_validations')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return validation;
  },

  async getValidations(prescriptionId: string) {
    const { data, error } = await supabase
      .from('prescription_validations')
      .select('*, pharmacy_staff(*, user_profiles(*))')
      .eq('prescription_id', prescriptionId)
      .order('validated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async approvePrescription(prescriptionId: string, pharmacyId: string, staffId: string) {
    const { data, error } = await supabase
      .from('prescriptions')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: staffId,
      })
      .eq('id', prescriptionId)
      .select()
      .single();

    if (error) throw error;

    await this.logPrescriptionAction(prescriptionId, pharmacyId, staffId, 'approved', {
      timestamp: new Date().toISOString(),
    });

    try {
      await blockchainAuditService.logEvent({
        eventType: 'prescription_approved',
        resourceType: 'prescription',
        resourceId: prescriptionId,
        actorId: pharmacyId,
        actorRole: 'pharmacy',
        actionData: { staff_id: staffId, pharmacy_id: pharmacyId, action: 'approved' },
      });
    } catch {}

    try {
      if (data?.patient_id) {
        const { data: patientUser } = await supabase
          .from('patients')
          .select('user_id')
          .eq('id', data.patient_id)
          .maybeSingle();

        if (patientUser?.user_id) {
          await notificationService.createNotification({
            userId: patientUser.user_id,
            type: 'prescription_ready',
            category: 'prescription',
            priority: 'normal',
            title: 'Prescription Approved',
            message: 'Your prescription has been approved by the pharmacy and is being prepared.',
            actionUrl: '/dashboard/patient/prescriptions',
            actionLabel: 'View Status',
            relatedEntityType: 'prescription',
            relatedEntityId: prescriptionId,
          });
        }
      }
    } catch {}

    return data;
  },

  async rejectPrescription(data: Partial<PrescriptionRejection>) {
    const { data: rejection, error } = await supabase
      .from('prescription_rejections')
      .insert(data)
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('prescriptions')
      .update({ status: 'rejected' })
      .eq('id', data.prescription_id);

    if (data.pharmacy_id && data.rejected_by) {
      await this.logPrescriptionAction(
        data.prescription_id!,
        data.pharmacy_id,
        data.rejected_by,
        'rejected',
        { reason: data.rejection_reason }
      );

      try {
        await blockchainAuditService.logEvent({
          eventType: 'prescription_rejected',
          resourceType: 'prescription',
          resourceId: data.prescription_id!,
          actorId: data.pharmacy_id,
          actorRole: 'pharmacy',
          actionData: { staff_id: data.rejected_by, reason: data.rejection_reason, action: 'rejected' },
        });
      } catch {}
    }

    return rejection;
  },

  async getRejections(pharmacyId: string) {
    const { data, error } = await supabase
      .from('prescription_rejections')
      .select('*, prescriptions(*, patients(*, user_profiles(*))), pharmacy_staff(*, user_profiles(*))')
      .eq('pharmacy_id', pharmacyId)
      .order('rejected_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async logPrescriptionAction(
    prescriptionId: string,
    pharmacyId: string,
    staffId: string,
    action: string,
    actionDetails?: any
  ) {
    const { data, error } = await supabase
      .from('prescription_audit_log')
      .insert({
        prescription_id: prescriptionId,
        pharmacy_id: pharmacyId,
        staff_id: staffId,
        action,
        action_details: actionDetails,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAuditLog(prescriptionId: string) {
    const { data, error } = await supabase
      .from('prescription_audit_log')
      .select('*, pharmacy_staff(*, user_profiles(*))')
      .eq('prescription_id', prescriptionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async sendProviderMessage(prescriptionId: string, pharmacyId: string, message: string) {
    const { data, error } = await supabase
      .from('pharmacy_communications')
      .insert({
        prescription_id: prescriptionId,
        pharmacy_id: pharmacyId,
        message,
        communication_type: 'pharmacy-to-provider',
        status: 'sent',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCommunications(prescriptionId: string) {
    const { data, error } = await supabase
      .from('pharmacy_communications')
      .select('*')
      .eq('prescription_id', prescriptionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async checkDrugInteractions(medications: string[]) {
    return {
      hasInteractions: false,
      interactions: [],
      severity: 'none',
    };
  },

  async checkInsuranceFormulary(dinNumber: string, insuranceProvider: string, insurancePlan: string) {
    const { data, error } = await supabase
      .from('insurance_formularies')
      .select('*')
      .eq('din_number', dinNumber)
      .eq('insurance_provider', insuranceProvider)
      .eq('insurance_plan_name', insurancePlan)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getPrescriptionsForPharmacy(pharmacyId: string, status?: string) {
    let query = supabase
      .from('prescription_pharmacies')
      .select(`
        *,
        prescriptions (
          *,
          patient:patient_id (
            id,
            user_id,
            user_profiles:user_id (
              first_name,
              last_name,
              email,
              phone
            )
          ),
          provider:provider_id (
            id,
            user_id,
            user_profiles:user_id (
              first_name,
              last_name,
              email
            )
          )
        )
      `)
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    let prescriptions = (data || []).map(item => item.prescriptions).filter(Boolean);

    if (status && status !== 'all') {
      prescriptions = prescriptions.filter((p: any) => p.status === status);
    }

    return prescriptions;
  },

  async getPendingPrescriptions(pharmacyId: string) {
    const { data, error } = await supabase
      .from('prescription_pharmacies')
      .select(`
        *,
        prescriptions!inner (
          *,
          patient:patient_id (
            id,
            user_id,
            user_profiles:user_id (
              first_name,
              last_name,
              email,
              phone
            )
          ),
          provider:provider_id (
            id,
            user_id,
            user_profiles:user_id (
              first_name,
              last_name,
              email
            )
          )
        )
      `)
      .eq('pharmacy_id', pharmacyId)
      .eq('transmission_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(item => item.prescriptions).filter(Boolean);
  },

  async updatePrescriptionStatus(prescriptionId: string, status: string) {
    const { data, error } = await supabase
      .from('prescriptions')
      .update({ status })
      .eq('id', prescriptionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getRefillRequests(pharmacyId: string) {
    const { data, error } = await supabase
      .from('prescription_refill_requests')
      .select(`
        *,
        prescriptions:prescription_id (
          *,
          patient:patient_id (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        )
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) throw error;

    // Filter for this pharmacy through prescription_pharmacies
    if (!data) return [];

    const prescriptionIds = data.map(r => r.prescription_id).filter(Boolean);
    if (prescriptionIds.length === 0) return [];

    const { data: pharmacyPrescriptions } = await supabase
      .from('prescription_pharmacies')
      .select('prescription_id')
      .eq('pharmacy_id', pharmacyId)
      .in('prescription_id', prescriptionIds);

    const validPrescriptionIds = new Set(
      (pharmacyPrescriptions || []).map(p => p.prescription_id)
    );

    return data.filter(request =>
      validPrescriptionIds.has(request.prescription_id)
    );
  },

  async approveRefill(refillRequestId: string, pharmacyId: string, staffId: string) {
    const { data, error } = await supabase
      .from('prescription_refill_requests')
      .update({
        status: 'approved',
        approved_by: staffId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', refillRequestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async denyRefill(refillRequestId: string, reason: string) {
    const { data, error } = await supabase
      .from('prescription_refill_requests')
      .update({
        status: 'denied',
        denial_reason: reason,
      })
      .eq('id', refillRequestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
