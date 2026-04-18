import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Clock, Plus, X, CalendarOff, MapPin } from 'lucide-react';
import { providerService, ProviderLocation, ProviderSchedule } from '../../services/providerService';
import { api } from '../../lib/api-client';

interface AvailabilityManagerProps {
  providerId: string;
}

const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday' },
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
];

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

export default function AvailabilityManager({ providerId }: AvailabilityManagerProps) {
  const [schedules, setSchedules] = useState<ProviderSchedule[]>([]);
  const [locations, setLocations] = useState<ProviderLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');

  const [newBlock, setNewBlock] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 30,
    appointment_type: 'both' as 'both' | 'in-person' | 'virtual',
  });

  const [newOverride, setNewOverride] = useState({
    start_date: '',
    end_date: '',
    reason: '',
    is_recurring: false,
  });

  useEffect(() => {
    loadData();
  }, [providerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locs, sched] = await Promise.all([
        providerService.getLocations(providerId).catch(() => []),
        providerService.getSchedule(providerId).catch(() => []),
      ]);

      setLocations(locs);
      setSchedules(sched);

      if (locs.length > 0 && !selectedLocation) {
        setSelectedLocation(locs[0].id);
      }

      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: overridesData } = await api.get<any[]>('/provider-unavailability', {
          params: {
            provider_id: providerId,
            end_date_gte: today,
            order: 'start_date:asc',
          },
        });
        setOverrides(overridesData || []);
      } catch {
        setOverrides([]);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlock = async () => {
    if (!selectedLocation) {
      toast.error('Please add and select a practice location first');
      return;
    }
    if (newBlock.end_time <= newBlock.start_time) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      await providerService.addSchedule({
        provider_id: providerId,
        location_id: selectedLocation,
        day_of_week: newBlock.day_of_week,
        start_time: newBlock.start_time,
        end_time: newBlock.end_time,
        slot_duration_minutes: newBlock.slot_duration_minutes,
        appointment_type: newBlock.appointment_type,
        is_available: true,
      } as any);
      setNewBlock({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_minutes: 30,
        appointment_type: 'both',
      });
      toast.success('Time slot added');
      await loadData();
    } catch (error: any) {
      console.error('Error adding time block:', error);
      toast.error(`Failed to add time slot: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRemoveBlock = async (blockId: string) => {
    try {
      await providerService.deleteSchedule(blockId);
      toast.success('Time slot removed');
      loadData();
    } catch (error: any) {
      console.error('Error removing time block:', error);
      toast.error(error?.message || 'Failed to remove time slot');
    }
  };

  const handleAddOverride = async () => {
    if (!newOverride.start_date || !newOverride.end_date) {
      toast.error('Please select both start and end dates');
      return;
    }

    try {
      const { error } = await api.post('/provider-unavailability', {
        provider_id: providerId,
        start_date: newOverride.start_date,
        end_date: newOverride.end_date,
        reason: newOverride.reason || 'Unavailable',
        is_recurring: newOverride.is_recurring,
        recurrence_pattern: { is_available: false },
      });
      if (error) throw error;

      setNewOverride({
        start_date: '',
        end_date: '',
        reason: '',
        is_recurring: false,
      });
      toast.success('Time off added');
      await loadData();
    } catch (error: any) {
      console.error('Error adding time off:', error);
      toast.error(`Failed to add time off: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRemoveOverride = async (id: string) => {
    try {
      const { error } = await api.delete(`/provider-unavailability/${id}`);
      if (error) throw error;
      toast.success('Time off removed');
      loadData();
    } catch (error: any) {
      console.error('Error removing time off:', error);
      toast.error(error?.message || 'Failed to remove time off');
    }
  };

  const handleQuickSetup = async () => {
    if (!selectedLocation) {
      toast.error('Please add and select a practice location first');
      return;
    }
    try {
      for (let day = 1; day <= 5; day++) {
        await providerService.addSchedule({
          provider_id: providerId,
          location_id: selectedLocation,
          day_of_week: day,
          start_time: '09:00',
          end_time: '17:00',
          slot_duration_minutes: 30,
          appointment_type: 'both',
          is_available: true,
        } as any);
      }
      toast.success('Weekdays 9-5 applied');
      loadData();
    } catch (error: any) {
      console.error('Error in quick setup:', error);
      toast.error(error?.message || 'Failed to apply quick setup');
    }
  };

  const groupedBlocks = DAYS_OF_WEEK.map((day) => ({
    ...day,
    blocks: schedules
      .filter((b) => b.day_of_week === day.id && (!selectedLocation || b.location_id === selectedLocation))
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Availability & Schedule</h2>
        <button
          onClick={handleQuickSetup}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition"
        >
          Quick Setup: Weekdays 9-5
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <MapPin className="w-8 h-8 mx-auto text-amber-600 mb-2" />
          <p className="text-amber-800 font-medium">No practice locations yet</p>
          <p className="text-sm text-amber-700 mt-1">
            Add a clinic location under Profile & Settings → Clinic Locations before setting your schedule.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
          <MapPin className="w-4 h-4 text-sky-600" />
          <label className="text-sm font-medium text-gray-700">Location:</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.location_name} {loc.is_primary ? '(Primary)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-6 py-4 text-sm font-medium flex items-center gap-2 transition relative ${
                activeTab === 'schedule'
                  ? 'text-sky-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              Weekly Schedule
              {activeTab === 'schedule' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('unavailable')}
              className={`px-6 py-4 text-sm font-medium flex items-center gap-2 transition relative ${
                activeTab === 'unavailable'
                  ? 'text-sky-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CalendarOff className="w-4 h-4" />
              Time Off
              {activeTab === 'unavailable' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
              )}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {groupedBlocks.map((day) => (
                  <div key={day.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">{day.name}</h3>
                    <div className="space-y-2">
                      {day.blocks.length === 0 ? (
                        <p className="text-xs text-gray-400">Unavailable</p>
                      ) : (
                        day.blocks.map((block: any) => (
                          <div
                            key={block.id}
                            className="p-2 rounded text-xs bg-green-50 border border-green-200"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {block.start_time?.substring(0, 5)} - {block.end_time?.substring(0, 5)}
                                </div>
                                <div className="text-gray-500">
                                  {block.slot_duration_minutes}m slots
                                  {block.appointment_type && block.appointment_type !== 'both' && (
                                    <span className="ml-1">• {block.appointment_type}</span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveBlock(block.id)}
                                className="text-gray-400 hover:text-red-600 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Time Block</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                    <select
                      value={newBlock.day_of_week}
                      onChange={(e) => setNewBlock({ ...newBlock, day_of_week: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {DAYS_OF_WEEK.map((day) => (
                        <option key={day.id} value={day.id}>
                          {day.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start</label>
                    <select
                      value={newBlock.start_time}
                      onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {TIME_SLOTS.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End</label>
                    <select
                      value={newBlock.end_time}
                      onChange={(e) => setNewBlock({ ...newBlock, end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {TIME_SLOTS.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Slot</label>
                    <select
                      value={newBlock.slot_duration_minutes}
                      onChange={(e) => setNewBlock({ ...newBlock, slot_duration_minutes: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value={15}>15m</option>
                      <option value={20}>20m</option>
                      <option value={30}>30m</option>
                      <option value={45}>45m</option>
                      <option value={60}>60m</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Visit Type</label>
                    <select
                      value={newBlock.appointment_type}
                      onChange={(e) => setNewBlock({ ...newBlock, appointment_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="both">Both</option>
                      <option value="in-person">In-Person</option>
                      <option value="virtual">Virtual</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleAddBlock}
                      disabled={!selectedLocation}
                      className="w-full px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 flex items-center justify-center gap-2 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  These time blocks are shared with the <span className="font-medium">Schedule</span> menu — changes are reflected in both views.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'unavailable' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Scheduled Time Off</h3>
                <div className="space-y-3">
                  {overrides.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No scheduled time off</p>
                  ) : (
                    overrides.map((unavail) => (
                      <div
                        key={unavail.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {new Date((unavail.start_date || '').slice(0, 10) + 'T00:00:00').toLocaleDateString()} -{' '}
                            {new Date((unavail.end_date || '').slice(0, 10) + 'T00:00:00').toLocaleDateString()}
                          </div>
                          {unavail.reason && (
                            <p className="text-sm text-gray-500 mt-1">{unavail.reason}</p>
                          )}
                          {unavail.is_recurring && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-sky-100 text-sky-700 text-xs rounded-full font-medium">
                              Recurring
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveOverride(unavail.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Time Off</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={newOverride.start_date}
                      onChange={(e) => setNewOverride({ ...newOverride, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={newOverride.end_date}
                      onChange={(e) => setNewOverride({ ...newOverride, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason (Optional)</label>
                    <input
                      type="text"
                      value={newOverride.reason}
                      onChange={(e) => setNewOverride({ ...newOverride, reason: e.target.value })}
                      placeholder="e.g., Conference, Vacation, Holiday"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newOverride.is_recurring}
                        onChange={(e) => setNewOverride({ ...newOverride, is_recurring: e.target.checked })}
                        className="h-4 w-4 accent-sky-600 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Recurring annually</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleAddOverride}
                  className="mt-4 px-5 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 flex items-center gap-2 font-medium transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Time Off
                </button>
                <p className="text-xs text-gray-500 mt-3">
                  Time off is shared with the <span className="font-medium">Schedule → Date Overrides</span> tab.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
