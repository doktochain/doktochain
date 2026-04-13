import { api } from '../lib/api-client';
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
    const params: Record<string, any> = {
      pharmacy_id: pharmacyId,
      include: 'patients,patients.user_profiles,providers,prescription_items',
      order_by: 'created_at:desc',
    };

    if (status) {
      params.status = status;
    }

    const { data, error } = await api.get<any[]>('/prescriptions', { params });
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
    const { data, error } = await api.get<any>(`/prescriptions/${prescriptionId}`, {
      params: {
        include: 'patients,patients.user_profiles,providers,prescription_items,pharmacy_communications',
      },
    });

    if (error) throw error;
    return data;
  },

  async validatePrescription(data: Partial<PrescriptionValidation>) {
    const { data: validation, error } = await api.post<any>('/prescription-validations', data);

    if (error) throw error;
    return validation;
  },

  async getValidations(prescriptionId: string) {
    const { data, error } = await api.get<any[]>('/prescription-validations', {
      params: {
        prescription_id: prescriptionId,
        include: 'pharmacy_staff,pharmacy_staff.user_profiles',
        order_by: 'validated_at:desc',
      },
    });

    if (error) throw error;
    return data || [];
  },

  async approvePrescription(prescriptionId: string, pharmacyId: string, staffId: string) {
    const { data, error } = await api.put<any>(`/prescriptions/${prescriptionId}`, {
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: staffId,
    });

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
        const { data: patientUser } = await api.get<any>(`/patients/${data.patient_id}`, {
          params: { fields: 'user_id' },
        });

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
    const { data: rejection, error } = await api.post<any>('/prescription-rejections', data);

    if (error) throw error;

    await api.put(`/prescriptions/${data.prescription_id}`, { status: 'rejected' });

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
    const { data, error } = await api.get<any[]>('/prescription-rejections', {
      params: {
        pharmacy_id: pharmacyId,
        include: 'prescriptions,prescriptions.patients,prescriptions.patients.user_profiles,pharmacy_staff,pharmacy_staff.user_profiles',
        order_by: 'rejected_at:desc',
      },
    });

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
    const { data, error } = await api.post<any>('/prescription-audit-log', {
      prescription_id: prescriptionId,
      pharmacy_id: pharmacyId,
      staff_id: staffId,
      action,
      action_details: actionDetails,
    });

    if (error) throw error;
    return data;
  },

  async getAuditLog(prescriptionId: string) {
    const { data, error } = await api.get<any[]>('/prescription-audit-log', {
      params: {
        prescription_id: prescriptionId,
        include: 'pharmacy_staff,pharmacy_staff.user_profiles',
        order_by: 'created_at:desc',
      },
    });

    if (error) throw error;
    return data || [];
  },

  async sendProviderMessage(prescriptionId: string, pharmacyId: string, message: string) {
    const { data, error } = await api.post<any>('/pharmacy-communications', {
      prescription_id: prescriptionId,
      pharmacy_id: pharmacyId,
      message,
      communication_type: 'pharmacy-to-provider',
      status: 'sent',
    });

    if (error) throw error;
    return data;
  },

  async getCommunications(prescriptionId: string) {
    const { data, error } = await api.get<any[]>('/pharmacy-communications', {
      params: {
        prescription_id: prescriptionId,
        order_by: 'created_at:asc',
      },
    });

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
    const { data, error } = await api.get<any>('/insurance-formularies/check', {
      params: {
        din_number: dinNumber,
        insurance_provider: insuranceProvider,
        insurance_plan_name: insurancePlan,
      },
    });

    if (error) throw error;
    return data;
  },

  async getPrescriptionsForPharmacy(pharmacyId: string, status?: string) {
    const { data, error } = await api.get<any[]>('/prescription-pharmacies', {
      params: {
        pharmacy_id: pharmacyId,
        include: 'prescriptions,prescriptions.patient,prescriptions.patient.user_profiles,prescriptions.provider,prescriptions.provider.user_profiles',
        order_by: 'created_at:desc',
      },
    });
    if (error) throw error;

    let prescriptions = (data || []).map(item => item.prescriptions).filter(Boolean);

    if (status && status !== 'all') {
      prescriptions = prescriptions.filter((p: any) => p.status === status);
    }

    return prescriptions;
  },

  async getPendingPrescriptions(pharmacyId: string) {
    const { data, error } = await api.get<any[]>('/prescription-pharmacies', {
      params: {
        pharmacy_id: pharmacyId,
        transmission_status: 'pending',
        include: 'prescriptions,prescriptions.patient,prescriptions.patient.user_profiles,prescriptions.provider,prescriptions.provider.user_profiles',
        order_by: 'created_at:desc',
      },
    });

    if (error) throw error;
    return (data || []).map(item => item.prescriptions).filter(Boolean);
  },

  async updatePrescriptionStatus(prescriptionId: string, status: string) {
    const { data, error } = await api.put<any>(`/prescriptions/${prescriptionId}`, { status });

    if (error) throw error;
    return data;
  },

  async getRefillRequests(pharmacyId: string) {
    const { data, error } = await api.get<any[]>('/prescription-refill-requests', {
      params: {
        status: 'pending',
        include: 'prescriptions,prescriptions.patient',
        order_by: 'requested_at:desc',
      },
    });

    if (error) throw error;

    if (!data) return [];

    const prescriptionIds = data.map(r => r.prescription_id).filter(Boolean);
    if (prescriptionIds.length === 0) return [];

    const { data: pharmacyPrescriptions } = await api.get<any[]>('/prescription-pharmacies', {
      params: {
        pharmacy_id: pharmacyId,
        prescription_id_in: prescriptionIds.join(','),
      },
    });

    const validPrescriptionIds = new Set(
      (pharmacyPrescriptions || []).map(p => p.prescription_id)
    );

    return data.filter(request =>
      validPrescriptionIds.has(request.prescription_id)
    );
  },

  async approveRefill(refillRequestId: string, pharmacyId: string, staffId: string) {
    const { data, error } = await api.put<any>(`/prescription-refill-requests/${refillRequestId}`, {
      status: 'approved',
      approved_by: staffId,
      approved_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data;
  },

  async denyRefill(refillRequestId: string, reason: string) {
    const { data, error } = await api.put<any>(`/prescription-refill-requests/${refillRequestId}`, {
      status: 'denied',
      denial_reason: reason,
    });

    if (error) throw error;
    return data;
  },
};
