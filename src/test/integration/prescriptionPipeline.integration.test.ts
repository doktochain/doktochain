import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from './helpers/testContext';

vi.unmock('@/services/auditTrailService');
vi.unmock('@/services/blockchainAuditService');

vi.mock('@/lib/supabase', async () => {
  const ctx = await import('./helpers/testContext');
  return {
    supabase: ctx.mockSupabase,
    getCurrentUser: vi.fn(),
    getUserProfile: vi.fn(),
    getUserRoles: vi.fn(),
  };
});

import { consentService } from '../../services/consentService';
import { pharmacyPrescriptionService } from '../../services/pharmacyPrescriptionService';

function seedPrescriptionData() {
  db.seed('patient_consents', [
    {
      id: 'consent-pharm-1',
      patient_id: 'patient-1',
      pharmacy_id: 'pharmacy-1',
      consent_type: 'data_sharing',
      consent_scope: 'broad',
      record_types: [],
      start_date: '2026-01-01',
      end_date: '2027-01-01',
      status: 'active',
    },
  ]);

  db.seed('prescriptions', [
    {
      id: 'rx-1',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      pharmacy_id: 'pharmacy-1',
      medication_name: 'Amoxicillin',
      dosage: '500mg',
      frequency: 'Three times daily',
      quantity: 21,
      refills_remaining: 2,
      status: 'sent_to_pharmacy',
    },
    {
      id: 'rx-2',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      pharmacy_id: 'pharmacy-1',
      medication_name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily',
      quantity: 30,
      refills_remaining: 5,
      status: 'sent_to_pharmacy',
    },
    {
      id: 'rx-no-consent',
      patient_id: 'patient-2',
      provider_id: 'provider-1',
      pharmacy_id: 'pharmacy-1',
      medication_name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
      quantity: 60,
      status: 'sent_to_pharmacy',
    },
  ]);
}

