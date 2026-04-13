import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Clock, Plus, X, CalendarOff, Save } from 'lucide-react';
import { providerProfileService, type TimeBlock } from '../../services/providerProfileService';

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
  const [timeBlocks, setTimeBlocks] = useState<any[]>([]);
  const [unavailability, setUnavailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');

  const [newBlock, setNewBlock] = useState<TimeBlock>({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    block_type: 'available',
    appointment_type: 'both',
  });

  const [newUnavailability, setNewUnavailability] = useState({
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
      const [blocks, unavail] = await Promise.all([
        providerProfileService.getTimeBlocks(providerId),
        providerProfileService.getUnavailability(providerId),
      ]);
      setTimeBlocks(blocks);
      setUnavailability(unavail);
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlock = async () => {
    try {
      await providerProfileService.addTimeBlock(providerId, newBlock);
      setNewBlock({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        block_type: 'available',
        appointment_type: 'both',
      });
      await loadData();
    } catch (error: any) {
      console.error('Error adding time block:', error);
      toast.error(`Failed to add time block: ${error.message}`);
    }
  };

  const handleRemoveBlock = async (blockId: string) => {
    try {
      await providerProfileService.deleteTimeBlock(blockId);
      loadData();
    } catch (error) {
      console.error('Error removing time block:', error);
    }
  };

  const handleAddUnavailability = async () => {
    if (!newUnavailability.start_date || !newUnavailability.end_date) {
      toast.error('Please select both start and end dates');
      return;
    }

    try {
      await providerProfileService.addUnavailability(providerId, newUnavailability);
      setNewUnavailability({
        start_date: '',
        end_date: '',
        reason: '',
        is_recurring: false,
      });
      await loadData();
    } catch (error: any) {
      console.error('Error adding unavailability:', error);
      toast.error(`Failed to add time off: ${error.message}`);
    }
  };

  const handleRemoveUnavailability = async (id: string) => {
    try {
      await providerProfileService.deleteUnavailability(id);
      loadData();
    } catch (error) {
      console.error('Error removing unavailability:', error);
    }
  };

  const handleQuickSetup = (preset: 'weekdays' | 'allDays' | 'custom') => {
    const blocks: TimeBlock[] = [];

    if (preset === 'weekdays') {
      for (let day = 1; day <= 5; day++) {
        blocks.push({
          day_of_week: day,
          start_time: '09:00',
          end_time: '17:00',
          block_type: 'available',
          appointment_type: 'both',
        });
        blocks.push({
          day_of_week: day,
          start_time: '12:00',
          end_time: '13:00',
          block_type: 'break',
          appointment_type: 'both',
        });
      }
    } else if (preset === 'allDays') {
      for (let day = 0; day <= 6; day++) {
        blocks.push({
          day_of_week: day,
          start_time: '08:00',
          end_time: '18:00',
          block_type: 'available',
          appointment_type: 'both',
        });
      }
    }

    blocks.forEach((block) => {
      providerProfileService.addTimeBlock(providerId, block);
    });

    setTimeout(() => loadData(), 1000);
  };

  const groupedBlocks = DAYS_OF_WEEK.map((day) => ({
    ...day,
    blocks: timeBlocks.filter((b) => b.day_of_week === day.id).sort((a, b) => a.start_time.localeCompare(b.start_time)),
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
          onClick={() => handleQuickSetup('weekdays')}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition"
        >
          Quick Setup: Weekdays 9-5
        </button>
      </div>

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
                        day.blocks.map((block) => (
                          <div
                            key={block.id}
                            className={`p-2 rounded text-xs ${
                              block.block_type === 'available'
                                ? 'bg-green-50 border border-green-200'
                                : block.block_type === 'break'
                                ? 'bg-yellow-50 border border-yellow-200'
                                : 'bg-gray-50 border border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {block.start_time?.substring(0, 5)} - {block.end_time?.substring(0, 5)}
                                </div>
                                <div className="text-gray-500 capitalize">
                                  {block.block_type}
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
                        <option key={time} value={time}>
                          {time}
                        </option>
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
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={newBlock.block_type}
                      onChange={(e) => setNewBlock({ ...newBlock, block_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="available">Available</option>
                      <option value="break">Break</option>
                      <option value="administrative">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visit Type
                    </label>
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
                      className="w-full px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 flex items-center justify-center gap-2 font-medium transition"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'unavailable' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Scheduled Time Off</h3>
                <div className="space-y-3">
                  {unavailability.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No scheduled time off</p>
                  ) : (
                    unavailability.map((unavail) => (
                      <div
                        key={unavail.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {new Date(unavail.start_date + 'T00:00:00').toLocaleDateString()} -{' '}
                            {new Date(unavail.end_date + 'T00:00:00').toLocaleDateString()}
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
                          onClick={() => handleRemoveUnavailability(unavail.id)}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newUnavailability.start_date}
                      onChange={(e) =>
                        setNewUnavailability({ ...newUnavailability, start_date: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={newUnavailability.end_date}
                      onChange={(e) =>
                        setNewUnavailability({ ...newUnavailability, end_date: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason (Optional)
                    </label>
                    <input
                      type="text"
                      value={newUnavailability.reason}
                      onChange={(e) =>
                        setNewUnavailability({ ...newUnavailability, reason: e.target.value })
                      }
                      placeholder="e.g., Conference, Vacation, Holiday"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newUnavailability.is_recurring}
                        onChange={(e) =>
                          setNewUnavailability({ ...newUnavailability, is_recurring: e.target.checked })
                        }
                        className="h-4 w-4 accent-sky-600 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Recurring annually</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleAddUnavailability}
                  className="mt-4 px-5 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 flex items-center gap-2 font-medium transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Time Off
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
