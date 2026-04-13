import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notificationService, Notification } from '../services/notificationService';
import { useSupabaseQuery } from './useSupabaseQuery';
import { useSupabaseMutation } from './useSupabaseMutation';

export function useNotifications(limit = 20, offset = 0) {
  const { user } = useAuth();

  const queryFn = useCallback(
    () =>
      user
        ? notificationService.getNotifications(user.id, { limit, offset })
        : Promise.resolve({ notifications: [], total: 0, unread: 0 }),
    [user?.id, limit, offset]
  );

  return useSupabaseQuery(user ? queryFn : null, [user?.id, limit, offset]);
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();

  const queryFn = useCallback(
    () =>
      user
        ? notificationService.getUnreadCount(user.id)
        : Promise.resolve({ total: 0, by_priority: {} }),
    [user?.id]
  );

  return useSupabaseQuery(user ? queryFn : null, [user?.id]);
}

export function useMarkNotificationRead() {
  return useSupabaseMutation<{ success: boolean }, string>(
    (notificationId) => notificationService.markAsRead(notificationId)
  );
}

export function useMarkAllNotificationsRead() {
  const { user } = useAuth();
  return useSupabaseMutation<{ success: boolean; count: number }, void>(
    () => notificationService.markAllAsRead(user?.id ?? '')
  );
}

export function useArchiveNotification() {
  return useSupabaseMutation<{ success: boolean }, string>(
    (notificationId) => notificationService.archiveNotification(notificationId)
  );
}
