import { useState, useEffect } from 'react';
import {
  Calendar,
  Send,
  Users,
  Plus,
  X,
  Clock,
  Ban,
  CheckCircle,
  AlertCircle,
  Search,
  MoreVertical,
} from 'lucide-react';
import { messagingService, AutomatedMessage } from '../../../../../services/messagingService';
import { useAuth } from '../../../../../contexts/AuthContext';
import { supabase } from '../../../../../lib/supabase';

const MESSAGE_TYPES = [
  { value: 'appointment_reminder', label: 'Appointment Reminder', icon: Calendar, color: 'sky' },
  { value: 'follow_up', label: 'Follow-up', icon: Send, color: 'emerald' },
  { value: 'prescription_reminder', label: 'Prescription Reminder', icon: Clock, color: 'teal' },
  { value: 'lab_notification', label: 'Lab Notification', icon: AlertCircle, color: 'amber' },
  { value: 'health_maintenance', label: 'Health Maintenance', icon: CheckCircle, color: 'green' },
  { value: 'bulk_announcement', label: 'Bulk Announcement', icon: Users, color: 'orange' },
];

const DELIVERY_CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'in_app', label: 'In-App' },
  { value: 'push', label: 'Push' },
];

interface ScheduleFormData {
  message_type: string;
  subject: string;
  content: string;
  scheduled_for: string;
  delivery_channels: string[];
  target_patient_id: string;
}

const emptyForm: ScheduleFormData = {
  message_type: 'appointment_reminder',
  subject: '',
  content: '',
  scheduled_for: '',
  delivery_channels: ['email'],
  target_patient_id: '',
};

export default function AutomatedMessagingPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AutomatedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ScheduleFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadMessages();
  }, [user, statusFilter]);

  const loadMessages = async () => {
    if (!user) return;
    setLoading(true);
    const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
    const { data } = await messagingService.getAutomatedMessages(user.id, filters);
    if (data) setMessages(data);
    setLoading(false);
  };

  const loadPatients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('appointments')
      .select('patient_id, patients:patient_id(id, user_id, user_profiles:user_id(first_name, last_name))')
      .eq('provider_id', user.id)
      .not('patient_id', 'is', null);

    if (data) {
      const unique = new Map();
      data.forEach((a: any) => {
        if (a.patients?.user_id && !unique.has(a.patients.user_id)) {
          const profile = a.patients.user_profiles;
          unique.set(a.patients.user_id, {
            id: a.patients.user_id,
            name: profile ? `${profile.first_name} ${profile.last_name}` : 'Patient',
          });
        }
      });
      setPatients(Array.from(unique.values()));
    }
  };

  const handleOpenSchedule = () => {
    setForm({
      ...emptyForm,
      scheduled_for: getDefaultScheduleTime(),
    });
    setShowModal(true);
    loadPatients();
  };

  const getDefaultScheduleTime = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const handleSave = async () => {
    if (!user || !form.content.trim() || !form.scheduled_for) return;
    setSaving(true);

    await messagingService.createAutomatedMessage({
      provider_id: user.id,
      message_type: form.message_type,
      subject: form.subject || undefined,
      content: form.content,
      scheduled_for: new Date(form.scheduled_for).toISOString(),
      delivery_channels: form.delivery_channels,
      target_patient_id: form.target_patient_id || undefined,
      status: 'scheduled',
    });

    setSaving(false);
    setShowModal(false);
    loadMessages();
  };

  const handleCancel = async (id: string) => {
    await messagingService.cancelAutomatedMessage(id);
    setActionMenuId(null);
    loadMessages();
  };

  const filteredMessages = messages.filter((m) => {
    const matchesSearch =
      (m.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.message_type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const toggleChannel = (channel: string) => {
    setForm((prev) => {
      const channels = prev.delivery_channels.includes(channel)
        ? prev.delivery_channels.filter((c) => c !== channel)
        : [...prev.delivery_channels, channel];
      return { ...prev, delivery_channels: channels.length > 0 ? channels : prev.delivery_channels };
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
      sent: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      failed: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    };
    return styles[status] || styles.scheduled;
  };

  const getTypeConfig = (type: string) => {
    return MESSAGE_TYPES.find((t) => t.value === type) || MESSAGE_TYPES[0];
  };

  const stats = {
    scheduled: messages.filter((m) => m.status === 'scheduled').length,
    sent: messages.filter((m) => m.status === 'sent').length,
    cancelled: messages.filter((m) => m.status === 'cancelled').length,
    total: messages.length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automated Messaging</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Schedule and manage automated patient communications
          </p>
        </div>
        <button
          onClick={handleOpenSchedule}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition font-medium"
        >
          <Plus className="w-4 h-4" />
          Schedule Message
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Send className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Messages</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.scheduled}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Scheduled</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.sent}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sent</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.cancelled}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cancelled</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'scheduled', 'sent', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-lg text-sm capitalize transition ${
                  statusFilter === status
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">No automated messages found</p>
            <button
              onClick={handleOpenSchedule}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Schedule your first message
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject / Content</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Scheduled For</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Channels</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredMessages.map((msg) => {
                  const typeConfig = getTypeConfig(msg.message_type);
                  const Icon = typeConfig.icon;
                  return (
                    <tr key={msg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-900 dark:text-white font-medium">
                            {typeConfig.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {msg.subject && (
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">{msg.subject}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{msg.content}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {new Date(msg.scheduled_for).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(msg.scheduled_for).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {msg.delivery_channels.map((ch) => (
                            <span key={ch} className="text-[11px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full capitalize">
                              {ch.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${getStatusBadge(msg.status)}`}>
                          {msg.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {msg.status === 'scheduled' && (
                          <div className="relative inline-block">
                            <button
                              onClick={() => setActionMenuId(actionMenuId === msg.id ? null : msg.id)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {actionMenuId === msg.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                                <div className="absolute right-0 z-20 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                                  <button
                                    onClick={() => handleCancel(msg.id)}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-lg"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    Cancel
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {msg.status === 'sent' && msg.sent_at && (
                          <span className="text-xs text-gray-400">
                            Sent {new Date(msg.sent_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Schedule Automated Message</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message Type</label>
                <select
                  value={form.message_type}
                  onChange={(e) => setForm((p) => ({ ...p, message_type: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  {MESSAGE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Patient (optional, leave empty for all patients)
                </label>
                <select
                  value={form.target_patient_id}
                  onChange={(e) => setForm((p) => ({ ...p, target_patient_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All patients</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject (optional)</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="Message subject"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  placeholder="Write the message content..."
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Scheduled For</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_for}
                  onChange={(e) => setForm((p) => ({ ...p, scheduled_for: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Delivery Channels</label>
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_CHANNELS.map((ch) => (
                    <button
                      key={ch.value}
                      onClick={() => toggleChannel(ch.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                        form.delivery_channels.includes(ch.value)
                          ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.content.trim() || !form.scheduled_for || saving}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                {saving ? 'Scheduling...' : 'Schedule Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
