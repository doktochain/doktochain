import { api } from '../lib/api-client';

export type NotificationCategory =
  | 'appointment'
  | 'insurance'
  | 'messaging'
  | 'telemedicine'
  | 'prescription'
  | 'medication'
  | 'delivery'
  | 'pharmacy'
  | 'billing'
  | 'system';

export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

export type DeliveryChannel = 'push' | 'sms' | 'email' | 'in_app';

export type NotificationFrequency = 'immediate' | 'daily_digest' | 'weekly_summary' | 'custom';

export interface Notification {
  id: string;
  user_id: string;
  notification_type: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: any;
  is_read: boolean;
  read_at?: string;
  is_archived: boolean;
  archived_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  category: NotificationCategory;
  push_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
  frequency: NotificationFrequency;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  do_not_disturb: boolean;
  created_at: string;
  updated_at: string;
}

export const NOTIFICATION_CATEGORIES = {
  appointment: {
    label: 'Appointments',
    types: [
      'appointment_confirmation',
      'appointment_reminder_7day',
      'appointment_reminder_24hour',
      'appointment_reminder_1hour',
      'provider_running_late',
      'appointment_rescheduled',
      'appointment_cancelled',
      'follow_up_due',
    ],
  },
  insurance: {
    label: 'Insurance',
    types: [
      'insurance_expiring',
      'insurance_expired',
      'coverage_verified',
      'claim_processed',
      'claim_denied',
      'pre_authorization_approved',
      'pre_authorization_denied',
    ],
  },
  messaging: {
    label: 'Messages',
    types: [
      'new_message',
      'unread_reminder',
      'urgent_message',
      'provider_responded',
    ],
  },
  telemedicine: {
    label: 'Telemedicine',
    types: [
      'consultation_starting_15min',
      'provider_joined',
      'consultation_starting_now',
      'recording_available',
      'follow_up_required',
    ],
  },
  prescription: {
    label: 'Prescriptions',
    types: [
      'new_prescription',
      'prescription_ready',
      'refill_due',
      'refill_denied',
      'generic_alternative',
      'price_drop',
    ],
  },
  medication: {
    label: 'Medications',
    types: [
      'time_to_take',
      'missed_dose',
      'refill_reminder',
      'interaction_detected',
      'medication_expiring',
    ],
  },
  delivery: {
    label: 'Delivery',
    types: [
      'order_confirmed',
      'order_preparing',
      'order_ready_pickup',
      'driver_assigned',
      'driver_enroute',
      'delivery_completed',
      'delivery_failed',
    ],
  },
  pharmacy: {
    label: 'Pharmacy',
    types: [
      'flash_sale',
      'flu_shot_available',
      'new_service',
      'loyalty_points',
      'birthday_discount',
    ],
  },
  billing: {
    label: 'Billing',
    types: [
      'payment_due',
      'payment_received',
      'invoice_generated',
      'payment_failed',
    ],
  },
  system: {
    label: 'System',
    types: [
      'account_updated',
      'security_alert',
      'maintenance_scheduled',
    ],
  },
};

