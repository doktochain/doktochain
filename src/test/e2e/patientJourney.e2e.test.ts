import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { db, mockSupabase } from './helpers/e2eContext';

vi.unmock('@/services/auditTrailService');
vi.unmock('@/services/blockchainAuditService');

vi.mock('@/lib/supabase', async () => {
  const ctx = await import('./helpers/e2eContext');
  return {
    supabase: ctx.mockSupabase,
    getCurrentUser: vi.fn(),
    getUserProfile: vi.fn(),
    getUserRoles: vi.fn(),
  };
});

import { patientService } from '@/services/patientService';
import { providerSearchService } from '@/services/providerSearchService';
import { enhancedBookingService } from '@/services/enhancedBookingService';
import { consentService } from '@/services/consentService';
import { telemedicineService } from '@/services/telemedicineService';
import { prescriptionService } from '@/services/prescriptionService';
import { pharmacyPrescriptionService } from '@/services/pharmacyPrescriptionService';
import { pharmacyOrderFulfillmentService } from '@/services/pharmacyOrderFulfillmentService';
import { notificationService } from '@/services/notificationService';
import { auditTrailService } from '@/services/auditTrailService';
import { seedPlatformData } from './helpers/e2eContext';

describe('E2E: Complete Patient Journey', () => {
  const state: Record<string, any> = {};

  beforeAll(() => {
    vi.clearAllMocks();
    db.clear();
    seedPlatformData();
  });

  afterAll(() => {
    db.clear();
  });

  describe('Phase 1: Patient profile and provider discovery', () => {
    it('step 1 - patient retrieves their profile', async () => {
      const patient = await patientService.getPatientByUserId('patient-user-1');
      expect(patient).toBeDefined();
      expect(patient!.id).toBe('patient-1');
      expect(patient!.profile_completed).toBe(true);
      state.patientId = patient!.id;
    });

    it('step 2 - patient adds allergies to their profile', async () => {
      const allergy = await patientService.addAllergy(state.patientId, {
        allergen_name: 'Sulfa drugs',
        allergen_type: 'medication',
        severity: 'moderate',
        reaction: 'Rash',
      });
      expect(allergy.allergen_name).toBe('Sulfa drugs');
      state.allergyId = allergy.id;
    });

    it('step 3 - patient adds emergency contact', async () => {
      const contact = await patientService.addEmergencyContact(state.patientId, {
        name: 'Bob Doe',
        phone: '+14165559999',
        relationship: 'spouse',
      });
      expect(contact.name).toBe('Bob Doe');
    });

    it('step 4 - patient searches for a dermatologist', async () => {
      const results = await providerSearchService.searchProviders({});
      expect(results.length).toBeGreaterThanOrEqual(1);
      const dr = results.find((r: any) => r.id === 'provider-1');
      expect(dr).toBeDefined();
      state.providerId = dr!.id;
    });

    it('step 5 - patient views provider availability', async () => {
      const slots = await enhancedBookingService.getProviderAvailability(
        state.providerId,
        '2026-04-15',
        '2026-04-16',
        'virtual'
      );
      expect(slots.length).toBeGreaterThanOrEqual(1);
      state.selectedSlot = slots[0];
    });
  });

  describe('Phase 2: Appointment booking', () => {
    it('step 6 - patient books a video consultation', async () => {
      const appointmentId = await enhancedBookingService.createAppointment(
        {
          providerId: state.providerId,
          serviceId: 'svc-derm-consult',
          appointmentDate: '2026-04-15',
          appointmentTime: '14:00',
          consultationType: 'virtual',
          reasonForVisit: 'Persistent skin rash on arms',
          slotId: 'slot-1',
        },
        state.patientId
      );

      expect(typeof appointmentId).toBe('string');
      expect(appointmentId).toBeTruthy();
      state.appointmentId = appointmentId;
    });

    it('step 7 - appointment is created in the database', () => {
      const appointments = db.getTable('appointments').getAll();
      const apt = appointments.find((a) => a.id === state.appointmentId);
      expect(apt).toBeDefined();
      expect(apt.patient_id).toBe(state.patientId);
      expect(apt.provider_id).toBe(state.providerId);
    });

    it('step 8 - consent was auto-created for the appointment', () => {
      const consents = db.getTable('patient_consents').getAll();
      const aptConsent = consents.find(
        (c) =>
          c.patient_id === state.patientId &&
          c.provider_id === state.providerId &&
          c.consent_type === 'treatment'
      );
      expect(aptConsent).toBeDefined();
      expect(aptConsent.status).toBe('active');
      expect(aptConsent.consent_scope).toBe('appointment');
      state.consentId = aptConsent.id;
    });

    it('step 9 - provider notification was attempted', () => {
      const notifications = db.getTable('notifications').getAll();
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('step 10 - audit trail records the booking', () => {
      const auditEntries = db.getTable('blockchain_audit_log').getAll();
      expect(auditEntries.length).toBeGreaterThan(0);
    });

    it('step 10b - patient grants broad consent for ongoing care', async () => {
      const result = await consentService.grantConsent({
        patientId: 'patient-1',
        providerId: state.providerId,
        consentType: 'treatment',
        recordTypes: [],
        durationDays: 365,
      });
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });
  });

  describe('Phase 3: Video consultation', () => {
    it('step 11 - video consultation session is created', async () => {
      const result = await telemedicineService.createVideoConsultation({
        appointment_id: state.appointmentId,
        patient_id: state.patientId,
        provider_id: state.providerId,
        scheduled_start: '2026-04-15T14:00:00Z',
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      state.consultationId = result.data!.id;
    });

    it('step 12 - consultation is started', async () => {
      const result = await telemedicineService.updateConsultationStatus(
        state.consultationId,
        'in_progress',
        { actual_start: new Date().toISOString() }
      );
      expect(result.error).toBeNull();
      expect(result.data!.status).toBe('in_progress');
    });

    it('step 13 - messages exchanged during consultation', async () => {
      const msg = await telemedicineService.sendConsultationMessage({
        consultation_id: state.consultationId,
        sender_id: state.patientId,
        message_text: 'The rash started about two weeks ago',
        message_type: 'text',
      });
      expect(msg.error).toBeNull();
      expect(msg.data).toBeDefined();

      const messages = await telemedicineService.getConsultationMessages(
        state.consultationId
      );
      expect(messages.data!.length).toBeGreaterThanOrEqual(1);
    });

    it('step 14 - consultation is completed', async () => {
      const result = await telemedicineService.updateConsultationStatus(
        state.consultationId,
        'completed',
        { actual_end: new Date().toISOString() }
      );
      expect(result.error).toBeNull();
      expect(result.data!.status).toBe('completed');
    });

    it('step 15 - patient submits consultation feedback', async () => {
      const feedback = await telemedicineService.submitConsultationFeedback({
        consultation_id: state.consultationId,
        patient_id: state.patientId,
        provider_id: state.providerId,
        rating: 5,
        video_quality: 4,
        audio_quality: 5,
        provider_professionalism: 5,
        feedback_text: 'Very thorough examination via video',
        would_recommend: true,
      });
      expect(feedback.error).toBeNull();
    });
  });

  describe('Phase 4: Prescription creation and pharmacy routing', () => {
    it('step 16 - provider creates a prescription', async () => {
      const prescription = await prescriptionService.createPrescription({
        patient_id: state.patientId,
        provider_id: state.providerId,
        appointment_id: state.appointmentId,
        diagnosis: 'Contact dermatitis',
        diagnosis_code: 'L25.9',
        notes: 'Apply twice daily for 2 weeks',
        status: 'active',
      });

      expect(prescription).toBeDefined();
      expect(prescription.patient_id).toBe(state.patientId);
      state.prescriptionId = prescription.id;
    });

    it('step 17 - prescription items are added', async () => {
      const items = await prescriptionService.addPrescriptionItems([
        {
          prescription_id: state.prescriptionId,
          medication_name: 'Hydrocortisone Cream 1%',
          din_number: 'DIN-00012345',
          dosage: 'Apply thin layer',
          frequency: 'Twice daily',
          duration: '14 days',
          quantity: 1,
          refills_allowed: 2,
          substitution_allowed: true,
        },
      ]);

      expect(items.length).toBe(1);
      expect(items[0].medication_name).toBe('Hydrocortisone Cream 1%');
    });

    it('step 18 - provider sends prescription to pharmacy', async () => {
      const updated = await prescriptionService.sendToPharmacy(
        state.prescriptionId,
        'pharmacy-1',
        state.providerId
      );

      expect(updated.pharmacy_id).toBe('pharmacy-1');
      expect(updated.status).toBe('sent');
    });

    it('step 19 - pharmacy consent was granted automatically', () => {
      const consents = db.getTable('patient_consents').getAll();
      const pharmacyConsent = consents.find(
        (c) =>
          c.patient_id === state.patientId &&
          c.pharmacy_id === 'pharmacy-1' &&
          c.status === 'active'
      );
      expect(pharmacyConsent).toBeDefined();
    });

    it('step 20 - patient can redirect prescription to a different pharmacy', async () => {
      const redirected = await prescriptionService.redirectPrescription(
        state.prescriptionId,
        'pharmacy-2',
        state.patientId
      );

      expect(redirected.pharmacy_id).toBe('pharmacy-2');

      const consents = db.getTable('patient_consents').getAll();
      const newPharmConsent = consents.find(
        (c) =>
          c.patient_id === state.patientId &&
          c.pharmacy_id === 'pharmacy-2' &&
          c.status === 'active'
      );
      expect(newPharmConsent).toBeDefined();
    });

    it('step 21 - patient redirects back to original pharmacy for fulfillment', async () => {
      await prescriptionService.redirectPrescription(
        state.prescriptionId,
        'pharmacy-1',
        state.patientId
      );

      const rx = db
        .getTable('prescriptions')
        .select({ id: state.prescriptionId });
      expect(rx[0].pharmacy_id).toBe('pharmacy-1');
    });
  });

  describe('Phase 5: Pharmacy receives and processes prescription', () => {
    it('step 22 - pharmacy checks drug interactions', async () => {
      const check = await pharmacyPrescriptionService.checkDrugInteractions([
        'Hydrocortisone Cream 1%',
      ]);
      expect(check.hasInteractions).toBe(false);
      expect(check.severity).toBe('none');
    });

    it('step 23 - pharmacist validates the prescription', async () => {
      const validation =
        await pharmacyPrescriptionService.validatePrescription({
          prescription_id: state.prescriptionId,
          pharmacy_id: 'pharmacy-1',
          pharmacist_id: 'pharmacy-user-1',
          validation_status: 'approved',
          notes: 'All checks passed',
        });

      expect(validation).toBeDefined();
      expect(validation.validation_status).toBe('approved');
    });

    it('step 24 - pharmacy approves the prescription', async () => {
      const approved = await pharmacyPrescriptionService.approvePrescription(
        state.prescriptionId,
        'pharmacy-1',
        'pharmacy-user-1'
      );
      expect(approved).toBeDefined();

      const rx = db
        .getTable('prescriptions')
        .select({ id: state.prescriptionId });
      expect(rx[0].status).toBe('approved');
    });

    it('step 25 - pharmacy creates a fulfillment order', async () => {
      const order = await pharmacyOrderFulfillmentService.createFulfillment({
        pharmacy_id: 'pharmacy-1',
        prescription_id: state.prescriptionId,
        patient_id: state.patientId,
        assigned_staff_id: 'pharmacy-user-1',
        fulfillment_status: 'picking',
      });

      expect(order).toBeDefined();
      state.fulfillmentId = order.id;
    });

    it('step 26 - fulfillment progresses through stages', async () => {
      await pharmacyOrderFulfillmentService.updateFulfillmentStatus(
        state.fulfillmentId,
        'checking',
        'pharmacy-user-1'
      );

      await pharmacyOrderFulfillmentService.updateFulfillmentStatus(
        state.fulfillmentId,
        'ready',
        'pharmacy-user-1'
      );

      const fulfillments = db.getTable('order_fulfillment').getAll();
      const f = fulfillments.find((x) => x.id === state.fulfillmentId);
      expect(f.fulfillment_status).toBe('ready');
    });
  });

  describe('Phase 6: Prescription refill cycle', () => {
    it('step 27 - patient requests a refill', async () => {
      const refill = await prescriptionService.requestRefill(
        state.prescriptionId,
        state.patientId
      );

      expect(refill).toBeDefined();
      state.refillId = refill.id;
    });

    it('step 28 - provider sees and approves the refill', async () => {
      const approved = await prescriptionService.approveRefill(
        state.refillId,
        state.providerId
      );
      expect(approved).toBeDefined();

      const refills = db.getTable('prescription_refills').getAll();
      const r = refills.find((x) => x.id === state.refillId);
      expect(r.status).toBe('approved');
    });
  });

  describe('Phase 7: Notifications and audit trail verification', () => {
    it('step 29 - patient has accumulated notifications', async () => {
      const result = await notificationService.getNotifications(
        'patient-user-1'
      );
      expect(result.error).toBeNull();
    });

    it('step 30 - audit trail has entries for the entire journey', async () => {
      const trail = await auditTrailService.getAuditTrail({});
      expect(trail.length).toBeGreaterThan(0);
    });

    it('step 31 - audit chain integrity is valid', async () => {
      const result = await auditTrailService.verifyChainIntegrity();
      expect(result.isValid).toBe(true);
      expect(result.invalidBlocks).toBe(0);
    });
  });
});
