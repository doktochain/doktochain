import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');
vi.mock('../consentService', () => ({
  consentService: { verifyProviderConsent: vi.fn().mockResolvedValue({ hasConsent: true, consent: { id: 'c1' } }) },
}));
vi.mock('../blockchainAuditService', () => ({
  blockchainAuditService: { logEvent: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../auditLogger', () => ({
  auditLog: { clinicalNoteCreated: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../fhirResourceFactory', () => ({
  fhirResourceFactory: { createConditionsFromDiagnoses: vi.fn().mockResolvedValue([]) },
}));

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), or: vi.fn(), order: vi.fn(), limit: vi.fn(),
    ilike: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

const { clinicalNotesService } = await import('../clinicalNotesService');

describe('clinicalNotesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateBMI', () => {
    it('calculates BMI correctly in metric units (kg/cm)', () => {
      const bmi = clinicalNotesService.calculateBMI(70, 'kg', 175, 'cm');
      expect(bmi).toBeCloseTo(22.9, 0);
    });

    it('calculates BMI correctly in imperial units (lbs/in)', () => {
      const bmi = clinicalNotesService.calculateBMI(154, 'lbs', 69, 'in');
      expect(bmi).toBeCloseTo(22.7, 0);
    });

    it('handles mixed units (kg/in)', () => {
      const bmi = clinicalNotesService.calculateBMI(70, 'kg', 69, 'in');
      expect(bmi).toBeGreaterThan(20);
      expect(bmi).toBeLessThan(30);
    });

    it('handles mixed units (lbs/cm)', () => {
      const bmi = clinicalNotesService.calculateBMI(154, 'lbs', 175, 'cm');
      expect(bmi).toBeGreaterThan(20);
      expect(bmi).toBeLessThan(30);
    });

    it('returns correct BMI for underweight person', () => {
      const bmi = clinicalNotesService.calculateBMI(45, 'kg', 170, 'cm');
      expect(bmi).toBeLessThan(18.5);
    });

    it('returns correct BMI for obese person', () => {
      const bmi = clinicalNotesService.calculateBMI(120, 'kg', 170, 'cm');
      expect(bmi).toBeGreaterThan(30);
    });

    it('rounds to one decimal place', () => {
      const bmi = clinicalNotesService.calculateBMI(70, 'kg', 175, 'cm');
      const decimals = bmi.toString().split('.')[1];
      expect(!decimals || decimals.length <= 1).toBe(true);
    });
  });

  describe('createNote', () => {
    it('inserts a clinical note into the database', async () => {
      const mockNote = { id: 'n1', note_type: 'SOAP', is_finalized: false };
      const chain = chainMock({ data: mockNote, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await clinicalNotesService.createNote({
        appointment_id: 'appt-1',
        patient_id: 'p1',
        provider_id: 'prov1',
        note_type: 'SOAP',
      });

      expect(result).toEqual(mockNote);
      expect(supabase.from).toHaveBeenCalledWith('clinical_notes');
    });
  });

  describe('getProviderNotes', () => {
    it('queries notes by provider_id', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await clinicalNotesService.getProviderNotes('prov1');
      expect(chain.eq).toHaveBeenCalledWith('provider_id', 'prov1');
    });
  });

  describe('searchDiagnosisCodes', () => {
    it('searches icd10_codes table', async () => {
      const chain = chainMock({ data: [{ code: 'J06.9', description: 'Acute upper respiratory infection' }], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const results = await clinicalNotesService.searchDiagnosisCodes('respiratory');
      expect(supabase.from).toHaveBeenCalledWith('icd10_codes');
    });
  });

  describe('searchProcedureCodes', () => {
    it('searches procedure_codes table', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await clinicalNotesService.searchProcedureCodes('blood');
      expect(supabase.from).toHaveBeenCalledWith('procedure_codes');
    });
  });
});