export const notificationService = {
  async createNotification(params: {
    userId: string;
    type: string;
    category: NotificationCategory;
    priority?: NotificationPriority;
    title: string;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    metadata?: any;
  }): Promise<{ data: Notification | null; error: Error | null }> {
    try {
      const { data, error } = await api.post<Notification>('/notifications', {
        user_id: params.userId,
        notification_type: params.type,
        category: params.category,
        priority: params.priority || 'normal',
        title: params.title,
        message: params.message,
        action_url: params.actionUrl,
        action_label: params.actionLabel,
        related_entity_type: params.relatedEntityType,
        related_entity_id: params.relatedEntityId,
        metadata: params.metadata || {},
        is_read: false,
        is_archived: false,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getNotifications(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      category?: NotificationCategory;
      unreadOnly?: boolean;
    }
  ): Promise<{
    data: Notification[] | null;
    error: Error | null;
  }> {
    try {
      const params: Record<string, any> = {
        user_id: userId,
        is_archived: false,
      };

      if (options?.category) {
        params.category = options.category;
      }

      if (options?.unreadOnly) {
        params.is_read = false;
      }

      if (options?.limit) {
        params.limit = options.limit;
      }

      if (options?.offset) {
        params.offset = options.offset;
      }

      const { data, error } = await api.get<Notification[]>('/notifications', { params });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getUnreadCount(userId: string): Promise<{
    data: number;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<{ count: number }>('/notifications/unread-count', {
        params: { user_id: userId },
      });

      if (error) throw error;
      return { data: data?.count || 0, error: null };
    } catch (error) {
      return { data: 0, error: error as Error };
    }
  },

  async markAsRead(notificationId: string): Promise<{
    data: boolean;
    error: Error | null;
  }> {
    try {
      const { error } = await api.put(`/notifications/${notificationId}`, {
        is_read: true,
        read_at: new Date().toISOString(),
      });

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  async markAllAsRead(userId: string): Promise<{
    data: boolean;
    error: Error | null;
  }> {
    try {
      const { error } = await api.put('/notifications', {
        is_read: true,
        read_at: new Date().toISOString(),
      }, {
        params: { user_id: userId, is_read: 'false' },
      });

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  async archiveNotification(notificationId: string): Promise<{
    data: boolean;
    error: Error | null;
  }> {
    try {
      const { error } = await api.put(`/notifications/${notificationId}`, {
        is_archived: true,
        archived_at: new Date().toISOString(),
      });

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  async getPreferences(userId: string): Promise<{
    data: NotificationPreference[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.get<NotificationPreference[]>('/notification-preferences', {
        params: { user_id: userId },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async updatePreference(
    preferenceId: string,
    updates: Partial<NotificationPreference>
  ): Promise<{
    data: NotificationPreference | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await api.put<NotificationPreference>(
        `/notification-preferences/${preferenceId}`,
        { ...updates, updated_at: new Date().toISOString() }
      );

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async initializePreferences(userId: string): Promise<{
    data: boolean;
    error: Error | null;
  }> {
    try {
      const categories: NotificationCategory[] = [
        'appointment',
        'insurance',
        'messaging',
        'telemedicine',
        'prescription',
        'medication',
        'delivery',
        'pharmacy',
        'billing',
        'system',
      ];

      const preferences = categories.map((category) => ({
        user_id: userId,
        category,
        push_enabled: true,
        sms_enabled: category === 'appointment' || category === 'telemedicine',
        email_enabled: true,
        in_app_enabled: true,
        frequency: 'immediate' as NotificationFrequency,
        do_not_disturb: false,
      }));

      const { error } = await api.post('/notification-preferences/bulk', preferences);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  getCategoryIcon(category: NotificationCategory): string {
    const icons: Record<NotificationCategory, string> = {
      appointment: '📅',
      insurance: '🛡️',
      messaging: '💬',
      telemedicine: '🎥',
      prescription: '💊',
      medication: '⏰',
      delivery: '🚚',
      pharmacy: '🏥',
      billing: '💳',
      system: '⚙️',
    };
    return icons[category];
  },

  getPriorityColor(priority: NotificationPriority): string {
    const colors: Record<NotificationPriority, string> = {
      critical: 'red',
      high: 'orange',
      normal: 'blue',
      low: 'gray',
    };
    return colors[priority];
  },

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  },

  groupNotificationsByDate(notifications: Notification[]): Record<string, Notification[]> {
    const groups: Record<string, Notification[]> = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    notifications.forEach((notification) => {
      const notifDate = new Date(notification.created_at);
      const notifDay = new Date(
        notifDate.getFullYear(),
        notifDate.getMonth(),
        notifDate.getDate()
      );

      if (notifDay.getTime() === today.getTime()) {
        groups.Today.push(notification);
      } else if (notifDay.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(notification);
      } else if (notifDay >= weekAgo) {
        groups['This Week'].push(notification);
      } else {
        groups.Older.push(notification);
      }
    });

    return groups;
  },
};
