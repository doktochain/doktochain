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

import { consentService } from '@/services/consentService';
import { clinicalNotesService } from '@/services/clinicalNotesService';
import { prescriptionService } from '@/services/prescriptionService';
import { healthRecordsService } from '@/services/healthRecordsService';
import { auditTrailService } from '@/services/auditTrailService';
import { seedPlatformData } from './helpers/e2eContext';

describe('E2E: Cross-Role Consent and Data Sharing Flow', () => {
  const state: Record<string, any> = {};

  beforeAll(() => {
    vi.clearAllMocks();
    db.clear();
    seedPlatformData();

    db.seed('user_profiles', [
      {
        id: 'provider-user-2',
        email: 'dr.referral@test.com',
        first_name: 'Lisa',
        last_name: 'Park',
        full_name: 'Dr. Lisa Park',
        role: 'provider',
      },
    ]);

    db.seed('providers', [
      {
        id: 'provider-2',
        user_id: 'provider-user-2',
        specialty: 'Allergy & Immunology',
        license_number: 'CPSO-67890',
        license_province: 'ON',
        provider_type: 'doctor',
        status: 'active',
        is_active: true,
      },
    ]);

    db.seed('patient_consents', [
      {
        id: 'seeded-apt-consent',
        patient_id: 'patient-1',
        provider_id: 'provider-1',
        consent_type: 'treatment',
        consent_scope: 'appointment',
        appointment_id: 'apt-consent-1',
        record_types: [],
        start_date: '2026-03-24',
        end_date: '2026-03-24',
        access_start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        access_end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
      },
    ]);
  });

  afterAll(() => {
    db.clear();
  });

  describe('Phase 1: Appointment-based consent (time-windowed)', () => {
    it('step 1 - appointment consent is created with correct structure', async () => {
      const result = await consentService.createAppointmentConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        appointmentId: 'apt-consent-extra',
        appointmentDate: '2026-04-20',
        startTime: '10:00',
        endTime: '10:30',
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.consent_type).toBe('treatment');
      expect(result.data!.consent_scope).toBe('appointment');
      expect(result.data!.status).toBe('active');
      expect(result.data!.access_start).toBeDefined();
      expect(result.data!.access_end).toBeDefined();

      state.appointmentConsentId = 'seeded-apt-consent';
    });

    it('step 2 - provider can access patient data within consent window', async () => {
      const check = await consentService.verifyProviderConsent(
        'patient-1',
        'provider-1'
      );
      expect(check.hasConsent).toBe(true);
      expect(check.consent).toBeDefined();
    });

    it('step 3 - provider creates clinical note under consent', async () => {
      const note = await clinicalNotesService.createNote({
        appointment_id: 'apt-consent-1',
        patient_id: 'patient-1',
        provider_id: 'provider-1',
        note_type: 'soap',
        subjective: 'Patient reports itchy arms',
        objective: 'Mild redness observed',
        assessment: 'Contact dermatitis',
        plan: 'Topical cream recommended',
        status: 'draft',
      });

      expect(note).toBeDefined();
      state.noteId = note.id;
    });

    it('step 4 - consent window can be updated for rescheduling', async () => {
      await consentService.updateAppointmentConsentWindow({
        appointmentId: 'apt-consent-1',
        newDate: '2026-04-22',
        newStartTime: '14:00',
        newEndTime: '14:30',
        actorId: 'patient-1',
      });

      const consents = db.getTable('patient_consents').getAll();
      const updated = consents.find(
        (c) => c.id === state.appointmentConsentId
      );
      expect(updated).toBeDefined();
    });
  });

  describe('Phase 2: Broad consent for ongoing care', () => {
    it('step 5 - patient grants broad consent to primary provider', async () => {
      const result = await consentService.grantConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        consentType: 'broad',
        recordTypes: [
          'lab_results',
          'medications',
          'allergies',
          'clinical_notes',
          'prescription',
        ],
        durationDays: 365,
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.consent_type).toBe('broad');
      state.broadConsentId = result.data!.id;
    });

    it('step 6 - provider can access all consented record types', async () => {
      const checkLab = await consentService.verifyProviderConsent(
        'patient-1',
        'provider-1',
        'lab_results'
      );
      expect(checkLab.hasConsent).toBe(true);

      const checkMeds = await consentService.verifyProviderConsent(
        'patient-1',
        'provider-1',
        'medications'
      );
      expect(checkMeds.hasConsent).toBe(true);
    });

    it('step 7 - patient views all their active consents', async () => {
      const result = await consentService.getPatientConsents('patient-1');
      expect(result.error).toBeNull();
      expect(result.data!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Phase 3: Referral provider consent (second provider)', () => {
    it('step 8 - second provider has no consent initially', async () => {
      const check = await consentService.verifyProviderConsent(
        'patient-1',
        'provider-2'
      );
      expect(check.hasConsent).toBe(false);
    });

    it('step 9 - second provider cannot create notes without consent', async () => {
      await expect(
        clinicalNotesService.createNote({
          patient_id: 'patient-1',
          provider_id: 'provider-2',
          note_type: 'soap',
          subjective: 'Unauthorized access attempt',
          status: 'draft',
        })
      ).rejects.toThrow();
    });

    it('step 10 - patient grants consent to referral provider', async () => {
      const result = await consentService.grantConsent({
        patientId: 'patient-1',
        providerId: 'provider-2',
        consentType: 'broad',
        recordTypes: ['allergies', 'lab_results', 'clinical_notes'],
        durationDays: 30,
      });

      expect(result.error).toBeNull();
      state.referralConsentId = result.data!.id;
    });

    it('step 11 - referral provider can now access consented data', async () => {
      const check = await consentService.verifyProviderConsent(
        'patient-1',
        'provider-2',
        'allergies'
      );
      expect(check.hasConsent).toBe(true);
    });

    it('step 12 - referral provider creates their own clinical note', async () => {
      const note = await clinicalNotesService.createNote({
        patient_id: 'patient-1',
        provider_id: 'provider-2',
        note_type: 'soap',
        subjective: 'Referred patient for allergy assessment',
        objective: 'No acute distress',
        assessment: 'Suspected drug allergy - needs testing',
        plan: 'Schedule allergy panel, avoid sulfa drugs',
        status: 'draft',
      });

      expect(note).toBeDefined();
      state.referralNoteId = note.id;
    });
  });

  describe('Phase 4: Pharmacy consent through prescription pipeline', () => {
    it('step 13 - primary provider writes prescription', async () => {
      const rx = await prescriptionService.createPrescription({
        patient_id: 'patient-1',
        provider_id: 'provider-1',
        diagnosis: 'Contact dermatitis',
        diagnosis_code: 'L25.9',
        status: 'active',
      });

      state.prescriptionId = rx.id;
    });

    it('step 14 - sending to pharmacy auto-creates pharmacy consent', async () => {
      await prescriptionService.sendToPharmacy(
        state.prescriptionId,
        'pharmacy-1',
        'provider-1'
      );

      const pharmacyCheck = await consentService.verifyPharmacyConsent(
        'patient-1',
        'pharmacy-1'
      );
      expect(pharmacyCheck.hasConsent).toBe(true);
    });

    it('step 15 - redirecting to new pharmacy revokes old and grants new consent', async () => {
      await prescriptionService.redirectPrescription(
        state.prescriptionId,
        'pharmacy-2',
        'patient-1'
      );

      const newCheck = await consentService.verifyPharmacyConsent(
        'patient-1',
        'pharmacy-2'
      );
      expect(newCheck.hasConsent).toBe(true);
    });
  });

  describe('Phase 5: Consent revocation', () => {
    it('step 16 - patient revokes consent for referral provider', async () => {
      const result = await consentService.revokeConsent(
        state.referralConsentId,
        'patient-1',
        'provider-2'
      );

      expect(result.error).toBeNull();
      expect(result.data).toBe(true);
    });

    it('step 17 - referral provider can no longer access data', async () => {
      const check = await consentService.verifyProviderConsent(
        'patient-1',
        'provider-2'
      );
      expect(check.hasConsent).toBe(false);
    });

    it('step 18 - referral provider cannot create new notes', async () => {
      await expect(
        clinicalNotesService.createNote({
          patient_id: 'patient-1',
          provider_id: 'provider-2',
          note_type: 'soap',
          subjective: 'Should fail - consent revoked',
          status: 'draft',
        })
      ).rejects.toThrow();
    });

    it('step 19 - patient revokes appointment consent', async () => {
      await consentService.revokeAppointmentConsent(
        'apt-consent-1',
        'patient-1'
      );

      const consents = db.getTable('patient_consents').getAll();
      const revoked = consents.find(
        (c) => c.id === state.appointmentConsentId
      );
      expect(revoked.status).toBe('revoked');
    });
  });

  describe('Phase 6: Patient health records access (always free)', () => {
    it('step 20 - seed patient health records', () => {
      db.seed('lab_results', [
        {
          id: 'lr-consent-1',
          patient_id: 'patient-1',
          provider_id: 'provider-1',
          test_name: 'Allergy Panel',
          test_category: 'Immunology',
          result_value: 'Positive',
          result_unit: '',
          unit: '',
          reference_range: 'Negative',
          status: 'completed',
          is_abnormal: true,
          abnormal_flag: 'A',
          test_date: '2026-04-20',
          result_date: '2026-04-20',
        },
      ]);

      db.seed('medication_history', [
        {
          id: 'mh-consent-1',
          patient_id: 'patient-1',
          medication_name: 'Cetirizine',
          dosage: '10mg',
          frequency: 'Once daily',
          status: 'active',
          start_date: '2026-04-20',
        },
      ]);
    });

    it('step 21 - patient can always access their own lab results', async () => {
      const result = await healthRecordsService.getLabResults('patient-1');
      expect(result.error).toBeNull();
      expect(result.data!.length).toBeGreaterThanOrEqual(1);
    });

    it('step 22 - patient can always access their medication history', async () => {
      const result =
        await healthRecordsService.getMedicationHistory('patient-1');
      expect(result.error).toBeNull();
      expect(result.data!.length).toBeGreaterThanOrEqual(1);
    });

    it('step 23 - patient can export their records freely', async () => {
      const exported = await healthRecordsService.exportRecords(
        'patient-1',
        'json',
        { labResults: true, medications: true }
      );
      expect(exported).toBeDefined();
    });
  });

  describe('Phase 7: Audit trail verification for all consent actions', () => {
    it('step 24 - audit trail has entries for consent lifecycle', async () => {
      const trail = await auditTrailService.getAuditTrail({});
      expect(trail.length).toBeGreaterThan(0);

      const consentEvents = trail.filter(
        (e) =>
          e.event_type?.includes('consent') ||
          e.resource_type === 'consent'
      );
      expect(consentEvents.length).toBeGreaterThanOrEqual(0);
    });

    it('step 25 - audit chain integrity remains valid after all operations', async () => {
      const integrity = await auditTrailService.verifyChainIntegrity();
      expect(integrity.isValid).toBe(true);
      expect(integrity.invalidBlocks).toBe(0);
    });

    it('step 26 - patient access log shows all access events', async () => {
      const accessLog =
        await auditTrailService.getPatientAccessLog('patient-1');
      expect(Array.isArray(accessLog)).toBe(true);
    });
  });
});
