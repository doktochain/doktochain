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

import { healthRecordsService } from '../../services/healthRecordsService';
import { consentService } from '../../services/consentService';

function seedHealthData() {
  db.seed('lab_results', [
    {
      id: 'lab-1',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      test_name: 'Complete Blood Count',
      test_category: 'hematology',
      result_value: '14.5',
      result_unit: 'g/dL',
      reference_range: '12.0-17.5',
      status: 'completed',
      is_abnormal: false,
      test_date: '2026-03-01',
      result_date: '2026-03-01',
    },
    {
      id: 'lab-2',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      test_name: 'Blood Glucose',
      test_category: 'chemistry',
      result_value: '105',
      result_unit: 'mg/dL',
      reference_range: '70-100',
      status: 'completed',
      is_abnormal: true,
      abnormal_flag: 'H',
      test_date: '2026-03-10',
      result_date: '2026-03-10',
    },
  ]);

  db.seed('medication_history', [
    {
      id: 'med-1',
      patient_id: 'patient-1',
      medication_name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily',
      prescribing_provider_id: 'provider-1',
      status: 'active',
      start_date: '2026-01-01',
    },
  ]);

  db.seed('allergies', [
    {
      id: 'allergy-1',
      patient_id: 'patient-1',
      allergen: 'Penicillin',
      allergen_name: 'Penicillin',
      allergen_type: 'medication',
      severity: 'severe',
      reaction: 'Anaphylaxis',
      reaction_type: 'Anaphylaxis',
      status: 'active',
      reported_date: '2025-06-01',
      date_identified: '2025-06-01',
    },
  ]);

  db.seed('immunizations', [
    {
      id: 'imm-1',
      patient_id: 'patient-1',
      vaccine_name: 'Influenza',
      date_administered: '2026-01-15',
      administration_date: '2026-01-15',
      administered_by: 'provider-1',
      lot_number: 'LOT-123',
      dose_number: 1,
      status: 'completed',
    },
  ]);

  db.seed('clinical_notes', [
    {
      id: 'note-1',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      note_type: 'soap',
      content: 'Patient presents with mild hypertension',
      chief_complaint: 'mild hypertension',
      is_shared_with_patient: true,
      status: 'signed',
      visit_date: '2026-03-15',
      created_at: '2026-03-15T10:00:00Z',
    },
  ]);
}

