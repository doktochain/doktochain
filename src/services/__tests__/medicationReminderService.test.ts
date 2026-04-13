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

const { medicationReminderService } = await import('../medicationReminderService');

describe('medicationReminderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReminder', () => {
    it('inserts and returns reminder', async () => {
      const reminder = { id: 'r1', medication_name: 'Aspirin' };
      const chain = chainMock({ data: reminder, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationReminderService.createReminder({ medication_name: 'Aspirin' } as any);
      expect(result).toEqual(reminder);
      expect(supabase.from).toHaveBeenCalledWith('medication_reminders');
    });
  });

  describe('getPatientReminders', () => {
    it('queries reminders by patient_id', async () => {
      const reminders = [{ id: 'r1' }, { id: 'r2' }];
      const chain = chainMock({ data: reminders, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationReminderService.getPatientReminders('pat1');
      expect(result).toEqual(reminders);
    });

    it('filters active only when specified', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await medicationReminderService.getPatientReminders('pat1', true);
      expect(chain.eq).toHaveBeenCalledWith('enabled', true);
    });

    it('returns empty array when data is null', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationReminderService.getPatientReminders('pat1');
      expect(result).toEqual([]);
    });
  });

  describe('updateReminder', () => {
    it('updates reminder fields', async () => {
      const reminder = { id: 'r1', enabled: false };
      const chain = chainMock({ data: reminder, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationReminderService.updateReminder('r1', { enabled: false } as any);
      expect(result).toEqual(reminder);
    });
  });

  describe('deleteReminder', () => {
    it('deletes reminder by id', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await medicationReminderService.deleteReminder('r1');
      expect(supabase.from).toHaveBeenCalledWith('medication_reminders');
      expect(chain.eq).toHaveBeenCalledWith('id', 'r1');
    });
  });

  describe('toggleReminder', () => {
    it('updates enabled status', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await medicationReminderService.toggleReminder('r1', false);
      expect(chain.update).toHaveBeenCalledWith({ enabled: false });
    });
  });

  describe('logMedicationTaken', () => {
    it('inserts adherence log with taken status', async () => {
      const log = { id: 'l1', status: 'taken' };
      const chain = chainMock({ data: log, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await medicationReminderService.logMedicationTaken('r1', 'pat1', '2025-01-01T09:00:00Z', 'taken');
      expect(result).toEqual(log);
      expect(supabase.from).toHaveBeenCalledWith('medication_adherence_log');
    });

    it('sets taken_time to null for non-taken statuses', async () => {
      const chain = chainMock({ data: { id: 'l1' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await medicationReminderService.logMedicationTaken('r1', 'pat1', '2025-01-01T09:00:00Z', 'missed');
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ taken_time: null, status: 'missed' })
      );
    });
  });

  describe('parseFrequencyToTimes', () => {
    it('returns ["09:00"] for "once daily"', () => {
      expect(medicationReminderService.parseFrequencyToTimes('once daily')).toEqual(['09:00']);
    });

    it('returns ["09:00"] for just "daily"', () => {
      expect(medicationReminderService.parseFrequencyToTimes('daily')).toEqual(['09:00']);
    });

    it('matches daily first for "twice daily" (contains "daily")', () => {
      expect(medicationReminderService.parseFrequencyToTimes('twice daily')).toEqual(['09:00']);
    });

    it('returns two times for "BID"', () => {
      expect(medicationReminderService.parseFrequencyToTimes('BID')).toEqual(['09:00', '21:00']);
    });

    it('returns two times for "twice" without daily', () => {
      expect(medicationReminderService.parseFrequencyToTimes('twice')).toEqual(['09:00', '21:00']);
    });

    it('matches daily first for "three times daily"', () => {
      expect(medicationReminderService.parseFrequencyToTimes('three times daily')).toEqual(['09:00']);
    });

    it('returns three times for "TID"', () => {
      expect(medicationReminderService.parseFrequencyToTimes('TID')).toEqual(['09:00', '14:00', '21:00']);
    });

    it('matches daily first for "four times daily"', () => {
      expect(medicationReminderService.parseFrequencyToTimes('four times daily')).toEqual(['09:00']);
    });

    it('returns four times for "QID"', () => {
      expect(medicationReminderService.parseFrequencyToTimes('QID')).toEqual(['08:00', '12:00', '16:00', '20:00']);
    });

    it('calculates times for "every 6 hours"', () => {
      const times = medicationReminderService.parseFrequencyToTimes('every 6 hours');
      expect(times).toEqual(['08:00', '14:00', '20:00']);
    });

    it('calculates times for "every 8 hours"', () => {
      const times = medicationReminderService.parseFrequencyToTimes('every 8 hours');
      expect(times).toEqual(['08:00', '16:00']);
    });

    it('calculates times for "every 4 hours"', () => {
      const times = medicationReminderService.parseFrequencyToTimes('every 4 hours');
      expect(times).toEqual(['08:00', '12:00', '16:00', '20:00']);
    });

    it('returns default for unrecognized frequency', () => {
      expect(medicationReminderService.parseFrequencyToTimes('some unknown')).toEqual(['09:00']);
    });
  });

  describe('mapFrequencyToType', () => {
    it('maps "twice daily" to twice_daily', () => {
      expect(medicationReminderService.mapFrequencyToType('twice daily')).toBe('twice_daily');
    });

    it('maps "BID" to twice_daily', () => {
      expect(medicationReminderService.mapFrequencyToType('BID')).toBe('twice_daily');
    });

    it('maps "three times" to three_times_daily', () => {
      expect(medicationReminderService.mapFrequencyToType('three times a day')).toBe('three_times_daily');
    });

    it('maps "TID" to three_times_daily', () => {
      expect(medicationReminderService.mapFrequencyToType('TID')).toBe('three_times_daily');
    });

    it('maps "four times" to four_times_daily', () => {
      expect(medicationReminderService.mapFrequencyToType('four times')).toBe('four_times_daily');
    });

    it('maps "QID" to four_times_daily', () => {
      expect(medicationReminderService.mapFrequencyToType('QID')).toBe('four_times_daily');
    });

    it('maps "weekly" to weekly', () => {
      expect(medicationReminderService.mapFrequencyToType('weekly')).toBe('weekly');
    });

    it('maps "as needed" to as_needed', () => {
      expect(medicationReminderService.mapFrequencyToType('as needed')).toBe('as_needed');
    });

    it('maps "PRN" to as_needed', () => {
      expect(medicationReminderService.mapFrequencyToType('PRN')).toBe('as_needed');
    });

    it('defaults to daily for unrecognized', () => {
      expect(medicationReminderService.mapFrequencyToType('something else')).toBe('daily');
    });
  });
});
