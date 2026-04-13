import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Archive, Filter, Trash2 } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { clinicService, ClinicNotification } from '../../../../services/clinicService';

type FilterType = 'all' | 'unread' | 'read' | 'archived';

const PRIORITY_STYLES: Record<string, string> = {
  high: 'border-l-red-500 bg-red-50/30',
  medium: 'border-l-amber-500 bg-amber-50/30',
  low: 'border-l-blue-500 bg-blue-50/30',
  normal: 'border-l-gray-300',
};

const CATEGORY_COLORS: Record<string, string> = {
  affiliation: 'bg-blue-100 text-blue-700',
  appointment: 'bg-green-100 text-green-700',
  system: 'bg-gray-100 text-gray-700',
  billing: 'bg-amber-100 text-amber-700',
  message: 'bg-teal-100 text-teal-700',
};

export default function ClinicNotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ClinicNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const notifs = await clinicService.getClinicNotifications(user!.id);
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    setProcessing(id);
    try {
      await clinicService.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
    } catch (error) {
      console.error('Error marking read:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleArchive = async (id: string) => {
    setProcessing(id);
    try {
      await clinicService.archiveNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error archiving:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await clinicService.markAllNotificationsRead(user!.id);
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Error marking all read:', error);
    }
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: notifications.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'read', label: 'Read', count: notifications.length - unreadCount },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-gray-500 mt-1">
            Stay updated on clinic activity
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <CheckCheck size={16} /> Mark All Read
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
            {f.count !== undefined && (
              <span className={`ml-1.5 text-xs ${filter === f.key ? 'text-blue-200' : 'text-gray-400'}`}>
                ({f.count})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-700">No notifications</p>
            <p className="text-sm text-gray-500 mt-1">
              {filter === 'unread' ? 'All caught up! No unread notifications.' : 'No notifications to display.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(notification => (
              <div
                key={notification.id}
                className={`p-5 transition border-l-4 ${
                  PRIORITY_STYLES[notification.priority] || PRIORITY_STYLES.normal
                } ${!notification.is_read ? 'bg-blue-50/20' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!notification.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                      )}
                      <h4 className={`text-sm ${!notification.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                        {notification.title}
                      </h4>
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full capitalize ${
                        CATEGORY_COLORS[notification.category] || 'bg-gray-100 text-gray-600'
                      }`}>
                        {notification.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{formatDate(notification.created_at)}</p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        disabled={processing === notification.id}
                        title="Mark as read"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleArchive(notification.id)}
                      disabled={processing === notification.id}
                      title="Archive"
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition disabled:opacity-50"
                    >
                      <Archive size={16} />
                    </button>
                  </div>
                </div>

                {notification.action_url && notification.action_label && notification.action_url.startsWith('/') && (
                  <a
                    href={notification.action_url}
                    className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {notification.action_label}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