describe('Integration: Prescription Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.clear();
    seedPrescriptionData();
  });

  afterEach(() => {
    db.clear();
  });

  describe('prescription queue with consent verification', () => {
    it('returns only consented prescriptions', async () => {
      const queue =
        await pharmacyPrescriptionService.getPrescriptionQueue('pharmacy-1');

      expect(queue).toBeDefined();
      expect(Array.isArray(queue)).toBe(true);

      const ids = queue.map((p: any) => p.id);
      expect(ids).toContain('rx-1');
      expect(ids).toContain('rx-2');
      expect(ids).not.toContain('rx-no-consent');
    });

    it('filters queue by status', async () => {
      db.getTable('prescriptions').insert({
        id: 'rx-validated',
        patient_id: 'patient-1',
        provider_id: 'provider-1',
        pharmacy_id: 'pharmacy-1',
        medication_name: 'Ibuprofen',
        status: 'validated',
      });

      const sentQueue =
        await pharmacyPrescriptionService.getPrescriptionQueue(
          'pharmacy-1',
          'sent_to_pharmacy'
        );
      const sentIds = sentQueue.map((p: any) => p.id);
      expect(sentIds).not.toContain('rx-validated');
    });
  });

  describe('prescription validation flow', () => {
    it('validates prescription and creates validation record', async () => {
      await pharmacyPrescriptionService.validatePrescription({
        prescription_id: 'rx-1',
        pharmacy_id: 'pharmacy-1',
        pharmacist_id: 'pharmacist-1',
        drug_interactions_checked: true,
        dosage_verified: true,
        insurance_verified: true,
        notes: 'All checks passed',
      });

      const validations = db.getTable('prescription_validations').getAll();
      expect(validations.length).toBe(1);
      expect(validations[0].prescription_id).toBe('rx-1');
      expect(validations[0].drug_interactions_checked).toBe(true);
    });
  });

  describe('prescription approval with audit trail', () => {
    it('approves prescription and logs to blockchain audit', async () => {
      await pharmacyPrescriptionService.approvePrescription(
        'rx-1',
        'pharmacy-1',
        'pharmacist-1'
      );

      const prescriptions = db.getTable('prescriptions').getAll();
      const rx = prescriptions.find((p) => p.id === 'rx-1');
      expect(rx!.status).toBe('approved');

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      expect(auditLogs.length).toBeGreaterThanOrEqual(1);

      const approvalLog = auditLogs.find(
        (l) => l.event_type === 'prescription_approved'
      );
      expect(approvalLog).toBeDefined();
      expect(approvalLog!.resource_id).toBe('rx-1');
    });
  });

  describe('prescription rejection with audit trail', () => {
    it('rejects prescription with reason and logs audit', async () => {
      await pharmacyPrescriptionService.rejectPrescription({
        prescription_id: 'rx-2',
        pharmacy_id: 'pharmacy-1',
        rejected_by: 'pharmacist-1',
        rejection_reason: 'Drug interaction detected with current medications',
        category: 'drug_interaction',
      });

      const prescriptions = db.getTable('prescriptions').getAll();
      const rx = prescriptions.find((p) => p.id === 'rx-2');
      expect(rx!.status).toBe('rejected');

      const rejections = db.getTable('prescription_rejections').getAll();
      expect(rejections.length).toBe(1);
      expect(rejections[0].rejection_reason).toBe(
        'Drug interaction detected with current medications'
      );

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const rejectionLog = auditLogs.find(
        (l) => l.event_type === 'prescription_rejected'
      );
      expect(rejectionLog).toBeDefined();
    });
  });

  describe('prescription action logging', () => {
    it('logs actions with complete trace', async () => {
      await pharmacyPrescriptionService.logPrescriptionAction(
        'rx-1',
        'pharmacy-1',
        'pharmacist-1',
        'received',
        { description: 'Prescription received at pharmacy' }
      );

      await pharmacyPrescriptionService.logPrescriptionAction(
        'rx-1',
        'pharmacy-1',
        'pharmacist-1',
        'processing',
        { description: 'Pharmacist reviewing prescription' }
      );

      const logs = db.getTable('prescription_audit_log').getAll();
      expect(logs.length).toBe(2);

      const actions = logs.map((l) => l.action);
      expect(actions).toContain('received');
      expect(actions).toContain('processing');
    });
  });

  describe('refill management', () => {
    it('approves refill request', async () => {
      db.seed('prescription_refill_requests', [
        {
          id: 'refill-1',
          prescription_id: 'rx-1',
          patient_id: 'patient-1',
          pharmacy_id: 'pharmacy-1',
          status: 'pending',
        },
      ]);

      await pharmacyPrescriptionService.approveRefill(
        'refill-1',
        'pharmacy-1',
        'pharmacist-1'
      );

      const refills = db.getTable('prescription_refill_requests').getAll();
      const refill = refills.find((r) => r.id === 'refill-1');
      expect(refill!.status).toBe('approved');
      expect(refill!.approved_by).toBe('pharmacist-1');
    });

    it('denies refill with reason', async () => {
      db.seed('prescription_refill_requests', [
        {
          id: 'refill-2',
          prescription_id: 'rx-2',
          patient_id: 'patient-1',
          pharmacy_id: 'pharmacy-1',
          status: 'pending',
        },
      ]);

      await pharmacyPrescriptionService.denyRefill(
        'refill-2',
        'Prescription expired, needs renewal'
      );

      const refills = db.getTable('prescription_refill_requests').getAll();
      const refill = refills.find((r) => r.id === 'refill-2');
      expect(refill!.status).toBe('denied');
      expect(refill!.denial_reason).toBe(
        'Prescription expired, needs renewal'
      );
    });
  });

  describe('pharmacy-provider communication', () => {
    it('sends message from pharmacy to provider about prescription', async () => {
      await pharmacyPrescriptionService.sendProviderMessage(
        'rx-1',
        'pharmacy-1',
        'Requesting dosage clarification for Amoxicillin'
      );

      const messages = db.getTable('pharmacy_communications').getAll();
      expect(messages.length).toBe(1);
      expect(messages[0].prescription_id).toBe('rx-1');
      expect(messages[0].pharmacy_id).toBe('pharmacy-1');
      expect(messages[0].communication_type).toBe('pharmacy-to-provider');
    });
  });

  describe('consent transfer on pharmacy redirect', () => {
    it('grants consent to new pharmacy and verifies access', async () => {
      const noConsent = await consentService.verifyPharmacyConsent(
        'patient-1',
        'pharmacy-2'
      );
      expect(noConsent.hasConsent).toBe(false);

      await consentService.grantPharmacyConsent({
        patientId: 'patient-1',
        pharmacyId: 'pharmacy-2',
        consentType: 'data_sharing',
        recordTypes: ['prescriptions'],
        durationDays: 365,
      });

      const hasConsent = await consentService.verifyPharmacyConsent(
        'patient-1',
        'pharmacy-2'
      );
      expect(hasConsent.hasConsent).toBe(true);

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const grantLog = auditLogs.find(
        (l) => l.event_type === 'consent_granted'
      );
      expect(grantLog).toBeDefined();
      expect(grantLog!.action_data.pharmacy_id).toBe('pharmacy-2');
    });
  });

  describe('drug interaction check', () => {
    it('returns interactions result (stub)', async () => {
      const result =
        await pharmacyPrescriptionService.checkDrugInteractions([
          'Amoxicillin',
        ]);

      expect(result).toBeDefined();
      expect(result.hasInteractions).toBe(false);
      expect(Array.isArray(result.interactions)).toBe(true);
    });
  });
});
