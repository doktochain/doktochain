import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { providerNotificationService, NotificationPreferences, NotificationStats } from '../../../../services/providerNotificationService';
import { notificationService, Notification } from '../../../../services/notificationService';
import { providerService } from '../../../../services/providerService';
import { Bell, Mail, MessageSquare, Smartphone, Clock, Check, Trash2, Filter, AlertTriangle, Info, Settings, Inbox, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isValidInternalUrl } from '../../../../lib/security';

export default function ProviderNotificationsPreferences() {
  const { user } = useAuth();
  const { currentColors } = useTheme();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences'>('notifications');
  const [notificationsSubTab, setNotificationsSubTab] = useState<'all' | 'unread' | 'urgent'>('all');

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    urgent: 0,
    high: 0,
    normal: 0,
    low: 0,
    today: 0,
    thisWeek: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Preferences state
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [preferencesTab, setPreferencesTab] = useState<'channels' | 'appointments' | 'patients' | 'clinical' | 'admin' | 'billing'>('channels');
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(() => {
    if (user) {
      loadProviderData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, notificationsSubTab]);

  const loadProviderData = async () => {
    try {
      setLoading(true);
      const providerData = await providerService.getProviderByUserId(user!.id).catch(() => null);
      setProvider(providerData);

      await Promise.all([
        loadNotifications(),
        loadStats(),
        providerData ? loadPreferences(providerData.id) : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Error loading provider data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const unreadOnly = notificationsSubTab === 'unread';
      const { data } = await notificationService.getNotifications(user.id, {
        unreadOnly,
        limit: 100,
      });
      let list = data || [];
      if (notificationsSubTab === 'urgent') {
        list = list.filter((n: any) => n.priority === 'critical' || n.priority === 'high');
      }
      setNotifications(list);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    try {
      const { data } = await notificationService.getNotifications(user.id, { limit: 200 });
      const all = data || [];
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      setStats({
        total: all.length,
        unread: all.filter((n: any) => !n.is_read).length,
        urgent: all.filter((n: any) => n.priority === 'critical' || n.priority === 'high').length,
        high: all.filter((n: any) => n.priority === 'high').length,
        normal: all.filter((n: any) => n.priority === 'normal').length,
        low: all.filter((n: any) => n.priority === 'low').length,
        today: all.filter((n: any) => new Date(n.created_at) >= todayStart).length,
        thisWeek: all.filter((n: any) => new Date(n.created_at) >= weekStart).length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPreferences = async (providerId: string) => {
    try {
      let data = await providerNotificationService.getPreferences(providerId);

      // If preferences don't exist, create default preferences
      if (!data) {
        const defaultPrefs = {
          provider_id: providerId,
          email_enabled: true,
          sms_enabled: false,
          push_enabled: true,
          in_app_enabled: true,
        };

        // Create default preferences
        const { data: created, error } = await supabase
          .from('provider_notification_preferences')
          .insert(defaultPrefs)
          .select()
          .single();

        if (!error && created) {
          data = created;
        }
      }

      setPreferences(data);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      await loadNotifications();
      await loadStats();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      await notificationService.markAllAsRead(user.id);
      await loadNotifications();
      await loadStats();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleArchive = async (notificationId: string) => {
    try {
      await notificationService.archiveNotification(notificationId);
      await loadNotifications();
      await loadStats();
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      await loadNotifications();
      await loadStats();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleUpdatePreferences = async (updates: Partial<NotificationPreferences>) => {
    try {
      setSavingPreferences(true);
      if (provider && preferences) {
        const updated = await providerNotificationService.updatePreferences(provider.id, updates);
        setPreferences(updated);
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    } finally {
      setSavingPreferences(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'normal':
        return 'text-blue-600 bg-blue-50';
      case 'low':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: currentColors.primary }}></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications & Preferences</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your notification settings and view alerts</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Notifications</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <div className="p-3 rounded-full" style={{ backgroundColor: currentColors.primaryLight }}>
              <Bell className="text-2xl" style={{ color: currentColors.primary }} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unread</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.unread}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <Inbox className="text-2xl text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Urgent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.urgent}</p>
            </div>
            <div className="p-3 rounded-full bg-red-100">
              <AlertTriangle className="text-2xl text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.today}</p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <Clock className="text-2xl text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'notifications'
                  ? 'border-current text-current'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              style={activeTab === 'notifications' ? { color: currentColors.primary, borderColor: currentColors.primary } : {}}
            >
              <div className="flex items-center gap-2">
                <Bell className="text-lg" />
                <span>Notifications</span>
                {stats.unread > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                    {stats.unread}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('preferences')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'preferences'
                  ? 'border-current text-current'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              style={activeTab === 'preferences' ? { color: currentColors.primary, borderColor: currentColors.primary } : {}}
            >
              <div className="flex items-center gap-2">
                <Settings className="text-lg" />
                <span>Preferences</span>
              </div>
            </button>
          </div>
        </div>

        {/* Notifications Tab Content */}
        {activeTab === 'notifications' && (
          <div className="p-6">
            {/* Sub-tabs and Actions */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setNotificationsSubTab('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    notificationsSubTab === 'all'
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  style={notificationsSubTab === 'all' ? { backgroundColor: currentColors.primary } : {}}
                >
                  All ({stats.total})
                </button>
                <button
                  onClick={() => setNotificationsSubTab('unread')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    notificationsSubTab === 'unread'
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  style={notificationsSubTab === 'unread' ? { backgroundColor: currentColors.primary } : {}}
                >
                  Unread ({stats.unread})
                </button>
                <button
                  onClick={() => setNotificationsSubTab('urgent')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    notificationsSubTab === 'urgent'
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  style={notificationsSubTab === 'urgent' ? { backgroundColor: currentColors.primary } : {}}
                >
                  Urgent ({stats.urgent})
                </button>
              </div>

              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: currentColors.primary }}
                disabled={stats.unread === 0}
              >
                <div className="flex items-center gap-2">
                  <Check />
                  <span>Mark All Read</span>
                </div>
              </button>
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No notifications to display</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      notification.is_read
                        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}
                    onClick={() => setSelectedNotification(notification)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(notification.priority)}`}>
                            {notification.priority.toUpperCase()}
                          </span>
                          {!notification.is_read && (
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentColors.primary }}></span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(notification.created_at)}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{notification.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">{notification.message}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="text-gray-600 dark:text-gray-400" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchive(notification.id);
                          }}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Archive"
                        >
                          <Archive className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                          }}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="text-red-600" />
                        </button>
                      </div>
                    </div>
                    {notification.action_url && isValidInternalUrl(notification.action_url) && (
                      <div className="mt-3">
                        <button
                          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                          style={{ backgroundColor: currentColors.primary }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(notification.action_url!);
                          }}
                        >
                          {notification.action_label || 'View Details'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Preferences Tab Content */}
        {activeTab === 'preferences' && preferences && (
          <div className="p-6">
            {/* Preferences Sub-tabs */}
            <div className="flex space-x-4 mb-6 overflow-x-auto">
              {[
                { key: 'channels', label: 'Channels', icon: Bell },
                { key: 'appointments', label: 'Appointments', icon: Clock },
                { key: 'patients', label: 'Patients', icon: Info },
                { key: 'clinical', label: 'Clinical Alerts', icon: AlertTriangle },
                { key: 'admin', label: 'Administrative', icon: Settings },
                { key: 'billing', label: 'Billing', icon: Info },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setPreferencesTab(tab.key as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      preferencesTab === tab.key
                        ? 'text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    style={preferencesTab === tab.key ? { backgroundColor: currentColors.primary } : {}}
                  >
                    <div className="flex items-center gap-2">
                      <Icon />
                      <span>{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Channel Preferences */}
            {preferencesTab === 'channels' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Master Channel Controls</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'email_enabled', label: 'Email Notifications', icon: Mail },
                      { key: 'sms_enabled', label: 'SMS Notifications', icon: MessageSquare },
                      { key: 'push_enabled', label: 'Push Notifications', icon: Smartphone },
                      { key: 'in_app_enabled', label: 'In-App Notifications', icon: Bell },
                    ].map((channel) => {
                      const Icon = channel.icon;
                      return (
                        <div key={channel.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Icon className="text-xl" style={{ color: currentColors.primary }} />
                            <span className="font-medium text-gray-900 dark:text-white">{channel.label}</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={preferences[channel.key as keyof NotificationPreferences] as boolean}
                              onChange={(e) => handleUpdatePreferences({ [channel.key]: e.target.checked })}
                            />
                            <div
                              className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                              style={
                                (preferences[channel.key as keyof NotificationPreferences] as boolean)
                                  ? { backgroundColor: currentColors.primary }
                                  : {}
                              }
                            ></div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quiet Hours</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="font-medium text-gray-900 dark:text-white">Enable Quiet Hours</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={preferences.quiet_hours_enabled}
                          onChange={(e) => handleUpdatePreferences({ quiet_hours_enabled: e.target.checked })}
                        />
                        <div
                          className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                          style={preferences.quiet_hours_enabled ? { backgroundColor: currentColors.primary } : {}}
                        ></div>
                      </label>
                    </div>

                    {preferences.quiet_hours_enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time</label>
                          <input
                            type="time"
                            value={preferences.quiet_hours_start}
                            onChange={(e) => handleUpdatePreferences({ quiet_hours_start: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Time</label>
                          <input
                            type="time"
                            value={preferences.quiet_hours_end}
                            onChange={(e) => handleUpdatePreferences({ quiet_hours_end: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Appointment Preferences */}
            {preferencesTab === 'appointments' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appointment Notifications</h3>
                {[
                  { prefix: 'appointment_new_booking', label: 'New Bookings' },
                  { prefix: 'appointment_cancellation', label: 'Cancellations' },
                  { prefix: 'appointment_reschedule', label: 'Reschedules' },
                  { prefix: 'appointment_reminder', label: 'Reminders' },
                ].map((item) => (
                  <div key={item.prefix} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">{item.label}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {['email', 'sms', 'push'].map((channel) => {
                        const key = `${item.prefix}_${channel}` as keyof NotificationPreferences;
                        return (
                          <label key={channel} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences[key] as boolean}
                              onChange={(e) => handleUpdatePreferences({ [key]: e.target.checked })}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: currentColors.primary }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{channel}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Patient Communication Preferences */}
            {preferencesTab === 'patients' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Patient Communication Notifications</h3>
                {[
                  { prefix: 'patient_message', label: 'Patient Messages', description: 'Receive alerts when patients send you messages' },
                  { prefix: 'patient_document_upload', label: 'Document Uploads', description: 'Be notified when patients upload documents or images' },
                ].map((item) => (
                  <div key={item.prefix} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">{item.label}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {['email', 'sms', 'push'].map((channel) => {
                        const key = `${item.prefix}_${channel}` as keyof NotificationPreferences;
                        return (
                          <label key={channel} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences[key] as boolean}
                              onChange={(e) => handleUpdatePreferences({ [key]: e.target.checked })}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: currentColors.primary }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{channel}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Clinical Alerts Preferences */}
            {preferencesTab === 'clinical' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Clinical Alert Notifications</h3>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 dark:text-yellow-400 mt-1" />
                    <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-300">Critical Alerts</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                        Clinical alerts are high-priority notifications. We recommend keeping at least one channel enabled.
                      </p>
                    </div>
                  </div>
                </div>
                {[
                  { prefix: 'critical_lab_result', label: 'Critical Lab Results', description: 'Immediate notification for abnormal or critical lab values', priority: 'urgent' },
                  { prefix: 'prescription_refill_request', label: 'Prescription Refill Requests', description: 'Patient requests for prescription refills', priority: 'high' },
                ].map((item) => (
                  <div key={item.prefix} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4" style={{ borderColor: item.priority === 'urgent' ? '#dc2626' : '#f59e0b' }}>
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{item.label}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {item.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {['email', 'sms', 'push'].map((channel) => {
                        const key = `${item.prefix}_${channel}` as keyof NotificationPreferences;
                        return (
                          <label key={channel} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences[key] as boolean}
                              onChange={(e) => handleUpdatePreferences({ [key]: e.target.checked })}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: currentColors.primary }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{channel}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Administrative Preferences */}
            {preferencesTab === 'admin' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Administrative Notifications</h3>
                {[
                  { prefix: 'staff_schedule_change', label: 'Staff Schedule Changes', description: 'Be notified when staff members update their schedules' },
                  { prefix: 'license_expiry_reminder', label: 'License Expiry Reminders', description: 'Receive reminders before your medical license expires' },
                ].map((item) => (
                  <div key={item.prefix} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">{item.label}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {['email', 'sms', 'push'].map((channel) => {
                        const key = `${item.prefix}_${channel}` as keyof NotificationPreferences;
                        return (
                          <label key={channel} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences[key] as boolean}
                              onChange={(e) => handleUpdatePreferences({ [key]: e.target.checked })}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: currentColors.primary }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{channel}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Billing Preferences */}
            {preferencesTab === 'billing' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Billing & Payment Notifications</h3>
                {[
                  { prefix: 'payment_received', label: 'Payment Received', description: 'Get notified when patient payments are processed' },
                  { prefix: 'insurance_claim_status', label: 'Insurance Claim Status', description: 'Updates on insurance claim submissions and approvals' },
                ].map((item) => (
                  <div key={item.prefix} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">{item.label}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {['email', 'sms', 'push'].map((channel) => {
                        const key = `${item.prefix}_${channel}` as keyof NotificationPreferences;
                        return (
                          <label key={channel} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences[key] as boolean}
                              onChange={(e) => handleUpdatePreferences({ [key]: e.target.checked })}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: currentColors.primary }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{channel}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {savingPreferences && (
              <div className="fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg text-white" style={{ backgroundColor: currentColors.primary }}>
                Saving preferences...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
