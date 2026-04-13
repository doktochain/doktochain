import { supabase } from '../lib/supabase';

export interface NotificationPreferences {
  id: string;
  provider_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;

  // Appointment notifications
  appointment_new_booking_email: boolean;
  appointment_new_booking_sms: boolean;
  appointment_new_booking_push: boolean;
  appointment_cancellation_email: boolean;
  appointment_cancellation_sms: boolean;
  appointment_cancellation_push: boolean;
  appointment_reschedule_email: boolean;
  appointment_reschedule_sms: boolean;
  appointment_reschedule_push: boolean;
  appointment_reminder_email: boolean;
  appointment_reminder_sms: boolean;
  appointment_reminder_push: boolean;

  // Patient communication
  patient_message_email: boolean;
  patient_message_sms: boolean;
  patient_message_push: boolean;
  patient_document_upload_email: boolean;
  patient_document_upload_sms: boolean;
  patient_document_upload_push: boolean;

  // Clinical alerts
  critical_lab_result_email: boolean;
  critical_lab_result_sms: boolean;
  critical_lab_result_push: boolean;
  prescription_refill_request_email: boolean;
  prescription_refill_request_sms: boolean;
  prescription_refill_request_push: boolean;

  // Administrative
  staff_schedule_change_email: boolean;
  staff_schedule_change_sms: boolean;
  staff_schedule_change_push: boolean;
  license_expiry_reminder_email: boolean;
  license_expiry_reminder_sms: boolean;
  license_expiry_reminder_push: boolean;

  // Billing and payments
  payment_received_email: boolean;
  payment_received_sms: boolean;
  payment_received_push: boolean;
  insurance_claim_status_email: boolean;
  insurance_claim_status_sms: boolean;
  insurance_claim_status_push: boolean;

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;

  // Preferences
  timezone: string;
  digest_frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  digest_time: string;

  created_at: string;
  updated_at: string;
}

export interface ProviderNotification {
  id: string;
  provider_id: string;
  type: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  metadata?: Record<string, any>;
  read_at?: string;
  archived_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  urgent: number;
  high: number;
  normal: number;
  low: number;
  today: number;
  thisWeek: number;
}

class ProviderNotificationService {
  async getPreferences(providerId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('provider_notification_preferences')
        .select('*')
        .eq('provider_id', providerId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  async updatePreferences(
    providerId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const { data, error } = await supabase
        .from('provider_notification_preferences')
        .update(preferences)
        .eq('provider_id', providerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  async getNotifications(
    providerId: string,
    filters?: {
      unreadOnly?: boolean;
      priority?: string;
      type?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ProviderNotification[]> {
    try {
      let query = supabase
        .from('provider_notifications')
        .select('*')
        .eq('provider_id', providerId)
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      if (filters?.unreadOnly) {
        query = query.is('read_at', null);
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async getNotificationStats(providerId: string): Promise<NotificationStats> {
    try {
      const { data: allNotifications, error } = await supabase
        .from('provider_notifications')
        .select('priority, read_at, created_at')
        .eq('provider_id', providerId)
        .is('archived_at', null);

      if (error) throw error;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats: NotificationStats = {
        total: allNotifications?.length || 0,
        unread: allNotifications?.filter(n => !n.read_at).length || 0,
        urgent: allNotifications?.filter(n => n.priority === 'urgent').length || 0,
        high: allNotifications?.filter(n => n.priority === 'high').length || 0,
        normal: allNotifications?.filter(n => n.priority === 'normal').length || 0,
        low: allNotifications?.filter(n => n.priority === 'low').length || 0,
        today: allNotifications?.filter(n => new Date(n.created_at) >= todayStart).length || 0,
        thisWeek: allNotifications?.filter(n => new Date(n.created_at) >= weekStart).length || 0,
      };

      return stats;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('provider_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(providerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('provider_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('provider_id', providerId)
        .is('read_at', null);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async archiveNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('provider_notifications')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error archiving notification:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('provider_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  async createNotification(notification: Omit<ProviderNotification, 'id' | 'created_at'>): Promise<ProviderNotification> {
    try {
      const { data, error } = await supabase
        .from('provider_notifications')
        .insert(notification)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  subscribeToNotifications(providerId: string, callback: (notification: ProviderNotification) => void) {
    const channel = supabase
      .channel('provider-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'provider_notifications',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          callback(payload.new as ProviderNotification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const providerNotificationService = new ProviderNotificationService();
