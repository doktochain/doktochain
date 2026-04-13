import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../consentService', () => ({
  consentService: {
    verifyProviderConsent: vi.fn().mockResolvedValue({ hasConsent: true, consent: { id: 'c1' } }),
  },
}));

vi.mock('../blockchainAuditService', () => ({
  blockchainAuditService: {
    logEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../auditLogger', () => ({
  auditLog: {
    dataAccessed: vi.fn().mockResolvedValue(undefined),
  },
}));

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), in: vi.fn(), gte: vi.fn(), lte: vi.fn(), or: vi.fn(), is: vi.fn(),
    order: vi.fn(), limit: vi.fn(), ilike: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

import { supabase } from '../../lib/supabase';
import { consentService } from '../consentService';
import { healthRecordsService } from '../healthRecordsService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('healthRecordsService', () => {
  describe('getLabResults', () => {
    it('returns lab results for patient', async () => {
      const labs = [{ id: 'l1', test_name: 'CBC' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: labs, error: null }));

      const result = await healthRecordsService.getLabResults('pat1');
      expect(result.data).toEqual(labs);
    });

    it('checks consent when providerId given', async () => {
      (supabase.from as any).mockReturnValue(chainMock({ data: [], error: null }));
      await healthRecordsService.getLabResults('pat1', { providerId: 'prov1' });
      expect(consentService.verifyProviderConsent).toHaveBeenCalledWith('pat1', 'prov1', 'lab_results');
    });

    it('throws when consent denied', async () => {
      (consentService.verifyProviderConsent as any).mockResolvedValue({ hasConsent: false, reason: 'No consent' });
      await expect(healthRecordsService.getLabResults('pat1', { providerId: 'prov1' })).rejects.toThrow('No consent');
    });

    it('applies category filter', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await healthRecordsService.getLabResults('pat1', { category: 'Hematology' });
      expect(chain.eq).toHaveBeenCalledWith('test_category', 'Hematology');
    });

    it('applies date range filters', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await healthRecordsService.getLabResults('pat1', { startDate: '2025-01-01', endDate: '2025-12-31' });
      expect(chain.gte).toHaveBeenCalledWith('result_date', '2025-01-01');
      expect(chain.lte).toHaveBeenCalledWith('result_date', '2025-12-31');
    });
  });

  describe('getMedicationHistory', () => {
    it('returns medications for patient', async () => {
      const meds = [{ id: 'm1', medication_name: 'Metformin' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: meds, error: null }));

      const result = await healthRecordsService.getMedicationHistory('pat1');
      expect(result.data).toEqual(meds);
    });

    it('filters by status', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await healthRecordsService.getMedicationHistory('pat1', 'active');
      expect(chain.eq).toHaveBeenCalledWith('status', 'active');
    });
  });

  describe('getAllergies', () => {
    it('returns allergies for patient', async () => {
      const allergies = [{ id: 'a1', allergen_name: 'Penicillin' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: allergies, error: null }));

      const result = await healthRecordsService.getAllergies('pat1');
      expect(result.data).toEqual(allergies);
    });
  });

  describe('getImmunizations', () => {
    it('returns immunizations for patient', async () => {
      const immuns = [{ id: 'i1', vaccine_name: 'COVID-19' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: immuns, error: null }));

      const result = await healthRecordsService.getImmunizations('pat1');
      expect(result.data).toEqual(immuns);
    });
  });

  describe('getClinicalNotes', () => {
    it('returns shared clinical notes', async () => {
      const notes = [{ id: 'n1', note_type: 'visit_note' }];
      const chain = chainMock({ data: notes, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await healthRecordsService.getClinicalNotes('pat1');
      expect(result.data).toEqual(notes);
      expect(chain.eq).toHaveBeenCalledWith('is_shared_with_patient', true);
    });

    it('filters by note type', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await healthRecordsService.getClinicalNotes('pat1', 'progress_note');
      expect(chain.eq).toHaveBeenCalledWith('note_type', 'progress_note');
    });
  });

  describe('addLabResult', () => {
    it('inserts lab result and returns data', async () => {
      const lab = { id: 'l1', test_name: 'CBC' };
      const chain = chainMock({ data: lab, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await healthRecordsService.addLabResult({
        patient_id: 'pat1',
        test_name: 'CBC',
        test_category: 'Hematology',
        result_value: '5.0',
        unit: 'x10^9/L',
        abnormal_flag: 'normal',
        order_date: '2025-01-01',
        result_date: '2025-01-02',
      });

      expect(result.data).toEqual(lab);
    });

    it('checks consent when provider_id given', async () => {
      (consentService.verifyProviderConsent as any).mockResolvedValue({ hasConsent: true });
      const chain = chainMock({ data: { id: 'l1' }, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await healthRecordsService.addLabResult({
        patient_id: 'pat1',
        provider_id: 'prov1',
        test_name: 'CBC',
        test_category: 'Hematology',
        result_value: '5.0',
        unit: 'x10^9/L',
        abnormal_flag: 'normal',
        order_date: '2025-01-01',
        result_date: '2025-01-02',
      });
      expect(consentService.verifyProviderConsent).toHaveBeenCalled();
    });
  });

  describe('addImmunization', () => {
    it('inserts immunization without consent check', async () => {
      const immun = { id: 'i1' };
      const chain = chainMock({ data: immun, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await healthRecordsService.addImmunization({
        patient_id: 'pat1',
        vaccine_name: 'Influenza',
        dose_number: 1,
        administration_date: '2025-10-01',
        location_administered: 'Clinic A',
        administering_provider: 'Dr. Smith',
      });

      expect(result.data).toEqual(immun);
      expect(consentService.verifyProviderConsent).not.toHaveBeenCalled();
    });
  });

  describe('createRecordShare', () => {
    it('inserts share record', async () => {
      const share = { id: 's1' };
      const chain = chainMock({ data: share, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await healthRecordsService.createRecordShare({
        patient_id: 'pat1',
        shared_with_email: 'doc@example.com',
        record_types: ['lab', 'medication'],
        share_start_date: '2025-01-01',
        status: 'active',
      });

      expect(result.data).toEqual(share);
    });
  });

  describe('revokeRecordShare', () => {
    it('sets share status to revoked', async () => {
      const revoked = { id: 's1', status: 'revoked', patient_id: 'pat1', shared_with_email: 'doc@ex.com' };
      const chain = chainMock({ data: revoked, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await healthRecordsService.revokeRecordShare('s1');
      expect(result.data.status).toBe('revoked');
    });
  });

  describe('deleteRecord', () => {
    it('deletes record from specified table', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await healthRecordsService.deleteRecord('lab_results', 'l1', 'pat1');
      expect(supabase.from).toHaveBeenCalledWith('lab_results');
      expect(chain.delete).toHaveBeenCalled();
    });
  });

  describe('getHealthTimeline', () => {
    it('aggregates all record types sorted by date', async () => {
      const labData = [{ id: 'l1', result_date: '2025-03-01', test_name: 'CBC', result_value: '5.0', unit: 'x10^9/L', test_category: 'Hematology', abnormal_flag: 'normal' }];
      const medData = [{ id: 'm1', start_date: '2025-02-01', medication_name: 'Metformin', dosage: '500mg', frequency: 'daily' }];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'lab_results') return chainMock({ data: labData, error: null });
        if (table === 'medication_history') return chainMock({ data: medData, error: null });
        return chainMock({ data: [], error: null });
      });

      const timeline = await healthRecordsService.getHealthTimeline('pat1');
      expect(timeline.length).toBeGreaterThanOrEqual(2);
      expect(new Date(timeline[0].date).getTime()).toBeGreaterThanOrEqual(new Date(timeline[1].date).getTime());
    });
  });

  describe('exportRecords', () => {
    it('exports as JSON with all record types', async () => {
      (supabase.from as any).mockReturnValue(chainMock({ data: [], error: null }));

      const json = await healthRecordsService.exportRecords('pat1', 'json');
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('labResults');
      expect(parsed).toHaveProperty('medications');
      expect(parsed).toHaveProperty('allergies');
      expect(parsed).toHaveProperty('immunizations');
      expect(parsed).toHaveProperty('clinicalNotes');
      expect(parsed).toHaveProperty('exportDate');
    });

    it('exports as FHIR bundle', async () => {
      const labs = [{ id: 'l1', result_date: '2025-01-01', test_name: 'Glucose', result_value: '5.5', unit: 'mmol/L', abnormal_flag: 'normal', test_category: 'Chemistry' }];
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'lab_results') return chainMock({ data: labs, error: null });
        return chainMock({ data: [], error: null });
      });

      const fhirJson = await healthRecordsService.exportRecords('pat1', 'fhir');
      const bundle = JSON.parse(fhirJson);
      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.type).toBe('collection');
      expect(bundle.entry.length).toBeGreaterThanOrEqual(1);
      expect(bundle.entry[0].resource.resourceType).toBe('Observation');
    });

    it('respects selectedRecords filter', async () => {
      (supabase.from as any).mockReturnValue(chainMock({ data: [], error: null }));

      const json = await healthRecordsService.exportRecords('pat1', 'json', { labResults: true, medications: false });
      const parsed = JSON.parse(json);
      expect(parsed.labResults).toBeDefined();
    });
  });

  describe('pure functions', () => {
    it('getTestCategories returns expected categories', () => {
      const cats = healthRecordsService.getTestCategories();
      expect(cats).toContain('Chemistry');
      expect(cats).toContain('Hematology');
      expect(cats).toContain('Microbiology');
      expect(cats.length).toBe(9);
    });

    it('getSeverityColor returns correct classes', () => {
      expect(healthRecordsService.getSeverityColor('mild')).toContain('yellow');
      expect(healthRecordsService.getSeverityColor('moderate')).toContain('orange');
      expect(healthRecordsService.getSeverityColor('severe')).toContain('red-600');
      expect(healthRecordsService.getSeverityColor('life-threatening')).toContain('red-800');
      expect(healthRecordsService.getSeverityColor('unknown')).toContain('gray');
    });

    it('getAbnormalFlagColor returns correct classes', () => {
      expect(healthRecordsService.getAbnormalFlagColor('normal')).toContain('green');
      expect(healthRecordsService.getAbnormalFlagColor('high')).toContain('orange');
      expect(healthRecordsService.getAbnormalFlagColor('low')).toContain('blue');
      expect(healthRecordsService.getAbnormalFlagColor('critical')).toContain('red');
      expect(healthRecordsService.getAbnormalFlagColor('unknown')).toContain('gray');
    });
  });
});
