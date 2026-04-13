import { api } from '../lib/api-client';
import { blockchainAuditService } from './blockchainAuditService';
import { consentService } from './consentService';
import { auditLog } from './auditLogger';
import { fhirResourceFactory } from './fhirResourceFactory';
import { notificationService } from './notificationService';

export interface Prescription {
  id: string;
  prescription_number: string;
  patient_id: string;
  provider_id: string;
  appointment_id?: string;
  pharmacy_id?: string;
  prescription_date: string;
  status: 'pending' | 'sent' | 'filled' | 'cancelled';
  notes?: string;
  diagnosis?: string;
  is_controlled_substance: boolean;
  filled_date?: string;
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_name: string;
  generic_name?: string;
  din_number?: string;
  strength: string;
  dosage_form: string;
  quantity: number;
  dosage_instructions: string;
  frequency: string;
  duration_days?: number;
  refills_allowed: number;
  refills_remaining: number;
  substitution_allowed: boolean;
  special_instructions?: string;
}

export const prescriptionService = {
  async createPrescription(prescriptionData: Partial<Prescription>): Promise<Prescription> {
    if (prescriptionData.provider_id && prescriptionData.patient_id) {
      const consent = await consentService.verifyProviderConsent(prescriptionData.patient_id, prescriptionData.provider_id, 'prescription');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const prescriptionNumber = `RX${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const { data, error } = await api.post<Prescription>('/prescriptions', {
      ...prescriptionData,
      prescription_number: prescriptionNumber,
    });

    if (error) throw error;

    try {
      await blockchainAuditService.logPrescriptionCreated(
        data!.id,
        data!.provider_id,
        data!.patient_id,
        { medication: 'prescription', dosage: '', quantity: 0, refills: 0 }
      );
    } catch {}

    return data!;
  },

  async getPrescription(prescriptionId: string, providerId?: string): Promise<Prescription | null> {
    const { data, error } = await api.get<Prescription>(`/prescriptions/${prescriptionId}`);

    if (error) throw error;

    if (data && providerId && data.provider_id !== providerId) {
      const consent = await consentService.verifyProviderConsent(data.patient_id, providerId, 'prescription');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    if (data && providerId) {
      try {
        await auditLog.dataAccessed('prescription', prescriptionId, providerId, 'provider', { action: 'read' });
      } catch {}
    }

    return data;
  },

  async getPatientPrescriptions(
    patientId: string,
    status?: Prescription['status']
  ): Promise<Prescription[]> {
    const params: Record<string, any> = { patient_id: patientId, order: 'prescription_date.desc' };
    if (status) {
      params.status = status;
    }

    const { data, error } = await api.get<Prescription[]>('/prescriptions', { params });

    if (error) throw error;
    return data || [];
  },

  async getProviderPrescriptions(
    providerId: string,
    status?: Prescription['status']
  ): Promise<Prescription[]> {
    const params: Record<string, any> = { provider_id: providerId, order: 'prescription_date.desc' };
    if (status) {
      params.status = status;
    }

    const { data, error } = await api.get<Prescription[]>('/prescriptions', { params });

    if (error) throw error;
    return data || [];
  },

  async addPrescriptionItems(items: Partial<PrescriptionItem>[], providerId?: string): Promise<PrescriptionItem[]> {
    if (providerId && items.length > 0 && items[0].prescription_id) {
      const { data: rx } = await api.get<{ patient_id: string }>(`/prescriptions/${items[0].prescription_id}`);
      if (rx) {
        const consent = await consentService.verifyProviderConsent(rx.patient_id, providerId, 'prescription');
        if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
      }
    }

    const { data, error } = await api.post<PrescriptionItem[]>('/prescription-items', items);

    if (error) throw error;

    if (providerId && items[0]?.prescription_id) {
      try {
        await auditLog.dataAccessed('prescription_item', items[0].prescription_id, providerId, 'provider', {
          action: 'create', items_count: (data || []).length,
        });
      } catch {}

      const { data: rx } = await api.get<{ patient_id: string }>(`/prescriptions/${items[0].prescription_id}`);
      if (rx && data) {
        const dataArr = Array.isArray(data) ? data : [data];
        for (const item of dataArr) {
          try {
            await fhirResourceFactory.createMedicationRequest({
              patientId: rx.patient_id,
              providerId,
              medicationCode: item.din_number || item.medication_name,
              medicationDisplay: item.medication_name,
              dinNumber: item.din_number,
              dosageText: item.dosage_instructions,
              dosageQuantity: undefined,
              dosageUnit: item.dosage_form,
              frequency: item.frequency,
              quantityValue: item.quantity,
              quantityUnit: 'tablets',
              supplyDuration: item.duration_days,
              numberOfRefills: item.refills_allowed,
              refillsRemaining: item.refills_remaining,
            });
          } catch {}
        }
      }
    }

    return Array.isArray(data) ? data : data ? [data] : [];
  },

  async getPrescriptionItems(prescriptionId: string, providerId?: string): Promise<PrescriptionItem[]> {
    if (providerId) {
      const { data: rx } = await api.get<{ patient_id: string }>(`/prescriptions/${prescriptionId}`);
      if (rx) {
        const consent = await consentService.verifyProviderConsent(rx.patient_id, providerId, 'prescription');
        if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
      }
    }

    const { data, error } = await api.get<PrescriptionItem[]>('/prescription-items', {
      params: { prescription_id: prescriptionId }
    });

    if (error) throw error;

    if (providerId) {
      try {
        await auditLog.dataAccessed('prescription_item', prescriptionId, providerId, 'provider', {
          action: 'read', items_count: (data || []).length,
        });
      } catch {}
    }

    return data || [];
  },

  async updatePrescriptionStatus(
    prescriptionId: string,
    status: Prescription['status'],
    actorId?: string,
    actorRole?: string
  ): Promise<Prescription> {
    if (actorId && actorRole === 'provider') {
      const { data: rx } = await api.get<{ patient_id: string }>(`/prescriptions/${prescriptionId}`);
      if (rx) {
        const consent = await consentService.verifyProviderConsent(rx.patient_id, actorId, 'prescription');
        if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
      }
    }

    const updates: any = { status };

    if (status === 'filled') {
      updates.filled_date = new Date().toISOString().split('T')[0];
    }

    const { data, error } = await api.put<Prescription>(`/prescriptions/${prescriptionId}`, updates);

    if (error) throw error;

    try {
      const eventType = status === 'filled' ? 'prescription_filled' : status === 'cancelled' ? 'prescription_cancelled' : 'prescription_sent';
      await blockchainAuditService.logEvent({
        eventType: eventType as any,
        resourceType: 'prescription',
        resourceId: prescriptionId,
        actorId: actorId,
        actorRole: actorRole || 'system',
        actionData: { status, updated_at: new Date().toISOString() },
      });
    } catch {}

    return data!;
  },

  async sendToPharmacy(prescriptionId: string, pharmacyId: string, providerId?: string): Promise<Prescription> {
    const { data: prescription } = await api.get<{ patient_id: string; pharmacy_id: string; provider_id: string }>(`/prescriptions/${prescriptionId}`);

    if (providerId && prescription) {
      const consent = await consentService.verifyProviderConsent(prescription.patient_id, providerId, 'prescription');
      if (!consent.hasConsent) throw new Error(consent.reason || 'No active consent');
    }

    const oldPharmacyId = prescription?.pharmacy_id;

    const { data, error } = await api.put<Prescription>(`/prescriptions/${prescriptionId}`, {
      pharmacy_id: pharmacyId,
      status: 'sent'
    });

    if (error) throw error;

    if (prescription?.patient_id) {
      try {
        if (oldPharmacyId && oldPharmacyId !== pharmacyId) {
          const { data: oldConsent } = await api.get<{ id: string }>('/patient-consents', {
            params: { patient_id: prescription.patient_id, pharmacy_id: oldPharmacyId, status: 'active' }
          });

          const consentRecord = Array.isArray(oldConsent) ? oldConsent[0] : oldConsent;
          if (consentRecord) {
            await consentService.revokeConsent(consentRecord.id, prescription.patient_id, oldPharmacyId);
          }
        }

        await consentService.grantPharmacyConsent({
          patientId: prescription.patient_id,
          pharmacyId,
          recordTypes: ['prescription'],
          durationDays: 90,
        });

        await blockchainAuditService.logEvent({
          eventType: 'prescription_sent',
          resourceType: 'prescription',
          resourceId: prescriptionId,
          actionData: { pharmacy_id: pharmacyId, sent_at: new Date().toISOString(), consent_created: true },
        });
      } catch {}

      try {
        const { data: patientUser } = await api.get<{ user_id: string }>('/patients', {
          params: { id: prescription.patient_id }
        });

        const patient = Array.isArray(patientUser) ? patientUser[0] : patientUser;
        if (patient?.user_id) {
          await notificationService.createNotification({
            userId: patient.user_id,
            type: 'new_prescription',
            category: 'prescription',
            priority: 'normal',
            title: 'New Prescription Sent',
            message: 'Your prescription has been sent to the pharmacy for fulfillment.',
            actionUrl: '/dashboard/patient/prescriptions',
            actionLabel: 'View Prescription',
            relatedEntityType: 'prescription',
            relatedEntityId: prescriptionId,
          });
        }
      } catch {}
    }

    return data!;
  },

  async redirectPrescription(prescriptionId: string, newPharmacyId: string, patientId: string): Promise<Prescription> {
    const { data: prescriptionData } = await api.get<Prescription[]>('/prescriptions', {
      params: { id: prescriptionId, patient_id: patientId }
    });

    const prescription = Array.isArray(prescriptionData) ? prescriptionData[0] : prescriptionData;
    if (!prescription) throw new Error('Prescription not found');

    const oldPharmacyId = prescription.pharmacy_id;

    const { data, error } = await api.put<Prescription>(`/prescriptions/${prescriptionId}`, {
      pharmacy_id: newPharmacyId
    });

    if (error) throw error;

    try {
      if (oldPharmacyId) {
        const { data: oldConsentData } = await api.get<{ id: string }[]>('/patient-consents', {
          params: { patient_id: patientId, pharmacy_id: oldPharmacyId, status: 'active' }
        });

        const oldConsent = Array.isArray(oldConsentData) ? oldConsentData[0] : oldConsentData;
        if (oldConsent) {
          await consentService.revokeConsent(oldConsent.id, patientId, oldPharmacyId);
        }
      }

      await consentService.grantPharmacyConsent({
        patientId,
        pharmacyId: newPharmacyId,
        recordTypes: ['prescription'],
        durationDays: 90,
      });

      await blockchainAuditService.logEvent({
        eventType: 'prescription_redirected',
        resourceType: 'prescription',
        resourceId: prescriptionId,
        actorId: patientId,
        actorRole: 'patient',
        actionData: {
          old_pharmacy_id: oldPharmacyId,
          new_pharmacy_id: newPharmacyId,
          redirected_at: new Date().toISOString(),
        },
      });
    } catch {}

    try {
      if (oldPharmacyId) {
        const { data: oldPharmacyData } = await api.get<{ user_id: string }>(`/pharmacies/${oldPharmacyId}`);

        if (oldPharmacyData?.user_id) {
          await notificationService.createNotification({
            userId: oldPharmacyData.user_id,
            type: 'new_prescription',
            category: 'prescription',
            priority: 'normal',
            title: 'Prescription Redirected',
            message: 'A prescription has been redirected to another pharmacy by the patient.',
            relatedEntityType: 'prescription',
            relatedEntityId: prescriptionId,
          });
        }
      }

      const { data: newPharmacyData } = await api.get<{ user_id: string }>(`/pharmacies/${newPharmacyId}`);

      if (newPharmacyData?.user_id) {
        await notificationService.createNotification({
          userId: newPharmacyData.user_id,
          type: 'new_prescription',
          category: 'prescription',
          priority: 'high',
          title: 'New Prescription Received',
          message: 'A prescription has been redirected to your pharmacy.',
          actionUrl: '/dashboard/pharmacy/prescriptions/pending',
          actionLabel: 'View Prescription',
          relatedEntityType: 'prescription',
          relatedEntityId: prescriptionId,
        });
      }
    } catch {}

    return data!;
  },

  async requestRefill(prescriptionId: string, requestedBy: string): Promise<any> {
    const { data, error } = await api.post<any>('/prescription-refills', {
      prescription_id: prescriptionId,
      requested_by: requestedBy,
    });

    if (error) throw error;

    try {
      await auditLog.dataAccessed('prescription_refill', data!.id, requestedBy, 'patient', {
        action: 'refill_requested', prescription_id: prescriptionId,
      });
    } catch {}

    return data!;
  },

  async getProviderRefillRequests(providerId: string): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/prescription-refills', {
      params: { status: 'pending', provider_id: providerId, order: 'request_date.desc' }
    });

    if (error) throw error;

    try {
      await auditLog.dataAccessed('prescription_refill', 'provider_refills', providerId, 'provider', {
        action: 'read', records_count: (data || []).length,
      });
    } catch {}

    return data || [];
  },

  async approveRefill(refillId: string, approvedBy: string): Promise<any> {
    const { data, error } = await api.put<any>(`/prescription-refills/${refillId}`, {
      status: 'approved',
      approved_by: approvedBy,
      approval_date: new Date().toISOString(),
    });

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'prescription_approved',
        resourceType: 'prescription_refill',
        resourceId: refillId,
        actorId: approvedBy,
        actorRole: 'provider',
        actionData: { action: 'refill_approved', prescription_id: data!.prescription_id },
      });
    } catch {}

    return data!;
  },

  async denyRefill(refillId: string, reason: string, deniedBy?: string): Promise<any> {
    const { data, error } = await api.put<any>(`/prescription-refills/${refillId}`, {
      status: 'denied',
      denial_reason: reason,
    });

    if (error) throw error;

    try {
      await blockchainAuditService.logEvent({
        eventType: 'prescription_rejected',
        resourceType: 'prescription_refill',
        resourceId: refillId,
        actorId: deniedBy,
        actorRole: 'provider',
        actionData: { action: 'refill_denied', reason, prescription_id: data!.prescription_id },
      });
    } catch {}

    return data!;
  },
};
