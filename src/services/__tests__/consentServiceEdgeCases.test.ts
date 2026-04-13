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
    if (key !== 'then') chain[key].mockReturnValue(chain);
  });
  return chain;
}

function mockSupabaseSelect(data: ConsentRecord[] | null, error: any = null) {
  const chain = createThenableChain({ data, error });
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

describe('consentService edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('boundary timestamps', () => {
    it('returns hasConsent true at exact access_start time', async () => {
      const now = new Date();
      const consent = createMockConsent({
        consent_scope: 'appointment',
        access_start: now.toISOString(),
        access_end: new Date(now.getTime() + 3600000).toISOString(),
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(true);
    });

    it('returns hasConsent true at exact access_end time', async () => {
      const now = new Date();
      const consent = createMockConsent({
        consent_scope: 'appointment',
        access_start: new Date(now.getTime() - 3600000).toISOString(),
        access_end: now.toISOString(),
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(true);
    });

    it('returns hasConsent false 1ms after access_end', async () => {
      const now = new Date();
      const consent = createMockConsent({
        consent_scope: 'appointment',
        access_start: new Date(now.getTime() - 7200000).toISOString(),
        access_end: new Date(now.getTime() - 1).toISOString(),
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(false);
    });

    it('returns hasConsent true for broad consent starting today', async () => {
      const today = new Date().toISOString().split('T')[0];
      const consent = createMockConsent({
        consent_scope: 'broad',
        start_date: today,
        end_date: '2099-12-31',
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(true);
    });

    it('returns hasConsent false for broad consent ending yesterday', async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const consent = createMockConsent({
        consent_scope: 'broad',
        start_date: '2020-01-01',
        end_date: yesterday,
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(false);
    });
  });

  describe('multiple consents resolution', () => {
    it('finds valid consent even when first is expired', async () => {
      const now = new Date();
      const expired = createMockConsent({
        id: 'expired-1',
        consent_scope: 'broad',
        start_date: '2020-01-01',
        end_date: '2020-12-31',
      });
      const valid = createMockConsent({
        id: 'valid-1',
        consent_scope: 'broad',
        start_date: '2020-01-01',
        end_date: '2099-12-31',
      });
      mockSupabaseSelect([expired, valid]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(true);
      expect(result.consent?.id).toBe('valid-1');
    });

    it('returns first matching consent when multiple are valid', async () => {
      const broad = createMockConsent({
        id: 'broad-1',
        consent_scope: 'broad',
        start_date: '2020-01-01',
        end_date: '2099-12-31',
      });
      const now = new Date();
      const appointment = createMockConsent({
        id: 'appt-1',
        consent_scope: 'appointment',
        access_start: new Date(now.getTime() - 1800000).toISOString(),
        access_end: new Date(now.getTime() + 1800000).toISOString(),
      });
      mockSupabaseSelect([broad, appointment]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(true);
      expect(result.consent?.id).toBe('broad-1');
    });

    it('returns false when all consents are expired', async () => {
      const expired1 = createMockConsent({
        id: 'e1',
        consent_scope: 'broad',
        start_date: '2020-01-01',
        end_date: '2020-06-30',
      });
      const expired2 = createMockConsent({
        id: 'e2',
        consent_scope: 'appointment',
        access_start: new Date(Date.now() - 7200000).toISOString(),
        access_end: new Date(Date.now() - 3600000).toISOString(),
      });
      mockSupabaseSelect([expired1, expired2]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(false);
    });
  });

  describe('record type filtering on appointment consent', () => {
    it('appointment consent with empty record_types allows any record type', async () => {
      const now = new Date();
      const consent = createMockConsent({
        consent_scope: 'appointment',
        record_types: [],
        access_start: new Date(now.getTime() - 1800000).toISOString(),
        access_end: new Date(now.getTime() + 1800000).toISOString(),
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1', 'lab_results');
      expect(result.hasConsent).toBe(true);
    });

    it('appointment consent with specific record_types denies non-matching type', async () => {
      const now = new Date();
      const consent = createMockConsent({
        consent_scope: 'appointment',
        record_types: ['vitals', 'medications'],
        access_start: new Date(now.getTime() - 1800000).toISOString(),
        access_end: new Date(now.getTime() + 1800000).toISOString(),
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1', 'lab_results');
      expect(result.hasConsent).toBe(false);
    });

    it('appointment consent with specific record_types allows matching type', async () => {
      const now = new Date();
      const consent = createMockConsent({
        consent_scope: 'appointment',
        record_types: ['vitals', 'medications'],
        access_start: new Date(now.getTime() - 1800000).toISOString(),
        access_end: new Date(now.getTime() + 1800000).toISOString(),
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1', 'vitals');
      expect(result.hasConsent).toBe(true);
    });
  });

  describe('windowEnd in response', () => {
    it('returns access_end as windowEnd for appointment consent', async () => {
      const now = new Date();
      const accessEnd = new Date(now.getTime() + 1800000).toISOString();
      const consent = createMockConsent({
        consent_scope: 'appointment',
        access_start: new Date(now.getTime() - 1800000).toISOString(),
        access_end: accessEnd,
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.windowEnd).toBe(accessEnd);
    });

    it('returns end_date as windowEnd for broad consent', async () => {
      const consent = createMockConsent({
        consent_scope: 'broad',
        start_date: '2020-01-01',
        end_date: '2030-12-31',
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.windowEnd).toBe('2030-12-31');
    });

    it('returns undefined windowEnd for indefinite broad consent', async () => {
      const consent = createMockConsent({
        consent_scope: 'broad',
        start_date: '2020-01-01',
        end_date: null,
      });
      mockSupabaseSelect([consent]);

      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(true);
      expect(result.windowEnd).toBeUndefined();
    });
  });

  describe('appointment consent 20-minute buffer edge cases', () => {
    it('handles midnight appointment start (buffer crosses day boundary)', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-consent' },
            error: null,
          }),
        }),
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: insertMock });

      await consentService.createAppointmentConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        appointmentId: 'appt-1',
        appointmentDate: '2025-06-15',
        startTime: '00:00',
        endTime: '00:30',
      });

      const insertedData = insertMock.mock.calls[0][0];
      const accessStart = new Date(insertedData.access_start);
      expect(accessStart.getHours()).toBe(23);
      expect(accessStart.getMinutes()).toBe(40);
      expect(accessStart.getDate()).toBe(14);
    });

    it('handles end-of-day appointment (buffer extends past midnight)', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-consent' },
            error: null,
          }),
        }),
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: insertMock });

      await consentService.createAppointmentConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        appointmentId: 'appt-2',
        appointmentDate: '2025-06-15',
        startTime: '23:30',
        endTime: '23:59',
      });

      const insertedData = insertMock.mock.calls[0][0];
      const accessEnd = new Date(insertedData.access_end);
      expect(accessEnd.getMinutes()).toBe(19);
      expect(accessEnd.getDate()).toBe(16);
    });

    it('correctly formats ISO strings for access windows', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-consent' },
            error: null,
          }),
        }),
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: insertMock });

      await consentService.createAppointmentConsent({
        patientId: 'patient-1',
        providerId: 'provider-1',
        appointmentId: 'appt-3',
        appointmentDate: '2025-06-15',
        startTime: '14:00',
        endTime: '14:30',
      });

      const insertedData = insertMock.mock.calls[0][0];
      expect(insertedData.access_start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(insertedData.access_end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(insertedData.consent_scope).toBe('appointment');
      expect(insertedData.status).toBe('active');
    });
  });

  describe('null and empty data handling', () => {
    it('handles null data from supabase gracefully', async () => {
      mockSupabaseSelect(null);
      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(false);
    });

    it('handles empty array from supabase', async () => {
      mockSupabaseSelect([]);
      const result = await consentService.verifyProviderConsent('patient-1', 'provider-1');
      expect(result.hasConsent).toBe(false);
      expect(result.reason).toBe('No active consent for this patient');
    });
  });
});