describe('Integration: Health Records Access with Consent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.clear();
    seedHealthData();
  });

  afterEach(() => {
    db.clear();
  });

  describe('patient self-access (no consent needed)', () => {
    it('retrieves lab results without consent check', async () => {
      const results = await healthRecordsService.getLabResults('patient-1');
      expect(results.data!.length).toBe(2);
      expect(results.data![0].test_name).toBeDefined();
    });

    it('retrieves medication history', async () => {
      const meds = await healthRecordsService.getMedicationHistory('patient-1');
      expect(meds.data!.length).toBe(1);
      expect(meds.data![0].medication_name).toBe('Lisinopril');
    });

    it('retrieves allergies', async () => {
      const allergies = await healthRecordsService.getAllergies('patient-1');
      expect(allergies.data!.length).toBe(1);
      expect(allergies.data![0].allergen).toBe('Penicillin');
    });

    it('retrieves immunizations', async () => {
      const imms = await healthRecordsService.getImmunizations('patient-1');
      expect(imms.data!.length).toBe(1);
      expect(imms.data![0].vaccine_name).toBe('Influenza');
    });
  });

  describe('provider access requires consent', () => {
    it('allows access with valid consent', async () => {
      await consentService.grantConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        recordTypes: [],
      });

      const results = await healthRecordsService.getLabResults('patient-1', {
        providerId: 'provider-1',
      });
      expect(results.data!.length).toBe(2);

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    });

    it('denies access without consent', async () => {
      await expect(
        healthRecordsService.getLabResults('patient-1', {
          providerId: 'provider-no-consent',
        })
      ).rejects.toThrow();

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    });

    it('respects record type restrictions', async () => {
      await consentService.grantConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        recordTypes: ['lab_results'],
      });

      const labResults = await healthRecordsService.getLabResults('patient-1', {
        providerId: 'provider-1',
      });
      expect(labResults.data!.length).toBe(2);

      await expect(
        healthRecordsService.getMedicationHistory(
          'patient-1',
          undefined,
          'provider-1'
        )
      ).rejects.toThrow();
    });
  });

  describe('adding records with consent verification', () => {
    it('allows provider to add lab result with consent', async () => {
      await consentService.grantConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        recordTypes: [],
      });

      const result = await healthRecordsService.addLabResult({
        patient_id: 'patient-1',
        provider_id: 'provider-1',
        test_name: 'Thyroid Panel',
        test_category: 'endocrine',
        result_value: '2.5',
        result_unit: 'mIU/L',
        reference_range: '0.4-4.0',
        status: 'completed',
        is_abnormal: false,
        test_date: '2026-03-20',
      });

      expect(result.data).not.toBeNull();

      const allLabs = db.getTable('lab_results').getAll();
      expect(allLabs.length).toBe(3);

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const recordLog = auditLogs.find(
        (l) => l.event_type === 'record_accessed'
      );
      expect(recordLog).toBeDefined();
    });

    it('blocks provider from adding records without consent', async () => {
      await expect(
        healthRecordsService.addLabResult({
          patient_id: 'patient-1',
          provider_id: 'provider-no-consent',
          test_name: 'Test',
          test_category: 'test',
          result_value: '1',
          result_unit: 'unit',
          reference_range: '0-10',
          status: 'completed',
          is_abnormal: false,
          test_date: '2026-03-20',
        })
      ).rejects.toThrow();

      const allLabs = db.getTable('lab_results').getAll();
      expect(allLabs.length).toBe(2);
    });
  });

  describe('health timeline aggregation', () => {
    it('aggregates all record types into timeline', async () => {
      const timeline =
        await healthRecordsService.getHealthTimeline('patient-1');

      expect(timeline.length).toBeGreaterThanOrEqual(4);

      const types = timeline.map((e) => e.type);
      expect(types).toContain('lab');
      expect(types).toContain('medication');
      expect(types).toContain('allergy');
      expect(types).toContain('immunization');
    });

    it('sorts timeline by date descending', async () => {
      const timeline =
        await healthRecordsService.getHealthTimeline('patient-1');

      for (let i = 1; i < timeline.length; i++) {
        const prev = new Date(timeline[i - 1].date).getTime();
        const curr = new Date(timeline[i].date).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe('FHIR export', () => {
    it('exports records as JSON', async () => {
      const exported = await healthRecordsService.exportRecords(
        'patient-1',
        'json'
      );

      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported as string);
      expect(parsed).toBeDefined();

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const exportLog = auditLogs.find(
        (l) => l.event_type === 'record_exported'
      );
      expect(exportLog).toBeDefined();
    });

    it('exports records as FHIR bundle', async () => {
      const exported = await healthRecordsService.exportRecords(
        'patient-1',
        'fhir'
      );

      expect(exported).toBeDefined();
      const bundle = JSON.parse(exported as string);
      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.type).toBe('collection');
      expect(bundle.entry.length).toBeGreaterThan(0);
    });
  });

  describe('record sharing and revocation', () => {
    it('creates share record and then revokes it', async () => {
      const share = await healthRecordsService.createRecordShare({
        patient_id: 'patient-1',
        shared_with_email: 'dr.smith@hospital.ca',
        record_types: ['lab_results', 'medications'],
        status: 'active',
        expires_at: '2026-06-01',
      });

      expect(share.data).not.toBeNull();

      const shares = db.getTable('record_shares').getAll();
      expect(shares.length).toBe(1);
      expect(shares[0].status).toBe('active');

      await healthRecordsService.revokeRecordShare(shares[0].id);

      const updatedShares = db.getTable('record_shares').getAll();
      expect(updatedShares[0].status).toBe('revoked');

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const eventTypes = auditLogs.map((l) => l.event_type);
      expect(eventTypes).toContain('record_shared');
    });
  });

  describe('pure utility functions', () => {
    it('returns correct test categories', () => {
      const categories = healthRecordsService.getTestCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(
        categories.some((c: string) => c.toLowerCase().includes('hematology'))
      ).toBe(true);
      expect(
        categories.some((c: string) => c.toLowerCase().includes('chemistry'))
      ).toBe(true);
    });

    it('returns correct severity colors', () => {
      const mild = healthRecordsService.getSeverityColor('mild');
      const moderate = healthRecordsService.getSeverityColor('moderate');
      const severe = healthRecordsService.getSeverityColor('severe');
      expect(mild).toContain('yellow');
      expect(moderate).toContain('orange');
      expect(severe).toContain('red');
    });
  });
});
