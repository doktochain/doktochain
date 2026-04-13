import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { notificationService, Notification, NotificationPreference, NOTIFICATION_CATEGORIES } from '../../../../services/notificationService';
import { Bell, Package, AlertCircle, CheckCircle, Info, Settings, Save, CreditCard, MessageSquare, Calendar, Pill, Truck } from 'lucide-react';

const CATEGORY_ICONS: Record<string, any> = {
  appointment: Calendar,
  prescription: Pill,
  pharmacy: Package,
  delivery: Truck,
  billing: CreditCard,
  messaging: MessageSquare,
  system: Info,
  medication: Pill,
  insurance: AlertCircle,
  telemedicine: Info,
};

const CATEGORY_COLORS: Record<string, string> = {
  appointment: 'blue',
  prescription: 'green',
  pharmacy: 'blue',
  delivery: 'cyan',
  billing: 'orange',
  messaging: 'blue',
  system: 'gray',
  medication: 'green',
  insurance: 'yellow',
  telemedicine: 'blue',
};

export default function PharmacyNotifications() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences'>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (userProfile?.id) {
      loadNotifications();
      loadPreferences();
    }
  }, [userProfile]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const loadNotifications = async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    try {
      const { data } = await notificationService.getNotifications(userProfile.id, { limit: 50 });
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    if (!userProfile?.id) return;
    const { data } = await notificationService.getPreferences(userProfile.id);
    if (data && data.length > 0) {
      setPreferences(data);
    }
  };

  const handleMarkAllRead = async () => {
    if (!userProfile?.id) return;
    const { error } = await notificationService.markAllAsRead(userProfile.id);
    if (error) {
      showToast('error', 'Failed to mark notifications as read');
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      showToast('success', 'All notifications marked as read');
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    const { error } = await notificationService.markAsRead(notificationId);
    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
    }
  };

  const handleUpdatePreference = async (pref: NotificationPreference, field: string, value: boolean) => {
    const { error } = await notificationService.updatePreference(pref.id, { [field]: value } as Partial<NotificationPreference>);
    if (error) {
      showToast('error', 'Failed to update preference');
    } else {
      setPreferences(prev =>
        prev.map(p => p.id === pref.id ? { ...p, [field]: value } : p)
      );
    }
  };

  const handleInitializePreferences = async () => {
    if (!userProfile?.id) return;
    setPrefsLoading(true);
    const { error } = await notificationService.initializePreferences(userProfile.id);
    if (error) {
      showToast('error', 'Failed to initialize preferences');
    } else {
      showToast('success', 'Preferences initialized');
      await loadPreferences();
    }
    setPrefsLoading(false);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const todayCount = notifications.filter(n => {
    const d = new Date(n.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const getNotificationBg = (notification: Notification) => {
    if (!notification.is_read) return 'bg-blue-50/50 dark:bg-blue-900/10';
    return '';
  };

  const getIconForNotification = (notification: Notification) => {
    return CATEGORY_ICONS[notification.category] || Bell;
  };

  const getColorForNotification = (notification: Notification) => {
    const color = CATEGORY_COLORS[notification.category] || 'blue';
    const colors: Record<string, { bg: string; text: string }> = {
      blue: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
      green: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
      orange: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
      yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400' },
      red: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
      cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400' },
      gray: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Stay updated with orders and alerts</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'notifications'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Bell className="w-4 h-4 inline mr-2" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'preferences'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Preferences
          </button>
        </div>
      </div>

      {activeTab === 'notifications' && (
        <>
          <div className="flex justify-between items-center">
            <button
              onClick={loadNotifications}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            >
              Refresh
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium text-sm"
              >
                Mark All as Read
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Notifications</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{notifications.length}</p>
                </div>
                <Bell className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Unread</p>
                  <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
                </div>
                <Bell className="w-8 h-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Today</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayCount}</p>
                </div>
                <Bell className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Notifications</h3>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-4">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => {
                  const Icon = getIconForNotification(notification);
                  const colorClasses = getColorForNotification(notification);
                  return (
                    <div
                      key={notification.id}
                      onClick={() => !notification.is_read && handleMarkRead(notification.id)}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition ${getNotificationBg(notification)}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClasses.bg}`}>
                          <Icon className={`w-5 h-5 ${colorClasses.text}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className={`text-sm ${!notification.is_read ? 'font-bold' : 'font-medium'} text-gray-900 dark:text-white`}>
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 truncate">{notification.message}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {notificationService.formatTimeAgo(notification.created_at)}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 capitalize">
                              {notification.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'preferences' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
          {preferences.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">No notification preferences configured yet.</p>
              <button
                onClick={handleInitializePreferences}
                disabled={prefsLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
              >
                {prefsLoading ? 'Setting up...' : 'Set Up Preferences'}
              </button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Notification Categories</h2>
                <div className="space-y-3">
                  {preferences.map((pref) => {
                    const categoryConfig = NOTIFICATION_CATEGORIES[pref.category as keyof typeof NOTIFICATION_CATEGORIES];
                    return (
                      <div key={pref.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {categoryConfig?.label || pref.category}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pref.in_app_enabled}
                              onChange={(e) => handleUpdatePreference(pref, 'in_app_enabled', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">In-App</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pref.email_enabled}
                              onChange={(e) => handleUpdatePreference(pref, 'email_enabled', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pref.push_enabled}
                              onChange={(e) => handleUpdatePreference(pref, 'push_enabled', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Push</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pref.sms_enabled}
                              onChange={(e) => handleUpdatePreference(pref, 'sms_enabled', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">SMS</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
