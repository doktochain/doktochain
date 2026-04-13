import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, X, Check } from 'lucide-react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { clinicService, Clinic, ClinicAffiliation, ClinicScheduleEntry } from '../../../../../services/clinicService';
import { supabase } from '../../../../../lib/supabase';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const min = i % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${min}`;
});

export default function ClinicAvailabilityPage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [affiliations, setAffiliations] = useState<ClinicAffiliation[]>([]);
  const [schedules, setSchedules] = useState<ClinicScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'week'>('grid');
  const [newSlot, setNewSlot] = useState({
    provider_id: '',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 30,
  });

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const c = await clinicService.getClinicByOwnerId(user!.id);
      setClinic(c);
      if (c) {
        const [affs, sched] = await Promise.all([
          clinicService.getClinicAffiliations(c.id),
          clinicService.getClinicProviderSchedules(c.id),
        ]);
        const active = affs.filter(a => a.status === 'active');
        setAffiliations(active);
        setSchedules(sched);
        if (active.length > 0 && !selectedProvider) {
          setSelectedProvider(active[0].provider_id);
          setNewSlot(prev => ({ ...prev, provider_id: active[0].provider_id }));
        }
      }
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    if (!newSlot.provider_id) return;
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const { error } = await supabase
        .from('provider_schedules')
        .insert({
          provider_id: newSlot.provider_id,
          day_of_week: newSlot.day_of_week,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          slot_duration_minutes: newSlot.slot_duration_minutes,
          is_available: true,
        });
      if (error) throw error;
      setMessage({ text: 'Schedule slot added successfully.', type: 'success' });
      setShowAddModal(false);
      await loadData();
    } catch (error: any) {
      setMessage({ text: error.message || 'Failed to add schedule slot.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSlot = async (slotId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('provider_schedules')
        .update({ is_available: !currentState })
        .eq('id', slotId);
      if (error) throw error;
      setSchedules(prev => prev.map(s => s.id === slotId ? { ...s, is_available: !currentState } : s));
    } catch (error) {
      console.error('Error toggling slot:', error);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const { error } = await supabase
        .from('provider_schedules')
        .update({ is_available: false })
        .eq('id', slotId);
      if (error) throw error;
      setSchedules(prev => prev.map(s => s.id === slotId ? { ...s, is_available: false } : s));
      setMessage({ text: 'Slot disabled.', type: 'success' });
    } catch (error) {
      console.error('Error removing slot:', error);
    }
  };

  const providerSchedules = selectedProvider
    ? schedules.filter(s => s.provider_id === selectedProvider)
    : schedules;

  const providerLabel = (providerId: string) => {
    const aff = affiliations.find(a => a.provider_id === providerId);
    return aff?.providers?.user_profiles
      ? `Dr. ${aff.providers.user_profiles.first_name} ${aff.providers.user_profiles.last_name}`
      : 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Clinic Found</h2>
          <p className="text-gray-500">Your clinic hasn't been set up yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Set Availability</h1>
          <p className="text-gray-500 mt-1">Configure appointment availability for your providers</p>
        </div>
        <button
          onClick={() => {
            setNewSlot(prev => ({ ...prev, provider_id: selectedProvider || (affiliations[0]?.provider_id ?? '') }));
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          <Plus size={18} /> Add Time Slot
        </button>
      </div>

      {message.text && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 flex-1 min-w-[200px]"
          >
            <option value="">All Providers</option>
            {affiliations.map(aff => (
              <option key={aff.provider_id} value={aff.provider_id}>
                Dr. {aff.providers?.user_profiles?.first_name} {aff.providers?.user_profiles?.last_name} - {aff.providers?.specialty}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DAYS.map((day, idx) => {
            const daySlots = providerSchedules.filter(s => s.day_of_week === idx);
            return (
              <div key={day} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">{day}</h3>
                    <span className="text-xs text-gray-500">{daySlots.length} slots</span>
                  </div>
                </div>
                <div className="p-3 space-y-2 min-h-[120px]">
                  {daySlots.length === 0 ? (
                    <div className="text-center py-6">
                      <Clock size={20} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-xs text-gray-400">No slots configured</p>
                    </div>
                  ) : (
                    daySlots.map(slot => (
                      <div
                        key={slot.id}
                        className={`p-3 rounded-lg border transition ${slot.is_available ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-800">
                            {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleSlot(slot.id, slot.is_available)}
                              className={`p-1 rounded transition ${slot.is_available ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'}`}
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="p-1 rounded text-red-400 hover:bg-red-50 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {!selectedProvider && (
                          <p className="text-xs text-gray-500">{providerLabel(slot.provider_id)}</p>
                        )}
                        <p className="text-xs text-gray-400">{slot.slot_duration_minutes}min per slot</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-32">Time</th>
                  {DAYS.map(day => (
                    <th key={day} className="text-center px-2 py-3 text-xs font-semibold text-gray-500 uppercase">{day.slice(0, 3)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map(time => (
                  <tr key={time} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2 text-xs font-mono text-gray-500">{time}</td>
                    {DAYS.map((_, dayIdx) => {
                      const slot = providerSchedules.find(
                        s => s.day_of_week === dayIdx && s.start_time?.slice(0, 5) <= time && s.end_time?.slice(0, 5) > time && s.is_available
                      );
                      return (
                        <td key={dayIdx} className="px-2 py-2 text-center">
                          {slot ? (
                            <div className="bg-green-100 text-green-700 text-[10px] font-medium rounded px-1 py-0.5 truncate">
                              {!selectedProvider ? providerLabel(slot.provider_id).replace('Dr. ', '') : 'Available'}
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">Add Time Slot</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <select
                  value={newSlot.provider_id}
                  onChange={(e) => setNewSlot(prev => ({ ...prev, provider_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Provider</option>
                  {affiliations.map(aff => (
                    <option key={aff.provider_id} value={aff.provider_id}>
                      Dr. {aff.providers?.user_profiles?.first_name} {aff.providers?.user_profiles?.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                <select
                  value={newSlot.day_of_week}
                  onChange={(e) => setNewSlot(prev => ({ ...prev, day_of_week: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {DAYS.map((day, idx) => (
                    <option key={idx} value={idx}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newSlot.start_time}
                    onChange={(e) => setNewSlot(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newSlot.end_time}
                    onChange={(e) => setNewSlot(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slot Duration (minutes)</label>
                <select
                  value={newSlot.slot_duration_minutes}
                  onChange={(e) => setNewSlot(prev => ({ ...prev, slot_duration_minutes: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSlot}
                disabled={saving || !newSlot.provider_id}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
