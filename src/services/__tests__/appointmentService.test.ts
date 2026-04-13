import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');

function chainMock(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

const { appointmentService } = await import('../appointmentService');

describe('appointmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAppointment', () => {
    it('inserts appointment and returns data', async () => {
      const mockAppt = { id: 'appt-1', patient_id: 'p1', provider_id: 'prov1', status: 'scheduled' };
      const chain = chainMock({ data: mockAppt, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await appointmentService.createAppointment({
        patient_id: 'p1',
        provider_id: 'prov1',
        appointment_date: '2025-06-15',
        start_time: '10:00',
        end_time: '10:30',
        appointment_type: 'virtual',
        visit_type: 'initial',
      });

      expect(result).toEqual(mockAppt);
      expect(supabase.from).toHaveBeenCalledWith('appointments');
    });

    it('throws when supabase returns an error', async () => {
      const chain = chainMock({ data: null, error: { message: 'Insert failed' } });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await expect(
        appointmentService.createAppointment({ patient_id: 'p1', provider_id: 'prov1' })
      ).rejects.toThrow();
    });
  });

  describe('cancelAppointment', () => {
    it('sets status to cancelled', async () => {
      const mockAppt = { id: 'appt-1', status: 'cancelled', patient_id: 'p1', provider_id: 'prov1' };
      const chain = chainMock({ data: mockAppt, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await appointmentService.cancelAppointment('appt-1', 'user-1', 'Changed plans');
      expect(result).toEqual(mockAppt);
    });
  });

  describe('rescheduleAppointment', () => {
    it('updates appointment with new date/time', async () => {
      const updated = {
        id: 'appt-1',
        appointment_date: '2025-07-01',
        start_time: '14:00',
        end_time: '14:30',
        status: 'scheduled',
      };
      const chain = chainMock({ data: updated, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await appointmentService.rescheduleAppointment('appt-1', '2025-07-01', '14:00', '14:30');
      expect(result).toEqual(updated);
    });
  });

  describe('getPatientAppointments', () => {
    it('queries appointments filtered by patient_id', async () => {
      const appointments = [
        { id: 'a1', patient_id: 'p1', status: 'scheduled' },
        { id: 'a2', patient_id: 'p1', status: 'completed' },
      ];
      const chain = chainMock({ data: appointments, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await appointmentService.getPatientAppointments('p1');
      expect(result).toEqual(appointments);
    });

    it('filters by status when provided', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await appointmentService.getPatientAppointments('p1', 'scheduled');
      expect(chain.eq).toHaveBeenCalledWith('status', 'scheduled');
    });
  });

  describe('getProviderAppointments', () => {
    it('queries appointments filtered by provider_id', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await appointmentService.getProviderAppointments('prov1');
      expect(chain.eq).toHaveBeenCalledWith('provider_id', 'prov1');
    });
  });

  describe('startVideoConsultation', () => {
    it('updates status to in-progress and sets video_room_id', async () => {
      const appt = { id: 'a1', status: 'in-progress', video_room_id: 'room-123' };
      const chain = chainMock({ data: appt, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await appointmentService.startVideoConsultation('a1');
      expect(result.status).toBe('in-progress');
    });
  });

  describe('endVideoConsultation', () => {
    it('updates status to completed', async () => {
      const appt = { id: 'a1', status: 'completed' };
      const chain = chainMock({ data: appt, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await appointmentService.endVideoConsultation('a1');
      expect(result.status).toBe('completed');
    });
  });

  describe('signAppointmentNote', () => {
    it('sets is_signed to true', async () => {
      const note = { id: 'note-1', is_signed: true, signed_at: expect.any(String) };
      const chain = chainMock({ data: note, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await appointmentService.signAppointmentNote('note-1');
      expect(result.is_signed).toBe(true);
    });
  });

  describe('getUpcomingAppointmentsCount', () => {
    it('returns count for patient role', async () => {
      const chain = chainMock({ data: null, error: null });
      chain.select = vi.fn().mockReturnValue(chain);
      Object.defineProperty(chain, 'then', {
        value: (resolve: any) => resolve({ count: 5, error: null }),
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const count = await appointmentService.getUpcomingAppointmentsCount('user-1', 'patient');
      expect(typeof count).toBe('number');
    });
  });
});
