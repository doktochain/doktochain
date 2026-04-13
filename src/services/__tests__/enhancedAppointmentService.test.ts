import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../appointmentService', () => ({
  appointmentService: {
    updateAppointment: vi.fn(),
  },
}));

vi.mock('../auditLogger', () => ({
  auditLog: {
    appointmentCancelled: vi.fn().mockResolvedValue(undefined),
    appointmentRescheduled: vi.fn().mockResolvedValue(undefined),
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
import { appointmentService } from '../appointmentService';
import { enhancedAppointmentService } from '../enhancedAppointmentService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('enhancedAppointmentService', () => {
  describe('getAppointments', () => {
    it('fetches appointments for a provider', async () => {
      const mockApts = [{ id: 'a1', provider_id: 'p1', status: 'scheduled' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: mockApts, error: null }));

      const result = await enhancedAppointmentService.getAppointments('p1');
      expect(result).toEqual(mockApts);
      expect(supabase.from).toHaveBeenCalledWith('appointments');
    });

    it('applies date range filter', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await enhancedAppointmentService.getAppointments('p1', {
        dateRange: { start: '2025-01-01', end: '2025-01-31' },
      });
      expect(chain.gte).toHaveBeenCalledWith('appointment_date', '2025-01-01');
      expect(chain.lte).toHaveBeenCalledWith('appointment_date', '2025-01-31');
    });

    it('applies status filter', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await enhancedAppointmentService.getAppointments('p1', {
        status: ['scheduled', 'confirmed'],
      });
      expect(chain.in).toHaveBeenCalledWith('status', ['scheduled', 'confirmed']);
    });

    it('applies appointmentType filter', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await enhancedAppointmentService.getAppointments('p1', {
        appointmentType: 'type-1',
      });
      expect(chain.eq).toHaveBeenCalledWith('appointment_type_id', 'type-1');
    });

    it('applies location filter', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as any).mockReturnValue(chain);

      await enhancedAppointmentService.getAppointments('p1', {
        locationId: 'loc-1',
      });
      expect(chain.eq).toHaveBeenCalledWith('location_id', 'loc-1');
    });

    it('filters by search query client-side', async () => {
      const mockApts = [
        { id: 'a1', patients: { user_profiles: { full_name: 'John Smith' } }, reason_for_visit: 'Checkup' },
        { id: 'a2', patients: { user_profiles: { full_name: 'Jane Doe' } }, reason_for_visit: 'Flu' },
      ];
      (supabase.from as any).mockReturnValue(chainMock({ data: mockApts, error: null }));

      const result = await enhancedAppointmentService.getAppointments('p1', {
        searchQuery: 'john',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a1');
    });

    it('throws on query error', async () => {
      (supabase.from as any).mockReturnValue(chainMock({ data: null, error: new Error('DB error') }));
      await expect(enhancedAppointmentService.getAppointments('p1')).rejects.toThrow('DB error');
    });

    it('returns empty array when data is null', async () => {
      (supabase.from as any).mockReturnValue(chainMock({ data: null, error: null }));
      const result = await enhancedAppointmentService.getAppointments('p1');
      expect(result).toEqual([]);
    });
  });

  describe('confirmAppointment', () => {
    it('updates appointment status to confirmed', async () => {
      const confirmed = { id: 'a1', status: 'confirmed' };
      const chain = chainMock({ data: confirmed, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await enhancedAppointmentService.confirmAppointment('a1');
      expect(result).toEqual(confirmed);
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'confirmed' })
      );
    });

    it('throws on error', async () => {
      const chain = chainMock({ data: null, error: new Error('fail') });
      (supabase.from as any).mockReturnValue(chain);
      await expect(enhancedAppointmentService.confirmAppointment('a1')).rejects.toThrow('fail');
    });
  });

  describe('bulkConfirmAppointments', () => {
    it('updates multiple appointments to confirmed', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await enhancedAppointmentService.bulkConfirmAppointments(['a1', 'a2']);
      expect(chain.in).toHaveBeenCalledWith('id', ['a1', 'a2']);
    });

    it('throws on error', async () => {
      const chain = chainMock({ data: null, error: new Error('bulk fail') });
      (supabase.from as any).mockReturnValue(chain);
      await expect(enhancedAppointmentService.bulkConfirmAppointments(['a1'])).rejects.toThrow('bulk fail');
    });
  });

  describe('cancelAppointmentWithDetails', () => {
    it('cancels appointment and records cancellation', async () => {
      const cancelledApt = { id: 'a1', status: 'cancelled' };
      (appointmentService.updateAppointment as any).mockResolvedValue(cancelledApt);
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await enhancedAppointmentService.cancelAppointmentWithDetails('a1', {
        cancelledBy: 'user1',
        cancelledByRole: 'patient',
        reason: 'schedule conflict',
        category: 'patient_request',
        offeredReschedule: true,
        cancellationFee: 500,
        refundAmount: 1000,
      });

      expect(result).toEqual(cancelledApt);
      expect(appointmentService.updateAppointment).toHaveBeenCalledWith('a1', expect.objectContaining({
        status: 'cancelled',
        cancellation_fee_assessed: 500,
      }));
      expect(supabase.from).toHaveBeenCalledWith('appointment_cancellations');
    });

    it('sets refund_status to pending when refundAmount provided', async () => {
      (appointmentService.updateAppointment as any).mockResolvedValue({ id: 'a1' });
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await enhancedAppointmentService.cancelAppointmentWithDetails('a1', {
        cancelledBy: 'u1',
        cancelledByRole: 'patient',
        reason: 'test',
        category: 'patient_request',
        refundAmount: 500,
      });

      expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
        refund_status: 'pending',
        refund_amount: 500,
      }));
    });

    it('sets refund_status to not_applicable when no refund', async () => {
      (appointmentService.updateAppointment as any).mockResolvedValue({ id: 'a1' });
      const chain = chainMock({ data: null, error: null });
      (supabase.from as any).mockReturnValue(chain);

      await enhancedAppointmentService.cancelAppointmentWithDetails('a1', {
        cancelledBy: 'u1',
        cancelledByRole: 'provider',
        reason: 'unavailable',
        category: 'provider_unavailable',
      });

      expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
        refund_status: 'not_applicable',
        refund_amount: 0,
      }));
    });
  });

  describe('checkInPatient', () => {
    it('sets status to in-progress with exam room', async () => {
      const chain = chainMock({ data: { id: 'a1', status: 'in-progress', exam_room: 'Room 3' }, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await enhancedAppointmentService.checkInPatient('a1', 'Room 3');
      expect(result.status).toBe('in-progress');
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'in-progress',
        exam_room: 'Room 3',
      }));
    });
  });

  describe('checkOutPatient', () => {
    it('sets status to completed', async () => {
      const chain = chainMock({ data: { id: 'a1', status: 'completed' }, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await enhancedAppointmentService.checkOutPatient('a1');
      expect(result.status).toBe('completed');
    });
  });

  describe('getStatusHistory', () => {
    it('returns status history for appointment', async () => {
      const history = [{ id: 'h1', new_status: 'confirmed' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: history, error: null }));

      const result = await enhancedAppointmentService.getStatusHistory('a1');
      expect(result).toEqual(history);
      expect(supabase.from).toHaveBeenCalledWith('appointment_status_history');
    });

    it('returns empty array when null data', async () => {
      (supabase.from as any).mockReturnValue(chainMock({ data: null, error: null }));
      const result = await enhancedAppointmentService.getStatusHistory('a1');
      expect(result).toEqual([]);
    });
  });

  describe('getAppointmentTypes', () => {
    it('returns active appointment types for provider', async () => {
      const types = [{ id: 't1', type_name: 'General Visit' }];
      (supabase.from as any).mockReturnValue(chainMock({ data: types, error: null }));

      const result = await enhancedAppointmentService.getAppointmentTypes('p1');
      expect(result).toEqual(types);
      expect(supabase.from).toHaveBeenCalledWith('appointment_types');
    });
  });

  describe('createAppointmentType', () => {
    it('creates a new appointment type', async () => {
      const newType = { id: 't1', type_name: 'Dental Cleaning', duration_minutes: 60 };
      const chain = chainMock({ data: newType, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await enhancedAppointmentService.createAppointmentType({
        type_name: 'Dental Cleaning',
        duration_minutes: 60,
      } as any);
      expect(result).toEqual(newType);
    });
  });

  describe('waitlist', () => {
    it('getWaitlist returns active entries by default', async () => {
      const entries = [{ id: 'w1', status: 'active' }];
      const chain = chainMock({ data: entries, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await enhancedAppointmentService.getWaitlist('p1');
      expect(result).toEqual(entries);
      expect(chain.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('addToWaitlist creates a new entry', async () => {
      const entry = { id: 'w1', patient_id: 'pat1', provider_id: 'p1' };
      const chain = chainMock({ data: entry, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await enhancedAppointmentService.addToWaitlist({ patient_id: 'pat1', provider_id: 'p1' } as any);
      expect(result).toEqual(entry);
    });

    it('matchWaitlistToAppointment sets matched status', async () => {
      const matched = { id: 'w1', status: 'matched', matched_appointment_id: 'a1' };
      const chain = chainMock({ data: matched, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await enhancedAppointmentService.matchWaitlistToAppointment('w1', 'a1');
      expect(result.status).toBe('matched');
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'matched',
        matched_appointment_id: 'a1',
      }));
    });
  });

  describe('rescheduleAppointment', () => {
    it('updates date and times', async () => {
      const rescheduled = { id: 'a1', appointment_date: '2025-02-01', patient_id: 'pat1' };
      const chain = chainMock({ data: rescheduled, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await enhancedAppointmentService.rescheduleAppointment('a1', '2025-02-01', '10:00', '10:30');
      expect(result).toEqual(rescheduled);
      expect(chain.update).toHaveBeenCalledWith({
        appointment_date: '2025-02-01',
        start_time: '10:00',
        end_time: '10:30',
      });
    });
  });

  describe('exportAppointments', () => {
    it('exports CSV with headers and rows', async () => {
      const appointments = [
        {
          appointment_date: '2025-01-15',
          start_time: '09:00',
          patients: { user_profiles: { full_name: 'John Smith' } },
          appointment_type: 'in-person',
          status: 'completed',
          reason_for_visit: 'Checkup',
          provider_locations: { location_name: 'Main Office' },
        },
      ] as any[];

      const blob = await enhancedAppointmentService.exportAppointments(appointments, 'csv');
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv');
    });

    it('throws for PDF format', async () => {
      await expect(
        enhancedAppointmentService.exportAppointments([], 'pdf')
      ).rejects.toThrow('PDF export not yet implemented');
    });
  });

  describe('updateAppointmentStatus', () => {
    it('updates status directly', async () => {
      const updated = { id: 'a1', status: 'no-show' };
      const chain = chainMock({ data: updated, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await enhancedAppointmentService.updateAppointmentStatus('a1', 'no-show');
      expect(result.status).toBe('no-show');
    });
  });

  describe('approveQuestionnaire', () => {
    it('records approval with timestamp and reviewer', async () => {
      const approved = { id: 'a1', questionnaire_approved_by: 'doc1' };
      const chain = chainMock({ data: approved, error: null });
      (supabase.from as any).mockReturnValue(chain);

      const result = await enhancedAppointmentService.approveQuestionnaire('a1', 'doc1');
      expect(result).toEqual(approved);
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        questionnaire_approved_by: 'doc1',
      }));
    });
  });
});
