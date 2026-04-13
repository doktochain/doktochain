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

import { enhancedBookingService } from '../../services/enhancedBookingService';
import { consentService } from '../../services/consentService';
import { enhancedAppointmentService } from '../../services/enhancedAppointmentService';

function seedBookingData() {
  db.seed('providers', [
    {
      id: 'provider-1',
      user_id: 'provider-user-1',
      specialty: 'Family Medicine',
      status: 'active',
    },
  ]);

  db.seed('provider_time_slots', [
    {
      id: 'slot-1',
      provider_id: 'provider-1',
      date: '2026-04-15',
      start_time: '09:00',
      end_time: '09:30',
      is_available: true,
    },
    {
      id: 'slot-2',
      provider_id: 'provider-1',
      date: '2026-04-15',
      start_time: '10:00',
      end_time: '10:30',
      is_available: true,
    },
  ]);

  db.seed('notifications', []);
}

describe('Integration: Appointment Booking Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.clear();
    seedBookingData();
  });

  afterEach(() => {
    db.clear();
  });

  describe('complete booking flow', () => {
    it('creates appointment, marks slot unavailable, creates consent, and logs audit', async () => {
      const appointmentId = await enhancedBookingService.createAppointment(
        {
          providerId: 'provider-1',
          serviceId: 'service-1',
          consultationType: 'in_person',
          slotId: 'slot-1',
          appointmentDate: '2026-04-15',
          appointmentTime: '09:00',
          reasonForVisit: 'Annual checkup',
        },
        'patient-1'
      );

      expect(appointmentId).toBeDefined();

      const appointments = db.getTable('appointments').getAll();
      expect(appointments.length).toBe(1);
      expect(appointments[0].patient_id).toBe('patient-1');
      expect(appointments[0].provider_id).toBe('provider-1');
      expect(appointments[0].status).toBe('scheduled');
      expect(appointments[0].reason_for_visit).toBe('Annual checkup');

      const slots = db.getTable('provider_time_slots').getAll();
      const bookedSlot = slots.find((s) => s.id === 'slot-1');
      expect(bookedSlot!.is_available).toBe(false);
      expect(bookedSlot!.appointment_id).toBe(appointmentId);

      const consents = db.getTable('patient_consents').getAll();
      expect(consents.length).toBe(1);
      expect(consents[0].patient_id).toBe('patient-1');
      expect(consents[0].provider_id).toBe('provider-1');
      expect(consents[0].consent_scope).toBe('appointment');
      expect(consents[0].appointment_id).toBe(appointmentId);

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const eventTypes = auditLogs.map((l) => l.event_type);
      expect(eventTypes).toContain('appointment_created');
      expect(eventTypes).toContain('consent_window_created');
    });

    it('creates reminders when preferences specified', async () => {
      await enhancedBookingService.createAppointment(
        {
          providerId: 'provider-1',
          serviceId: 'service-1',
          consultationType: 'virtual',
          slotId: 'slot-2',
          appointmentDate: '2026-04-15',
          appointmentTime: '10:00',
          reasonForVisit: 'Follow-up',
          reminderPreferences: ['email', 'sms'],
        },
        'patient-1'
      );

      const reminders = db.getTable('appointment_reminders').getAll();
      expect(reminders.length).toBe(2);

      const types = reminders.map((r) => r.reminder_type);
      expect(types).toContain('24_hour');
      expect(types).toContain('2_hour');

      reminders.forEach((r) => {
        expect(r.send_via).toEqual(['email', 'sms']);
        expect(r.status).toBe('pending');
      });
    });

    it('sends notification to provider', async () => {
      await enhancedBookingService.createAppointment(
        {
          providerId: 'provider-1',
          serviceId: 'service-1',
          consultationType: 'in_person',
          slotId: 'slot-1',
          appointmentDate: '2026-04-15',
          appointmentTime: '09:00',
          reasonForVisit: 'Checkup',
        },
        'patient-1'
      );

      const notifications = db.getTable('notifications').getAll();
      expect(notifications.length).toBe(1);
      expect(notifications[0].user_id).toBe('provider-user-1');
      expect(notifications[0].notification_type).toBe(
        'appointment_confirmation'
      );
      expect(notifications[0].title).toBe('New Appointment Booked');
    });
  });

  describe('appointment cancellation with consent revocation', () => {
    it('cancels appointment and revokes consent', async () => {
      const aptId = await enhancedBookingService.createAppointment(
        {
          providerId: 'provider-1',
          serviceId: 'service-1',
          consultationType: 'in_person',
          slotId: 'slot-1',
          appointmentDate: '2026-04-15',
          appointmentTime: '09:00',
          reasonForVisit: 'Initial visit',
        },
        'patient-1'
      );

      await consentService.revokeAppointmentConsent(aptId, 'patient-1');

      const consents = db.getTable('patient_consents').getAll();
      expect(consents[0].status).toBe('revoked');
      expect(consents[0].revoked_at).toBeDefined();

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const revocationLog = auditLogs.find(
        (l) => l.event_type === 'consent_revoked'
      );
      expect(revocationLog).toBeDefined();
      expect(revocationLog!.action_data.appointment_id).toBe(aptId);
    });
  });

  describe('appointment rescheduling with consent update', () => {
    it('reschedules and updates consent window', async () => {
      const aptId = await enhancedBookingService.createAppointment(
        {
          providerId: 'provider-1',
          serviceId: 'service-1',
          consultationType: 'in_person',
          slotId: 'slot-1',
          appointmentDate: '2026-04-15',
          appointmentTime: '09:00',
          reasonForVisit: 'Consultation',
        },
        'patient-1'
      );

      await consentService.updateAppointmentConsentWindow({
        appointmentId: aptId,
        newDate: '2026-04-20',
        newStartTime: '14:00',
        newEndTime: '14:30',
        actorId: 'patient-1',
      });

      const consents = db.getTable('patient_consents').getAll();
      const consent = consents.find((c) => c.appointment_id === aptId);
      expect(consent!.start_date).toBe('2026-04-20');

      const auditLogs = db.getTable('blockchain_audit_log').getAll();
      const eventTypes = auditLogs.map((l) => l.event_type);
      expect(eventTypes).toContain('consent_window_extended');
    });
  });

  describe('appointment status management', () => {
    it('confirms appointment with audit trail', async () => {
      db.seed('appointments', [
        {
          id: 'apt-confirm-1',
          patient_id: 'patient-1',
          provider_id: 'provider-1',
          status: 'scheduled',
          appointment_date: '2026-04-15',
        },
      ]);

      await enhancedAppointmentService.confirmAppointment('apt-confirm-1');

      const appointments = db.getTable('appointments').getAll();
      const confirmed = appointments.find((a) => a.id === 'apt-confirm-1');
      expect(confirmed!.status).toBe('confirmed');
    });

    it('checks in and checks out patient', async () => {
      db.seed('appointments', [
        {
          id: 'apt-checkin-1',
          patient_id: 'patient-1',
          provider_id: 'provider-1',
          status: 'confirmed',
          appointment_date: '2026-04-15',
        },
      ]);

      await enhancedAppointmentService.checkInPatient('apt-checkin-1');
      let appointments = db.getTable('appointments').getAll();
      let apt = appointments.find((a) => a.id === 'apt-checkin-1');
      expect(apt!.status).toBe('in-progress');
      expect(apt!.check_in_time).toBeDefined();

      await enhancedAppointmentService.checkOutPatient('apt-checkin-1');
      appointments = db.getTable('appointments').getAll();
      apt = appointments.find((a) => a.id === 'apt-checkin-1');
      expect(apt!.status).toBe('completed');
      expect(apt!.check_out_time).toBeDefined();
    });

    it('bulk confirms multiple appointments', async () => {
      db.seed('appointments', [
        { id: 'apt-b1', status: 'scheduled' },
        { id: 'apt-b2', status: 'scheduled' },
        { id: 'apt-b3', status: 'scheduled' },
      ]);

      await enhancedAppointmentService.bulkConfirmAppointments([
        'apt-b1',
        'apt-b2',
        'apt-b3',
      ]);

      const appointments = db.getTable('appointments').getAll();
      const confirmedCount = appointments.filter(
        (a) => a.status === 'confirmed'
      ).length;
      expect(confirmedCount).toBe(3);
    });
  });

  describe('cancellation with refund tracking', () => {
    it('creates cancellation record with refund status', async () => {
      db.seed('appointments', [
        {
          id: 'apt-cancel-1',
          patient_id: 'patient-1',
          provider_id: 'provider-1',
          status: 'confirmed',
          appointment_date: '2026-04-20',
          payment_status: 'paid',
        },
      ]);

      const result =
        await enhancedAppointmentService.cancelAppointmentWithDetails(
          'apt-cancel-1',
          {
            reason: 'Schedule conflict',
            cancelledBy: 'patient-1',
            cancelledByRole: 'patient',
            category: 'patient_request',
            refundAmount: 15000,
          }
        );

      expect(result).toBeDefined();

      const appointments = db.getTable('appointments').getAll();
      const cancelled = appointments.find((a) => a.id === 'apt-cancel-1');
      expect(cancelled!.status).toBe('cancelled');

      const cancellations = db
        .getTable('appointment_cancellations')
        .getAll();
      expect(cancellations.length).toBe(1);
      expect(cancellations[0].cancellation_reason).toBe('Schedule conflict');
      expect(cancellations[0].refund_status).toBe('pending');
    });
  });

  describe('waitlist management', () => {
    it('adds to waitlist and retrieves entries', async () => {
      await enhancedAppointmentService.addToWaitlist({
        patient_id: 'patient-1',
        provider_id: 'provider-1',
        preferred_dates: ['2026-04-15', '2026-04-16'],
        preferred_times: ['morning'],
        service_type: 'consultation',
        status: 'waiting',
      });

      const entries = db.getTable('appointment_waitlist').getAll();
      expect(entries.length).toBe(1);
      expect(entries[0].patient_id).toBe('patient-1');
      expect(entries[0].status).toBe('waiting');
    });
  });

  describe('appointment export', () => {
    it('exports appointments as CSV', async () => {
      const appointmentsData = [
        {
          id: 'apt-export-1',
          patient_id: 'patient-1',
          provider_id: 'provider-1',
          appointment_date: '2026-04-15',
          start_time: '09:00',
          status: 'completed',
          appointment_type: 'in_person',
          reason_for_visit: 'Checkup',
          patients: {
            user_profiles: { full_name: 'Jane Doe' },
          },
        },
      ];

      const blob = await enhancedAppointmentService.exportAppointments(
        appointmentsData as any,
        'csv'
      );

      const csv = await blob.text();
      expect(csv).toContain('Date,Time,Patient,Type,Status,Reason');
      expect(csv).toContain('2026-04-15');
    });
  });
});
