import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';
import { consentService, type ConsentRecord } from '../consentService';

vi.mock('@/lib/supabase');

function createMockConsent(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  return {
    id: 'consent-1',
    patient_id: 'patient-1',
    provider_id: 'provider-1',
    consent_type: 'treatment',
    consent_scope: 'broad',
    record_types: [],
    start_date: '2025-01-01',
    end_date: '2026-12-31',
    access_start: null,
    access_end: null,
    status: 'active',
    revoked_at: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function createThenableChain(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((key) => {
    if (key !== 'then') {
      chain[key].mockReturnValue(chain);
    }
  });
  return chain;
}

function mockSupabaseSelect(data: ConsentRecord[] | null, error: any = null) {
  const chain = createThenableChain({ data, error });
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

describe('consentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyProviderConsent', () => {
    it('returns hasConsent true for a broad consent within date range', async () => {
      const consent = createMockConsent({
        consent_scope: 'broad',
        start_date: '2025-01-01',
        end_date: '2030-12-31',
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(true);
      expect(result.consent).toEqual(consent);
      expect(result.consentScope).toBe('broad');
    });

    it('returns hasConsent false for broad consent with expired end_date', async () => {
      const consent = createMockConsent({
        consent_scope: 'broad',
        start_date: '2020-01-01',
        end_date: '2020-12-31',
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(false);
      expect(result.reason).toBe('No active consent for this patient');
    });

    it('returns hasConsent false for broad consent with future start_date', async () => {
      const consent = createMockConsent({
        consent_scope: 'broad',
        start_date: '2099-01-01',
        end_date: '2099-12-31',
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(false);
    });

    it('allows broad consent with no end_date (indefinite)', async () => {
      const consent = createMockConsent({
        consent_scope: 'broad',
        start_date: '2020-01-01',
        end_date: null,
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(true);
    });

    it('returns hasConsent true for appointment consent within time window', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 30 * 60 * 1000);
      const end = new Date(now.getTime() + 30 * 60 * 1000);

      const consent = createMockConsent({
        consent_scope: 'appointment',
        access_start: start.toISOString(),
        access_end: end.toISOString(),
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(true);
      expect(result.consentScope).toBe('appointment');
      expect(result.windowEnd).toBe(end.toISOString());
    });

    it('returns hasConsent false for appointment consent outside time window', async () => {
      const past = new Date(Date.now() - 3600 * 1000 * 2);
      const pastEnd = new Date(Date.now() - 3600 * 1000);

      const consent = createMockConsent({
        consent_scope: 'appointment',
        access_start: past.toISOString(),
        access_end: pastEnd.toISOString(),
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(false);
    });

    it('returns hasConsent false when appointment consent has no access_start/end', async () => {
      const consent = createMockConsent({
        consent_scope: 'appointment',
        access_start: null,
        access_end: null,
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(false);
    });

    it('filters by record type when specified', async () => {
      const consent = createMockConsent({
        consent_scope: 'broad',
        start_date: '2020-01-01',
        end_date: '2030-12-31',
        record_types: ['lab_results', 'vitals'],
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1', 'prescriptions');
      expect(result.hasConsent).toBe(false);
    });

    it('allows access when record type matches', async () => {
      const consent = createMockConsent({
        consent_scope: 'broad',
        start_date: '2020-01-01',
        end_date: '2030-12-31',
        record_types: ['lab_results', 'vitals'],
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1', 'vitals');
      expect(result.hasConsent).toBe(true);
    });

    it('allows access when record_types is empty (all types)', async () => {
      const consent = createMockConsent({
        consent_scope: 'broad',
        start_date: '2020-01-01',
        end_date: '2030-12-31',
        record_types: [],
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1', 'anything');
      expect(result.hasConsent).toBe(true);
    });

    it('returns error reason on database error', async () => {
      mockSupabaseSelect(null, { message: 'DB error' });

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(false);
      expect(result.reason).toBe('Error checking consent');
    });

    it('returns hasConsent false when no consents exist', async () => {
      mockSupabaseSelect([]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(false);
    });
  });

  describe('appointment consent 20-minute buffer', () => {
    it('calculates access_start 20 minutes before appointment', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-consent' },
            error: null,
          }),
        }),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: insertMock,
      });

      await consentService.createAppointmentConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        appointmentId: 'appt-1',
        appointmentDate: '2025-06-15',
        startTime: '10:00',
        endTime: '10:30',
      });

      const insertedData = insertMock.mock.calls[0][0];
      const accessStart = new Date(insertedData.access_start);
      const accessEnd = new Date(insertedData.access_end);

      expect(accessStart.getHours()).toBe(9);
      expect(accessStart.getMinutes()).toBe(40);
      expect(accessEnd.getHours()).toBe(10);
      expect(accessEnd.getMinutes()).toBe(50);
    });
  });
});
