import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { Clock, Save, CreditCard as Edit2, AlertCircle } from 'lucide-react';

interface DaySchedule {
  open_time: string;
  close_time: string;
  is_closed: boolean;
  is_24_hours: boolean;
}

type WeekSchedule = Record<string, DaySchedule>;

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const DEFAULT_SCHEDULE: WeekSchedule = {
  monday: { open_time: '09:00', close_time: '18:00', is_closed: false, is_24_hours: false },
  tuesday: { open_time: '09:00', close_time: '18:00', is_closed: false, is_24_hours: false },
  wednesday: { open_time: '09:00', close_time: '18:00', is_closed: false, is_24_hours: false },
  thursday: { open_time: '09:00', close_time: '18:00', is_closed: false, is_24_hours: false },
  friday: { open_time: '09:00', close_time: '18:00', is_closed: false, is_24_hours: false },
  saturday: { open_time: '10:00', close_time: '16:00', is_closed: false, is_24_hours: false },
  sunday: { open_time: '10:00', close_time: '14:00', is_closed: true, is_24_hours: false },
};

export default function PharmacyHours() {
  const { user } = useAuth();
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<WeekSchedule>(DEFAULT_SCHEDULE);
  const [editedHours, setEditedHours] = useState<WeekSchedule>(DEFAULT_SCHEDULE);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadPharmacy();
  }, [user]);

  const loadPharmacy = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setPharmacy(data);
        const storedHours = data.hours_of_operation;
        if (storedHours && typeof storedHours === 'object') {
          const merged: WeekSchedule = {};
          for (const day of DAYS) {
            merged[day] = {
              open_time: storedHours[day]?.open_time || DEFAULT_SCHEDULE[day].open_time,
              close_time: storedHours[day]?.close_time || DEFAULT_SCHEDULE[day].close_time,
              is_closed: storedHours[day]?.is_closed ?? DEFAULT_SCHEDULE[day].is_closed,
              is_24_hours: storedHours[day]?.is_24_hours ?? false,
            };
          }
          setHours(merged);
          setEditedHours(merged);
        }
      }
    } catch (error) {
      console.error('Error loading pharmacy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pharmacy) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pharmacies')
        .update({
          hours_of_operation: editedHours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pharmacy.id);

      if (error) throw error;

      setHours(editedHours);
      setEditing(false);
      setToast({ type: 'success', message: 'Operating hours saved successfully!' });
      setTimeout(() => setToast(null), 3000);
    } catch (error: any) {
      console.error('Error saving hours:', error);
      setToast({ type: 'error', message: `Failed to save hours: ${error.message}` });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const updateDaySchedule = (day: string, field: keyof DaySchedule, value: any) => {
    setEditedHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const applyToWeekdays = (sourceDay: string) => {
    const source = editedHours[sourceDay];
    setEditedHours((prev) => {
      const updated = { ...prev };
      for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
        updated[day] = { ...source };
      }
      return updated;
    });
  };

  const applyToAll = (sourceDay: string) => {
    const source = editedHours[sourceDay];
    setEditedHours((prev) => {
      const updated = { ...prev };
      for (const day of DAYS) {
        updated[day] = { ...source };
      }
      return updated;
    });
  };

  const formatTimeDisplay = (schedule: DaySchedule) => {
    if (schedule.is_closed) return 'Closed';
    if (schedule.is_24_hours) return 'Open 24 Hours';
    const formatTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
    };
    return `${formatTime(schedule.open_time)} - ${formatTime(schedule.close_time)}`;
  };

  const isToday = (day: string) => {
    const dayIndex = DAYS.indexOf(day);
    const today = new Date().getDay();
    const adjustedToday = today === 0 ? 6 : today - 1;
    return dayIndex === adjustedToday;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading hours...</p>
        </div>
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium">No pharmacy profile found.</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Operating Hours</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage business hours for {pharmacy.pharmacy_name}
          </p>
        </div>

        {!editing ? (
          <button
            onClick={() => {
              setEditedHours({ ...hours });
              setEditing(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit Hours
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditing(false);
                setEditedHours(hours);
              }}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {editing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => applyToWeekdays('monday')}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-700 transition"
                >
                  Apply Monday to all weekdays
                </button>
                <button
                  onClick={() => applyToAll('monday')}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-700 transition"
                >
                  Apply Monday to all days
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {DAYS.map((day) => {
            const schedule = editing ? editedHours[day] : hours[day];
            const today = isToday(day);
            return (
              <div
                key={day}
                className={`flex items-center justify-between p-4 sm:p-5 ${
                  today ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-[140px]">
                  <Clock className={`w-5 h-5 ${today ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div>
                    <span className={`text-sm font-medium ${
                      today ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {DAY_LABELS[day]}
                    </span>
                    {today && (
                      <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                        Today
                      </span>
                    )}
                  </div>
                </div>

                {editing ? (
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={schedule.is_closed}
                        onChange={(e) => {
                          updateDaySchedule(day, 'is_closed', e.target.checked);
                          if (e.target.checked) {
                            updateDaySchedule(day, 'is_24_hours', false);
                          }
                        }}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Closed</span>
                    </label>

                    {!schedule.is_closed && (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={schedule.is_24_hours}
                            onChange={(e) => updateDaySchedule(day, 'is_24_hours', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">24h</span>
                        </label>

                        {!schedule.is_24_hours && (
                          <>
                            <input
                              type="time"
                              value={schedule.open_time}
                              onChange={(e) => updateDaySchedule(day, 'open_time', e.target.value)}
                              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                            <span className="text-gray-500 text-sm">to</span>
                            <input
                              type="time"
                              value={schedule.close_time}
                              onChange={(e) => updateDaySchedule(day, 'close_time', e.target.value)}
                              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                          </>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-right">
                    <span className={`text-sm font-medium ${
                      schedule.is_closed
                        ? 'text-red-600 dark:text-red-400'
                        : schedule.is_24_hours
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {formatTimeDisplay(schedule)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!editing && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Open Days</p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-300 mt-1">
                {DAYS.filter((d) => !hours[d].is_closed).length}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">days per week</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Closed Days</p>
              <p className="text-2xl font-bold text-red-800 dark:text-red-300 mt-1">
                {DAYS.filter((d) => hours[d].is_closed).length}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">days per week</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">24-Hour Days</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-300 mt-1">
                {DAYS.filter((d) => hours[d].is_24_hours && !hours[d].is_closed).length}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">days per week</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
