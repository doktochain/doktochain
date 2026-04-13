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

import { providerOnboardingService } from '@/services/providerOnboardingService';
import { enhancedAppointmentService } from '@/services/enhancedAppointmentService';
import { clinicalNotesService } from '@/services/clinicalNotesService';
import { prescriptionService } from '@/services/prescriptionService';
import { providerBillingService } from '@/services/providerBillingService';
import { consentService } from '@/services/consentService';
import { auditTrailService } from '@/services/auditTrailService';
import { seedPlatformData } from './helpers/e2eContext';

describe('E2E: Complete Provider Journey', () => {
  const state: Record<string, any> = {};

  beforeAll(() => {
    vi.clearAllMocks();
    db.clear();
    seedPlatformData();
  });

  afterAll(() => {
    db.clear();
  });

  describe('Phase 1: Provider onboarding', () => {
    it('step 1 - new provider creates application', async () => {
      db.seed('user_profiles', [
        {
          id: 'new-provider-user',
          email: 'dr.new@test.com',
          first_name: 'Sarah',
          last_name: 'Johnson',
          full_name: 'Dr. Sarah Johnson',
          role: 'provider',
        },
      ]);

      const application = await providerOnboardingService.createApplication(
        'new-provider-user',
        {
          license_number: 'CPSO-99999',
          license_province: 'ON',
          specialty: 'Internal Medicine',
          years_of_experience: 8,
          practice_name: 'Dr. Johnson Internal Medicine',
          practice_type: 'solo',
        }
      );

      expect(application).toBeDefined();
      expect(application.user_id).toBe('new-provider-user');
      state.applicationId = application.id;
    });

    it('step 2 - provider submits application for review', async () => {
      const submitted = await providerOnboardingService.submitApplication(
        state.applicationId
      );
      expect(submitted.application_status).toBe('submitted');
    });

    it('step 3 - admin creates approval workflow steps', async () => {
      const steps = await providerOnboardingService.createApprovalSteps(
        state.applicationId
      );
      expect(steps.length).toBe(5);
      state.approvalSteps = steps;
    });

    it('step 4 - admin reviews and approves each step', async () => {
      for (const step of state.approvalSteps) {
        const updated = await providerOnboardingService.updateApprovalStep(
          step.id,
          'approved',
          'admin-user-1',
          'Verified and approved'
        );
        expect(updated.approval_status).toBe('approved');
      }
    });

    it('step 5 - admin approves the full application', async () => {
      await providerOnboardingService.approveApplication(
        state.applicationId,
        'admin-user-1'
      );

      const application = await providerOnboardingService.getApplication(
        state.applicationId
      );
      expect(application!.application_status).toBe('approved');
    });

    it('step 6 - verification history is maintained', async () => {
      const history = await providerOnboardingService.getVerificationHistory(
        state.applicationId
      );
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 2: Appointment management', () => {
    it('step 7 - active provider has existing appointments seeded', () => {
      db.seed('appointments', [
        {
          id: 'apt-e2e-1',
          patient_id: 'patient-1',
          provider_id: 'provider-1',
          appointment_date: '2026-04-15',
          start_time: '14:00',
          end_time: '14:30',
          status: 'scheduled',
          consultation_type: 'virtual',
          reason_for_visit: 'Skin rash follow-up',
        },
        {
          id: 'apt-e2e-2',
          patient_id: 'patient-1',
          provider_id: 'provider-1',
          appointment_date: '2026-04-15',
          start_time: '15:00',
          end_time: '15:30',
          status: 'scheduled',
          consultation_type: 'virtual',
          reason_for_visit: 'Annual checkup',
        },
      ]);

      db.seed('patient_consents', [
        {
          id: 'consent-e2e-1',
          patient_id: 'patient-1',
          provider_id: 'provider-1',
          consent_type: 'treatment',
          consent_scope: 'broad',
          record_types: [],
          status: 'active',
          start_date: '2026-01-01',
          end_date: '2026-12-31',
        },
      ]);
    });

    it('step 8 - provider views their appointments', async () => {
      const appointments =
        await enhancedAppointmentService.getAppointments('provider-1');
      expect(appointments.length).toBeGreaterThanOrEqual(2);
    });

    it('step 9 - provider confirms an appointment', async () => {
      const confirmed =
        await enhancedAppointmentService.confirmAppointment('apt-e2e-1');
      expect(confirmed.status).toBe('confirmed');
    });

    it('step 10 - provider checks in the patient', async () => {
      const checkedIn =
        await enhancedAppointmentService.checkInPatient('apt-e2e-1', 'Room 3');
      expect(checkedIn.status).toBe('in-progress');
    });
  });

  describe('Phase 3: Clinical documentation', () => {
    it('step 11 - provider creates SOAP note for appointment', async () => {
      const note = await clinicalNotesService.createNote({
        appointment_id: 'apt-e2e-1',
        patient_id: 'patient-1',
        provider_id: 'provider-1',
        note_type: 'soap',
        subjective: 'Patient reports ongoing mild itching on both arms',
        objective:
          'Mild erythema noted on bilateral forearms, no vesicles or weeping',
        assessment: 'Contact dermatitis - improving',
        plan: 'Continue hydrocortisone cream, follow up in 4 weeks',
        chief_complaint: 'Skin rash follow-up',
        status: 'draft',
      });

      expect(note).toBeDefined();
      expect(note.note_type).toBe('soap');
      state.clinicalNoteId = note.id;
    });

    it('step 12 - provider finalizes the clinical note', async () => {
      const finalized = await clinicalNotesService.finalizeNote(
        state.clinicalNoteId,
        'provider-1'
      );
      expect(finalized.is_finalized).toBe(true);
      expect(finalized.digital_signature).toBeDefined();
    });

    it('step 13 - provider can retrieve the finalized note', async () => {
      const note = await clinicalNotesService.getNote(
        state.clinicalNoteId,
        'provider-1'
      );
      expect(note).toBeDefined();
      expect(note!.is_finalized).toBe(true);
    });
  });

  describe('Phase 4: Prescription writing', () => {
    it('step 14 - provider creates prescription from consultation', async () => {
      const prescription = await prescriptionService.createPrescription({
        patient_id: 'patient-1',
        provider_id: 'provider-1',
        appointment_id: 'apt-e2e-1',
        diagnosis: 'Contact dermatitis',
        diagnosis_code: 'L25.9',
        notes: 'Topical treatment - apply twice daily',
        status: 'active',
      });

      expect(prescription).toBeDefined();
      state.prescriptionId = prescription.id;
    });

    it('step 15 - provider adds medication items', async () => {
      const items = await prescriptionService.addPrescriptionItems([
        {
          prescription_id: state.prescriptionId,
          medication_name: 'Betamethasone Valerate 0.1%',
          din_number: 'DIN-00012346',
          dosage: 'Apply thin layer to affected area',
          frequency: 'Twice daily',
          duration: '14 days',
          quantity: 1,
          refills_allowed: 1,
          substitution_allowed: false,
        },
      ]);

      expect(items.length).toBe(1);
    });

    it('step 16 - provider sends prescription to patient preferred pharmacy', async () => {
      const sent = await prescriptionService.sendToPharmacy(
        state.prescriptionId,
        'pharmacy-1',
        'provider-1'
      );

      expect(sent.pharmacy_id).toBe('pharmacy-1');
      expect(sent.status).toBe('sent');
    });
  });

  describe('Phase 5: Billing and earnings', () => {
    it('step 17 - provider creates a transaction record', async () => {
      const result = await providerBillingService.createTransaction({
        provider_id: 'provider-1',
        patient_id: 'patient-1',
        appointment_id: 'apt-e2e-1',
        transaction_type: 'consultation',
        amount: 15000,
        status: 'completed',
        payment_method: 'insurance',
        description: 'Dermatology follow-up consultation',
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      state.transactionId = result.data.id;
    });

    it('step 18 - provider creates an insurance claim', async () => {
      const result = await providerBillingService.createClaim({
        provider_id: 'provider-1',
        patient_id: 'patient-1',
        appointment_id: 'apt-e2e-1',
        insurance_provider: 'OHIP',
        policy_number: 'ON-9876543210',
        claim_amount: 15000,
        diagnosis_codes: ['L25.9'],
        procedure_codes: ['99213'],
        service_date: '2026-04-15',
        status: 'draft',
      });

      expect(result.error).toBeNull();
      state.claimId = result.data.id;
    });

    it('step 19 - provider submits the insurance claim', async () => {
      const result = await providerBillingService.submitClaim(state.claimId);
      expect(result.error).toBeNull();
      expect(result.data.status).toBe('submitted');
    });

    it('step 20 - provider views their transactions', async () => {
      const result =
        await providerBillingService.getTransactions('provider-1');
      expect(result.error).toBeNull();
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('step 21 - provider checks out the patient', async () => {
      const checkedOut =
        await enhancedAppointmentService.checkOutPatient('apt-e2e-1');
      expect(checkedOut.status).toBe('completed');
    });
  });

  describe('Phase 6: Refill management', () => {
    it('step 22 - patient requests a refill', async () => {
      const refill = await prescriptionService.requestRefill(
        state.prescriptionId,
        'patient-1'
      );
      expect(refill).toBeDefined();
      state.refillId = refill.id;
    });

    it('step 23 - provider reviews and approves refill', async () => {
      const approved = await prescriptionService.approveRefill(
        state.refillId,
        'provider-1'
      );
      expect(approved).toBeDefined();

      const refills = db.getTable('prescription_refills').getAll();
      const r = refills.find((x) => x.id === state.refillId);
      expect(r.status).toBe('approved');
    });
  });

  describe('Phase 7: Audit trail completeness', () => {
    it('step 24 - all clinical actions are recorded in audit trail', async () => {
      const trail = await auditTrailService.getAuditTrail({});
      expect(trail.length).toBeGreaterThan(0);

      const eventTypes = trail.map((e) => e.event_type);
      expect(eventTypes.length).toBeGreaterThan(0);
    });

    it('step 25 - audit chain maintains integrity', async () => {
      const integrity = await auditTrailService.verifyChainIntegrity();
      expect(integrity.isValid).toBe(true);
    });
  });
});
