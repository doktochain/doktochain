import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), in: vi.fn(), gte: vi.fn(), lte: vi.fn(), or: vi.fn(),
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

const { medicationManagementService } = await import('../medicationManagementService');

describe('medicationManagementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPatientMedications', () => {
    it('queries active medications by default', async () => {
      const meds = [{ id: 'm1', medication_name: 'Aspirin' }];
      const chain = chainMock({ data: meds, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationManagementService.getPatientMedications('pat1');
      expect(result.data).toEqual(meds);
      expect(chain.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('queries all medications when activeOnly is false', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await medicationManagementService.getPatientMedications('pat1', false);
      const eqCalls = chain.eq.mock.calls;
      const activeFilterCall = eqCalls.find((c: any[]) => c[0] === 'is_active');
      expect(activeFilterCall).toBeUndefined();
    });

    it('returns error on failure', async () => {
      const chain = chainMock({ data: null, error: new Error('DB fail') });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationManagementService.getPatientMedications('pat1');
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('getMedicationById', () => {
    it('returns medication by id', async () => {
      const med = { id: 'm1', medication_name: 'Lisinopril' };
      const chain = chainMock({ data: med, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationManagementService.getMedicationById('m1');
      expect(result.data).toEqual(med);
    });

    it('returns null when not found', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationManagementService.getMedicationById('nonexistent');
      expect(result.data).toBeNull();
    });
  });

  describe('addMedication', () => {
    it('inserts and returns medication', async () => {
      const med = { id: 'm1', medication_name: 'Metformin' };
      const chain = chainMock({ data: med, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationManagementService.addMedication({ medication_name: 'Metformin' } as any);
      expect(result.data).toEqual(med);
      expect(supabase.from).toHaveBeenCalledWith('patient_medications');
    });
  });

  describe('updateMedication', () => {
    it('updates medication fields', async () => {
      const med = { id: 'm1', dosage: '10mg' };
      const chain = chainMock({ data: med, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationManagementService.updateMedication('m1', { dosage: '10mg' } as any);
      expect(result.data).toEqual(med);
    });
  });

  describe('getRemindersForMedication', () => {
    it('returns reminders for a medication', async () => {
      const reminders = [{ id: 'rem1', reminder_time: '09:00' }];
      const chain = chainMock({ data: reminders, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationManagementService.getRemindersForMedication('m1');
      expect(result.data).toEqual(reminders);
      expect(supabase.from).toHaveBeenCalledWith('medication_reminders');
    });
  });

  describe('addReminder', () => {
    it('inserts and returns reminder', async () => {
      const reminder = { id: 'rem1', reminder_time: '09:00' };
      const chain = chainMock({ data: reminder, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationManagementService.addReminder({ reminder_time: '09:00' } as any);
      expect(result.data).toEqual(reminder);
    });
  });

  describe('deleteReminder', () => {
    it('deletes reminder and returns true', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationManagementService.deleteReminder('rem1');
      expect(result.data).toBe(true);
    });
  });

  describe('logMedicationTaken', () => {
    it('logs medication as taken', async () => {
      const log = { id: 'log1', status: 'taken' };
      const chain = chainMock({ data: log, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationManagementService.logMedicationTaken('m1', 'pat1');
      expect(result.data).toEqual(log);
      expect(supabase.from).toHaveBeenCalledWith('medication_logs');
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'taken' })
      );
    });
  });

  describe('getAdherenceStats', () => {
    it('returns zero stats when no logs', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationManagementService.getAdherenceStats('pat1', 'm1');
      expect(result.data).toEqual({
        total_doses: 0,
        taken_doses: 0,
        missed_doses: 0,
        adherence_percentage: 0,
        current_streak_days: 0,
      });
    });

    it('calculates stats from logs', async () => {
      const logs = [
        { id: 'l1', status: 'taken', scheduled_time: new Date(Date.now() - 86400000).toISOString() },
        { id: 'l2', status: 'taken', scheduled_time: new Date(Date.now() - 172800000).toISOString() },
        { id: 'l3', status: 'missed', scheduled_time: new Date(Date.now() - 259200000).toISOString() },
      ];
      const chain = chainMock({ data: logs, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationManagementService.getAdherenceStats('pat1', 'm1');
      expect(result.data?.total_doses).toBe(3);
      expect(result.data?.taken_doses).toBe(2);
      expect(result.data?.missed_doses).toBe(1);
      expect(result.data?.adherence_percentage).toBeCloseTo(66.67, 1);
      expect(result.data?.current_streak_days).toBe(2);
    });
  });

  describe('getMedicationsNeedingRefill', () => {
    it('queries medications with upcoming refill dates', async () => {
      const meds = [{ id: 'm1', next_refill_due_date: '2025-01-10' }];
      const chain = chainMock({ data: meds, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationManagementService.getMedicationsNeedingRefill('pat1');
      expect(result.data).toEqual(meds);
      expect(chain.eq).toHaveBeenCalledWith('is_active', true);
    });
  });

  describe('formatFrequency', () => {
    it('formats as_needed', () => {
      expect(medicationManagementService.formatFrequency('as_needed', 0)).toBe('As needed');
    });

    it('formats daily', () => {
      expect(medicationManagementService.formatFrequency('daily', 2)).toBe('2x daily');
    });

    it('formats weekly', () => {
      expect(medicationManagementService.formatFrequency('weekly', 1)).toBe('1x weekly');
    });

    it('formats monthly', () => {
      expect(medicationManagementService.formatFrequency('monthly', 1)).toBe('1x monthly');
    });

    it('returns raw frequency for unknown', () => {
      expect(medicationManagementService.formatFrequency('custom_schedule', 1)).toBe('custom_schedule');
    });
  });

  describe('getDaysOfWeekString', () => {
    it('returns "Every day" for all 7 days', () => {
      expect(medicationManagementService.getDaysOfWeekString([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    });

    it('returns comma-separated day names for subset', () => {
      expect(medicationManagementService.getDaysOfWeekString([1, 3, 5])).toBe('Mon, Wed, Fri');
    });

    it('handles single day', () => {
      expect(medicationManagementService.getDaysOfWeekString([0])).toBe('Sun');
    });

    it('handles weekdays', () => {
      expect(medicationManagementService.getDaysOfWeekString([1, 2, 3, 4, 5])).toBe('Mon, Tue, Wed, Thu, Fri');
    });
  });
});
