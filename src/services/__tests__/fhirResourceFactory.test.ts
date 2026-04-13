import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');
vi.mock('../blockchainAuditService', () => ({
  blockchainAuditService: { logEvent: vi.fn().mockResolvedValue(undefined) },
}));

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(),
    eq: vi.fn(), neq: vi.fn(),
    order: vi.fn(), limit: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

const { fhirResourceFactory } = await import('../fhirResourceFactory');

describe('fhirResourceFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createObservation', () => {
    it('inserts observation with data hash', async () => {
      const obs = { id: 'obs1', observation_code: '8867-4' };
      const chain = chainMock({ data: obs, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await fhirResourceFactory.createObservation({
        patientId: 'pat1',
        providerId: 'prov1',
        code: '8867-4',
        display: 'Heart Rate',
        category: 'vital-signs',
        valueQuantity: 72,
        valueUnit: '/min',
      });

      expect(result).toEqual(obs);
      expect(supabase.from).toHaveBeenCalledWith('fhir_observations');
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          patient_id: 'pat1',
          observation_code: '8867-4',
          data_hash: expect.any(String),
        })
      );
    });

    it('uses LOINC display when code matches', async () => {
      const chain = chainMock({ data: { id: 'obs1' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await fhirResourceFactory.createObservation({
        patientId: 'pat1',
        code: '8867-4',
        display: '',
        category: 'vital-signs',
      });

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          observation_display: 'Heart Rate',
        })
      );
    });

    it('handles components for blood pressure', async () => {
      const chain = chainMock({ data: { id: 'obs1' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await fhirResourceFactory.createObservation({
        patientId: 'pat1',
        code: '85354-9',
        display: 'Blood Pressure',
        category: 'vital-signs',
        components: [
          { code: '8480-6', display: 'Systolic', value: 120, unit: 'mmHg' },
          { code: '8462-4', display: 'Diastolic', value: 80, unit: 'mmHg' },
        ],
      });

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({
              code: expect.objectContaining({
                coding: expect.arrayContaining([
                  expect.objectContaining({ code: '8480-6' }),
                ]),
              }),
            }),
          ]),
        })
      );
    });
  });

  describe('createCondition', () => {
    it('inserts condition with ICD-10 code', async () => {
      const condition = { id: 'cond1', condition_code: 'J06.9' };
      const chain = chainMock({ data: condition, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await fhirResourceFactory.createCondition({
        patientId: 'pat1',
        providerId: 'prov1',
        conditionCode: 'J06.9',
        conditionDisplay: 'Upper Respiratory Infection',
        icd10Code: 'J06.9',
      });

      expect(result).toEqual(condition);
      expect(supabase.from).toHaveBeenCalledWith('fhir_conditions');
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          icd10_code: 'J06.9',
          clinical_status: 'active',
          verification_status: 'confirmed',
          data_hash: expect.any(String),
        })
      );
    });
  });

  describe('createConditionsFromDiagnoses', () => {
    it('creates a condition for each diagnosis code', async () => {
      const chain = chainMock({ data: { id: 'cond1' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await fhirResourceFactory.createConditionsFromDiagnoses({
        patientId: 'pat1',
        providerId: 'prov1',
        diagnosisCodes: ['J06.9', 'R05'],
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('createMedicationRequest', () => {
    it('inserts medication request with correct defaults', async () => {
      const medReq = { id: 'mr1', status: 'active' };
      const chain = chainMock({ data: medReq, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await fhirResourceFactory.createMedicationRequest({
        patientId: 'pat1',
        providerId: 'prov1',
        medicationCode: 'MED001',
        medicationDisplay: 'Amoxicillin 500mg',
        numberOfRefills: 3,
      });

      expect(result).toEqual(medReq);
      expect(supabase.from).toHaveBeenCalledWith('fhir_medication_requests');
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          intent: 'order',
          number_of_refills: 3,
          refills_remaining: 3,
        })
      );
    });
  });

  describe('createAllergyIntolerance', () => {
    it('inserts allergy with default category', async () => {
      const allergy = { id: 'ai1', allergen_code: 'PENICILLIN' };
      const chain = chainMock({ data: allergy, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await fhirResourceFactory.createAllergyIntolerance({
        patientId: 'pat1',
        allergenCode: 'PENICILLIN',
        allergenDisplay: 'Penicillin',
      });

      expect(result).toEqual(allergy);
      expect(supabase.from).toHaveBeenCalledWith('fhir_allergy_intolerances');
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          allergy_type: 'allergy',
          category: ['medication'],
          clinical_status: 'active',
          verification_status: 'confirmed',
        })
      );
    });
  });

  describe('createImmunization', () => {
    it('inserts immunization record', async () => {
      const immunization = { id: 'imm1', vaccine_name: 'COVID-19' };
      const chain = chainMock({ data: immunization, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await fhirResourceFactory.createImmunization({
        patientId: 'pat1',
        vaccineName: 'COVID-19 mRNA',
        doseNumber: 1,
        administrationDate: '2025-01-15',
      });

      expect(result).toEqual(immunization);
      expect(supabase.from).toHaveBeenCalledWith('immunizations');
    });
  });
});
