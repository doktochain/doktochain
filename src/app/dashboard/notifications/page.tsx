import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import {
  notificationService,
  Notification,
  NotificationPreference,
  NotificationCategory,
  NOTIFICATION_CATEGORIES,
} from '../../../services/notificationService';
import {
  Bell,
  Check,
  CheckCheck,
  Archive,
  Settings,
  Filter,
  ChevronRight,
  Clock,
  AlertCircle,
  Smartphone,
  Mail,
  MessageSquare,
} from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'preferences'>('all');
  const [filterCategory, setFilterCategory] = useState<NotificationCategory | 'all'>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filterCategory]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-page')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [notifRes, prefsRes, countRes] = await Promise.all([
      notificationService.getNotifications(user.id, {
        category: filterCategory === 'all' ? undefined : filterCategory,
        limit: 50,
      }),
      notificationService.getPreferences(user.id),
      notificationService.getUnreadCount(user.id),
    ]);

    if (notifRes.data) setNotifications(notifRes.data);
    if (prefsRes.data) setPreferences(prefsRes.data);
    if (countRes.data !== null) setUnreadCount(countRes.data);

    setLoading(false);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    loadData();
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    loadData();
  };

  const handleArchive = async (notificationId: string) => {
    await notificationService.archiveNotification(notificationId);
    loadData();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Please log in to view notifications</div>
      </div>
    );
  }

  const groupedNotifications = notificationService.groupNotificationsByDate(notifications);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Stay updated with your health information
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
            >
              <CheckCheck className="w-5 h-5" />
              Mark All Read
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-5 h-5" />
            Filter
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Filter by Category</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                filterCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {Object.entries(NOTIFICATION_CATEGORIES).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setFilterCategory(key as NotificationCategory)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  filterCategory === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {notificationService.getCategoryIcon(key as NotificationCategory)} {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Bell className="w-5 h-5" />
              All Notifications
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
                activeTab === 'preferences'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-5 h-5" />
              Preferences
            </button>
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === 'all' ? (
            <NotificationsList
              groupedNotifications={groupedNotifications}
              onMarkAsRead={handleMarkAsRead}
              onArchive={handleArchive}
            />
          ) : (
            <PreferencesTab preferences={preferences} onUpdate={loadData} />
          )}
        </div>
      </div>
    </div>
  );
}

const NotificationsList: React.FC<{
  groupedNotifications: Record<string, Notification[]>;
  onMarkAsRead: (id: string) => void;
  onArchive: (id: string) => void;
}> = ({ groupedNotifications, onMarkAsRead, onArchive }) => {
  const hasNotifications = Object.values(groupedNotifications).some((group) => group.length > 0);

  if (!hasNotifications) {
    return (
      <div className="text-center py-12">
        <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
        <p className="text-gray-600">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedNotifications).map(
        ([group, notifs]) =>
          notifs.length > 0 && (
            <div key={group}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {group}
              </h3>
              <div className="space-y-2">
                {notifs.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    onArchive={onArchive}
                  />
                ))}
              </div>
            </div>
          )
      )}
    </div>
  );
};

const NotificationCard: React.FC<{
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onArchive: (id: string) => void;
}> = ({ notification, onMarkAsRead, onArchive }) => {
  const priorityColor = notificationService.getPriorityColor(notification.priority);
  const categoryIcon = notificationService.getCategoryIcon(notification.category);
  const timeAgo = notificationService.formatTimeAgo(notification.created_at);

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
        notification.is_read
          ? 'bg-white border-gray-200'
          : 'bg-blue-50 border-blue-200'
      } hover:shadow-md`}
    >
      <div className="flex-shrink-0">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
            notification.is_read ? 'bg-gray-100' : `bg-${priorityColor}-100`
          }`}
        >
          {categoryIcon}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h4 className={`font-medium ${notification.is_read ? 'text-gray-900' : 'text-blue-900'}`}>
            {notification.title}
          </h4>
          <div className="flex items-center gap-2 flex-shrink-0">
            {notification.priority === 'critical' && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                Urgent
              </span>
            )}
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3">{notification.message}</p>

        <div className="flex items-center gap-2">
          {notification.action_url && (
            <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
              {notification.action_label || 'View Details'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <div className="flex-1"></div>

          {!notification.is_read && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Mark as read"
            >
              <Check className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onArchive(notification.id)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Archive"
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const PreferencesTab: React.FC<{
  preferences: NotificationPreference[];
  onUpdate: () => void;
}> = ({ preferences, onUpdate }) => {
  const handleToggle = async (
    preference: NotificationPreference,
    field: keyof NotificationPreference,
    value: boolean
  ) => {
    await notificationService.updatePreference(preference.id, { [field]: value });
    onUpdate();
  };

  if (preferences.length === 0) {
    const defaultCategories = Object.entries(NOTIFICATION_CATEGORIES);

    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Notification Channels</h3>
              <p className="text-sm text-blue-800">
                Control how you receive notifications for each category. You can enable multiple
                channels for important notifications.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {defaultCategories.map(([key, { label, types }]) => (
            <div key={key} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {notificationService.getCategoryIcon(key as NotificationCategory)}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{label}</h3>
                    <p className="text-sm text-gray-600">{types.length} notification types</p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Enabled</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ChannelToggle
                  icon={<Smartphone className="w-5 h-5" />}
                  label="Push Notifications"
                  checked={true}
                  onChange={() => {}}
                />

                <ChannelToggle
                  icon={<MessageSquare className="w-5 h-5" />}
                  label="SMS"
                  checked={true}
                  onChange={() => {}}
                />

                <ChannelToggle
                  icon={<Mail className="w-5 h-5" />}
                  label="Email"
                  checked={true}
                  onChange={() => {}}
                />
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Frequency: instant</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Notification Channels</h3>
            <p className="text-sm text-blue-800">
              Control how you receive notifications for each category. You can enable multiple
              channels for important notifications.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {preferences.map((pref) => (
          <div key={pref.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {notificationService.getCategoryIcon(pref.category)}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {NOTIFICATION_CATEGORIES[pref.category].label}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {NOTIFICATION_CATEGORIES[pref.category].types.length} notification types
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pref.in_app_enabled}
                  onChange={(e) => handleToggle(pref, 'in_app_enabled', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Enabled</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ChannelToggle
                icon={<Smartphone className="w-5 h-5" />}
                label="Push Notifications"
                checked={pref.push_enabled}
                onChange={(checked) => handleToggle(pref, 'push_enabled', checked)}
              />

              <ChannelToggle
                icon={<MessageSquare className="w-5 h-5" />}
                label="SMS"
                checked={pref.sms_enabled}
                onChange={(checked) => handleToggle(pref, 'sms_enabled', checked)}
              />

              <ChannelToggle
                icon={<Mail className="w-5 h-5" />}
                label="Email"
                checked={pref.email_enabled}
                onChange={(checked) => handleToggle(pref, 'email_enabled', checked)}
              />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Frequency: {pref.frequency.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChannelToggle: React.FC<{
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ icon, label, checked, onChange }) => (
  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
    />
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  </label>
);