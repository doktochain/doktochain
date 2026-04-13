import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db, mockSupabase } from './helpers/testContext';

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

import { messagingService } from '../../services/messagingService';
import { notificationService } from '../../services/notificationService';

describe('Integration: Messaging + Notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.clear();

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'patient-1' } },
      error: null,
    });
  });

  afterEach(() => {
    db.clear();
  });

  describe('notification lifecycle', () => {
    it('creates notification and retrieves it', async () => {
      await notificationService.createNotification({
        userId: 'patient-1',
        type: 'appointment_reminder',
        category: 'appointment',
        priority: 'normal',
        title: 'Upcoming Appointment',
        message: 'You have an appointment tomorrow at 9:00 AM',
        actionUrl: '/dashboard/patient/appointments',
        actionLabel: 'View',
      });

      const notifications = db.getTable('notifications').getAll();
      expect(notifications.length).toBe(1);
      expect(notifications[0].user_id).toBe('patient-1');
      expect(notifications[0].title).toBe('Upcoming Appointment');
      expect(notifications[0].is_read).toBe(false);
    });

    it('marks notification as read', async () => {
      db.seed('notifications', [
        {
          id: 'notif-1',
          user_id: 'patient-1',
          title: 'Test',
          message: 'Test message',
          is_read: false,
          is_archived: false,
        },
      ]);

      const result = await notificationService.markAsRead('notif-1');
      expect(result.data).toBe(true);

      const notifications = db.getTable('notifications').getAll();
      expect(notifications[0].is_read).toBe(true);
    });

    it('marks all notifications as read for user', async () => {
      db.seed('notifications', [
        { id: 'n1', user_id: 'patient-1', is_read: false, is_archived: false },
        { id: 'n2', user_id: 'patient-1', is_read: false, is_archived: false },
        { id: 'n3', user_id: 'patient-2', is_read: false, is_archived: false },
      ]);

      await notificationService.markAllAsRead('patient-1');

      const notifications = db.getTable('notifications').getAll();
      const patientNotifs = notifications.filter(
        (n) => n.user_id === 'patient-1'
      );
      patientNotifs.forEach((n) => expect(n.is_read).toBe(true));

      const otherNotif = notifications.find(
        (n) => n.user_id === 'patient-2'
      );
      expect(otherNotif!.is_read).toBe(false);
    });

    it('archives notification', async () => {
      db.seed('notifications', [
        {
          id: 'notif-archive',
          user_id: 'patient-1',
          is_read: true,
          is_archived: false,
        },
      ]);

      await notificationService.archiveNotification('notif-archive');

      const notifications = db.getTable('notifications').getAll();
      expect(notifications[0].is_archived).toBe(true);
    });

    it('gets unread count', async () => {
      db.seed('notifications', [
        {
          id: 'n1',
          user_id: 'patient-1',
          is_read: false,
          is_archived: false,
        },
        {
          id: 'n2',
          user_id: 'patient-1',
          is_read: false,
          is_archived: false,
        },
        {
          id: 'n3',
          user_id: 'patient-1',
          is_read: true,
          is_archived: false,
        },
      ]);

      const result = await notificationService.getUnreadCount('patient-1');
      expect(result.data).toBe(2);
    });
  });

  describe('messaging flow', () => {
    it('sends message and creates record', async () => {
      const conversationId = crypto.randomUUID();

      const result = await messagingService.sendMessage({
        recipient_id: 'provider-1',
        message_text:
          'Hello doctor, I have a question about my prescription',
        conversation_id: conversationId,
      });

      expect(result.data).toBeDefined();

      const messages = db.getTable('messages').getAll();
      expect(messages.length).toBe(1);
      expect(messages[0].sender_id).toBe('patient-1');
      expect(messages[0].recipient_id).toBe('provider-1');
    });

    it('marks message as read', async () => {
      db.seed('messages', [
        {
          id: 'msg-1',
          sender_id: 'patient-1',
          recipient_id: 'provider-1',
          message_text: 'Test message',
          is_read: false,
        },
      ]);

      await messagingService.markAsRead('msg-1');

      const messages = db.getTable('messages').getAll();
      expect(messages[0].is_read).toBe(true);
    });

    it('gets conversation messages', async () => {
      const convId = 'conv-1';
      db.seed('messages', [
        {
          id: 'msg-1',
          conversation_id: convId,
          sender_id: 'patient-1',
          recipient_id: 'provider-1',
          message_text: 'First message',
          created_at: '2026-03-01T10:00:00Z',
        },
        {
          id: 'msg-2',
          conversation_id: convId,
          sender_id: 'provider-1',
          recipient_id: 'patient-1',
          message_text: 'Reply message',
          created_at: '2026-03-01T10:05:00Z',
        },
        {
          id: 'msg-3',
          conversation_id: 'conv-other',
          sender_id: 'patient-2',
          recipient_id: 'provider-1',
          message_text: 'Other conversation',
          created_at: '2026-03-01T10:10:00Z',
        },
      ]);

      const result =
        await messagingService.getMessagesByConversation(convId);
      expect(result.data!.length).toBe(2);
    });

    it('gets unread message count', async () => {
      db.seed('messages', [
        { id: 'm1', recipient_id: 'provider-1', is_read: false },
        { id: 'm2', recipient_id: 'provider-1', is_read: false },
        { id: 'm3', recipient_id: 'provider-1', is_read: true },
        { id: 'm4', recipient_id: 'patient-1', is_read: false },
      ]);

      const result = await messagingService.getUnreadCount('provider-1');
      expect(result.count).toBe(2);
    });
  });

  describe('cross-service: appointment notification', () => {
    it('creates appointment notification', async () => {
      await notificationService.createNotification({
        userId: 'provider-user-1',
        type: 'appointment_confirmation',
        category: 'appointment',
        priority: 'normal',
        title: 'New Appointment Booked',
        message:
          'A new in_person appointment has been booked for 2026-04-15',
        actionUrl: '/dashboard/provider/appointments',
        actionLabel: 'View Appointment',
        relatedEntityType: 'appointment',
        relatedEntityId: 'apt-1',
      });

      const notifications = db.getTable('notifications').getAll();
      expect(notifications.length).toBe(1);
      expect(notifications[0].related_entity_type).toBe('appointment');
      expect(notifications[0].related_entity_id).toBe('apt-1');
    });

    it('creates prescription notification for patient', async () => {
      await notificationService.createNotification({
        userId: 'patient-user-1',
        type: 'prescription_ready',
        category: 'prescription',
        priority: 'high',
        title: 'Prescription Ready',
        message:
          'Your prescription for Amoxicillin is ready for pickup',
        relatedEntityType: 'prescription',
        relatedEntityId: 'rx-1',
      });

      const notifications = db.getTable('notifications').getAll();
      expect(notifications.length).toBe(1);
      expect(notifications[0].priority).toBe('high');
      expect(notifications[0].category).toBe('prescription');
    });
  });

  describe('notification preferences', () => {
    it('respects preference filtering', async () => {
      db.seed('notification_preferences', [
        {
          id: 'pref-1',
          user_id: 'patient-1',
          category: 'appointment',
          push_enabled: true,
          sms_enabled: false,
          email_enabled: true,
          in_app_enabled: true,
          do_not_disturb: false,
        },
      ]);

      const result = await notificationService.getPreferences('patient-1');
      const appointmentPref = result.data!.find(
        (p: any) => p.category === 'appointment'
      );
      expect(appointmentPref).toBeDefined();
      expect(appointmentPref!.push_enabled).toBe(true);
      expect(appointmentPref!.sms_enabled).toBe(false);
    });

    it('updates notification preferences', async () => {
      db.seed('notification_preferences', [
        {
          id: 'pref-2',
          user_id: 'patient-1',
          category: 'messaging',
          push_enabled: true,
          sms_enabled: false,
          email_enabled: false,
          in_app_enabled: true,
          do_not_disturb: false,
        },
      ]);

      await notificationService.updatePreference('pref-2', {
        email_enabled: true,
        sms_enabled: true,
      });

      const prefs = db.getTable('notification_preferences').getAll();
      const updated = prefs.find((p) => p.id === 'pref-2');
      expect(updated!.email_enabled).toBe(true);
      expect(updated!.sms_enabled).toBe(true);
    });
  });
});
