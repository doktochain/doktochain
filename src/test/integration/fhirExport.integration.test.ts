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

import { fhirResourceFactory } from '../../services/fhirResourceFactory';
import { healthRecordsService } from '../../services/healthRecordsService';

describe('Integration: FHIR Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.clear();
  });

  afterEach(() => {
    db.clear();
  });

  describe('FHIR Observation creation from vitals', () => {
    it('creates single observation with LOINC code', async () => {
      const obs = await fhirResourceFactory.createObservation({
        patientId: 'patient-1',
        providerId: 'provider-1',
        appointmentId: 'apt-1',
        code: '8867-4',
        display: 'Heart Rate',
        category: 'vital-signs',
        valueQuantity: 72,
        valueUnit: '/min',
      });

      expect(obs).toBeDefined();
      expect(obs.observation_code).toBe('8867-4');
      expect(obs.observation_display).toBe('Heart Rate');
      expect(obs.value_quantity).toBe(72);
      expect(obs.status).toBe('final');
      expect(obs.data_hash).toBeDefined();

      const observations = db.getTable('fhir_observations').getAll();
      expect(observations.length).toBe(1);

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const fhirLog = auditLogs.find(
        (l) => l.action_data?.action === 'fhir_resource_created'
      );
      expect(fhirLog).toBeDefined();
      expect(fhirLog!.action_data.resource_type).toBe('Observation');
    });

    it('creates blood pressure observation with components', async () => {
      const obs = await fhirResourceFactory.createObservation({
        patientId: 'patient-1',
        providerId: 'provider-1',
        code: '85354-9',
        display: 'Blood Pressure',
        category: 'vital-signs',
        components: [
          {
            code: '8480-6',
            display: 'Systolic Blood Pressure',
            value: 120,
            unit: 'mmHg',
          },
          {
            code: '8462-4',
            display: 'Diastolic Blood Pressure',
            value: 80,
            unit: 'mmHg',
          },
        ],
      });

      expect(obs.components).toBeDefined();
      expect(obs.components.length).toBe(2);

      const systolicComponent = obs.components[0];
      expect(systolicComponent.code.coding[0].code).toBe('8480-6');
      expect(systolicComponent.valueQuantity.value).toBe(120);
    });

    it('creates multiple observations from vitals set', async () => {
      const result =
        await fhirResourceFactory.createObservationsFromVitals({
          patientId: 'patient-1',
          providerId: 'provider-1',
          appointmentId: 'apt-1',
          vitals: {
            blood_pressure_systolic: 120,
            blood_pressure_diastolic: 80,
            heart_rate: 72,
            temperature: 36.6,
            temperature_unit: 'C',
            weight: 75,
            height: 180,
            respiratory_rate: 16,
            oxygen_saturation: 98,
          },
        });

      expect(result.length).toBeGreaterThanOrEqual(5);

      const observations = db.getTable('fhir_observations').getAll();
      expect(observations.length).toBeGreaterThanOrEqual(5);

      const codes = observations.map((o) => o.observation_code);
      expect(codes).toContain('85354-9');
      expect(codes).toContain('8867-4');
      expect(codes).toContain('8310-5');
      expect(codes).toContain('29463-7');
      expect(codes).toContain('8302-2');
    });

    it('converts Fahrenheit to Celsius for temperature', async () => {
      const result =
        await fhirResourceFactory.createObservationsFromVitals({
          patientId: 'patient-1',
          providerId: 'provider-1',
          vitals: {
            temperature: 98.6,
            temperature_unit: 'F',
          },
        });

      expect(result.length).toBe(1);
      expect(result[0].value_quantity).toBeCloseTo(37.0, 0);
      expect(result[0].value_unit).toBe('Cel');
    });
  });

  describe('data hash integrity', () => {
    it('generates unique hash per observation', async () => {
      const obs1 = await fhirResourceFactory.createObservation({
        patientId: 'patient-1',
        code: '8867-4',
        display: 'Heart Rate',
        category: 'vital-signs',
        valueQuantity: 72,
        valueUnit: '/min',
      });

      const obs2 = await fhirResourceFactory.createObservation({
        patientId: 'patient-1',
        code: '8867-4',
        display: 'Heart Rate',
        category: 'vital-signs',
        valueQuantity: 80,
        valueUnit: '/min',
      });

      expect(obs1.data_hash).toBeDefined();
      expect(obs2.data_hash).toBeDefined();
      expect(obs1.data_hash).not.toBe(obs2.data_hash);
    });
  });

  describe('FHIR bundle export via healthRecordsService', () => {
    it('exports complete FHIR R4 bundle with all record types', async () => {
      db.seed('lab_results', [
        {
          id: 'lab-1',
          patient_id: 'patient-1',
          test_name: 'Hemoglobin',
          test_category: 'hematology',
          result_value: '14.2',
          result_unit: 'g/dL',
          reference_range: '12.0-17.5',
          status: 'completed',
          test_date: '2026-03-01',
        },
      ]);

      db.seed('medication_history', [
        {
          id: 'med-1',
          patient_id: 'patient-1',
          medication_name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          status: 'active',
          start_date: '2026-01-01',
        },
      ]);

      db.seed('allergies', [
        {
          id: 'allergy-1',
          patient_id: 'patient-1',
          allergen: 'Penicillin',
          severity: 'severe',
          reaction: 'Rash',
          status: 'active',
        },
      ]);

      db.seed('immunizations', [
        {
          id: 'imm-1',
          patient_id: 'patient-1',
          vaccine_name: 'COVID-19',
          date_administered: '2026-01-15',
          status: 'completed',
        },
      ]);

      const exported = await healthRecordsService.exportRecords(
        'patient-1',
        'fhir'
      );

      const bundle = JSON.parse(exported as string);
      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.type).toBe('collection');
      expect(bundle.entry.length).toBeGreaterThan(0);

      const resourceTypes = bundle.entry.map(
        (e: any) => e.resource.resourceType
      );
      expect(resourceTypes).toContain('Observation');
      expect(resourceTypes).toContain('MedicationRequest');
      expect(resourceTypes).toContain('AllergyIntolerance');
      expect(resourceTypes).toContain('Immunization');
    });

    it('exports with record type filter', async () => {
      db.seed('lab_results', [
        {
          id: 'lab-1',
          patient_id: 'patient-1',
          test_name: 'CBC',
          test_category: 'hematology',
          result_value: '14',
          result_unit: 'g/dL',
          status: 'completed',
          test_date: '2026-03-01',
        },
      ]);

      db.seed('allergies', [
        {
          id: 'allergy-1',
          patient_id: 'patient-1',
          allergen: 'Latex',
          severity: 'mild',
          status: 'active',
        },
      ]);

      const exported = await healthRecordsService.exportRecords(
        'patient-1',
        'fhir',
        { labResults: true }
      );

      const bundle = JSON.parse(exported as string);
      const resourceTypes = bundle.entry.map(
        (e: any) => e.resource.resourceType
      );
      expect(resourceTypes).toContain('Observation');
      expect(resourceTypes).not.toContain('AllergyIntolerance');
    });

    it('logs export event to audit trail', async () => {
      db.seed('lab_results', []);
      db.seed('medication_history', []);
      db.seed('allergies', []);
      db.seed('immunizations', []);

      await healthRecordsService.exportRecords('patient-1', 'fhir');

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const exportLog = auditLogs.find(
        (l) => l.event_type === 'record_exported'
      );
      expect(exportLog).toBeDefined();
      expect(exportLog!.action_data.format).toBe('fhir');
    });
  });
});
