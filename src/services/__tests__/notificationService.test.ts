import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');

function chainMock(resolveValue: { data: any; error: any; count?: number }) {
  const chain: any = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), upsert: vi.fn(),
    eq: vi.fn(), neq: vi.fn(), in: vi.fn(), or: vi.fn(),
    order: vi.fn(), limit: vi.fn(), range: vi.fn(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((k) => {
    if (!['then', 'single', 'maybeSingle'].includes(k)) chain[k].mockReturnValue(chain);
  });
  return chain;
}

const { notificationService } = await import('../notificationService');

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('inserts notification with correct fields', async () => {
      const notif = { id: 'n1', title: 'Test', is_read: false };
      const chain = chainMock({ data: notif, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await notificationService.createNotification({
        userId: 'u1',
        type: 'appointment_confirmation',
        category: 'appointment',
        title: 'Test',
        message: 'Test message',
      });
      expect(result.data).toEqual(notif);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    it('defaults priority to normal', async () => {
      const chain = chainMock({ data: { id: 'n1' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await notificationService.createNotification({
        userId: 'u1',
        type: 'test',
        category: 'system',
        title: 'Test',
        message: 'msg',
      });
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'normal' })
      );
    });

    it('returns error on failure', async () => {
      const chain = chainMock({ data: null, error: new Error('insert failed') });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await notificationService.createNotification({
        userId: 'u1',
        type: 'test',
        category: 'system',
        title: 'Test',
        message: 'msg',
      });
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('getNotifications', () => {
    it('queries notifications for user', async () => {
      const notifs = [{ id: 'n1', title: 'Test' }];
      const chain = chainMock({ data: notifs, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await notificationService.getNotifications('u1');
      expect(result.data).toEqual(notifs);
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(chain.eq).toHaveBeenCalledWith('is_archived', false);
    });

    it('filters by category when specified', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await notificationService.getNotifications('u1', { category: 'appointment' });
      expect(chain.eq).toHaveBeenCalledWith('category', 'appointment');
    });

    it('filters by unread when specified', async () => {
      const chain = chainMock({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      await notificationService.getNotifications('u1', { unreadOnly: true });
      expect(chain.eq).toHaveBeenCalledWith('is_read', false);
    });
  });

  describe('markAsRead', () => {
    it('updates notification as read', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await notificationService.markAsRead('n1');
      expect(result.data).toBe(true);
      expect(chain.eq).toHaveBeenCalledWith('id', 'n1');
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read for user', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await notificationService.markAllAsRead('u1');
      expect(result.data).toBe(true);
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(chain.eq).toHaveBeenCalledWith('is_read', false);
    });
  });

  describe('archiveNotification', () => {
    it('archives notification by id', async () => {
      const chain = chainMock({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await notificationService.archiveNotification('n1');
      expect(result.data).toBe(true);
    });
  });

  describe('getCategoryIcon', () => {
    it('returns correct icon for each category', () => {
      expect(notificationService.getCategoryIcon('appointment')).toBe('📅');
      expect(notificationService.getCategoryIcon('insurance')).toBe('🛡️');
      expect(notificationService.getCategoryIcon('messaging')).toBe('💬');
      expect(notificationService.getCategoryIcon('telemedicine')).toBe('🎥');
      expect(notificationService.getCategoryIcon('prescription')).toBe('💊');
      expect(notificationService.getCategoryIcon('medication')).toBe('⏰');
      expect(notificationService.getCategoryIcon('delivery')).toBe('🚚');
      expect(notificationService.getCategoryIcon('pharmacy')).toBe('🏥');
      expect(notificationService.getCategoryIcon('billing')).toBe('💳');
      expect(notificationService.getCategoryIcon('system')).toBe('⚙️');
    });
  });

  describe('getPriorityColor', () => {
    it('returns correct color for each priority', () => {
      expect(notificationService.getPriorityColor('critical')).toBe('red');
      expect(notificationService.getPriorityColor('high')).toBe('orange');
      expect(notificationService.getPriorityColor('normal')).toBe('blue');
      expect(notificationService.getPriorityColor('low')).toBe('gray');
    });
  });

  describe('formatTimeAgo', () => {
    it('returns "Just now" for < 60 seconds', () => {
      const now = new Date().toISOString();
      expect(notificationService.formatTimeAgo(now)).toBe('Just now');
    });

    it('returns minutes ago for < 1 hour', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(notificationService.formatTimeAgo(fiveMinAgo)).toBe('5m ago');
    });

    it('returns hours ago for < 24 hours', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      expect(notificationService.formatTimeAgo(threeHoursAgo)).toBe('3h ago');
    });

    it('returns days ago for < 7 days', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(notificationService.formatTimeAgo(twoDaysAgo)).toBe('2d ago');
    });

    it('returns locale date for >= 7 days', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const result = notificationService.formatTimeAgo(twoWeeksAgo.toISOString());
      expect(result).toBe(twoWeeksAgo.toLocaleDateString());
    });
  });

  describe('groupNotificationsByDate', () => {
    it('groups notifications into Today, Yesterday, This Week, Older', () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const notifications = [
        { id: 'n1', created_at: today.toISOString() },
        { id: 'n2', created_at: yesterday.toISOString() },
        { id: 'n3', created_at: threeDaysAgo.toISOString() },
        { id: 'n4', created_at: twoWeeksAgo.toISOString() },
      ] as any;

      const groups = notificationService.groupNotificationsByDate(notifications);
      expect(groups.Today).toHaveLength(1);
      expect(groups.Yesterday).toHaveLength(1);
      expect(groups['This Week']).toHaveLength(1);
      expect(groups.Older).toHaveLength(1);
    });

    it('handles empty notifications array', () => {
      const groups = notificationService.groupNotificationsByDate([]);
      expect(groups.Today).toHaveLength(0);
      expect(groups.Yesterday).toHaveLength(0);
      expect(groups['This Week']).toHaveLength(0);
      expect(groups.Older).toHaveLength(0);
    });
  });

  describe('initializePreferences', () => {
    it('creates preferences for all 10 categories', async () => {
      const chain = chainMock({ data: null, error: null });
      chain.upsert = vi.fn().mockReturnValue(chain);
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await notificationService.initializePreferences('u1');
      expect(result.data).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('notification_preferences');
    });
  });
});
