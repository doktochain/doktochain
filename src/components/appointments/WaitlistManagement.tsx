import { useState, useEffect } from 'react';
import { WaitlistEntry, enhancedAppointmentService } from '../../services/enhancedAppointmentService';
import { Users, Calendar, Clock, Star, Bell, X } from 'lucide-react';

interface WaitlistManagementProps {
  providerId: string;
}

export default function WaitlistManagement({ providerId }: WaitlistManagementProps) {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high-priority'>('all');

  useEffect(() => {
    loadWaitlist();
  }, [providerId]);

  const loadWaitlist = async () => {
    try {
      setLoading(true);
      const data = await enhancedAppointmentService.getWaitlist(providerId);
      setWaitlist(data);
    } catch (error) {
      console.error('Failed to load waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWaitlist = waitlist.filter(entry => {
    if (filter === 'high-priority') {
      return entry.priority_score >= 50;
    }
    return true;
  });

  const getPriorityBadge = (score: number) => {
    if (score >= 75) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded text-xs font-semibold">High Priority</span>;
    } else if (score >= 50) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded text-xs font-semibold">Medium Priority</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded text-xs font-semibold">Normal</span>;
  };

  const getTimeOfDayLabel = (timeOfDay?: string) => {
    const labels: { [key: string]: string } = {
      morning: 'Morning (8AM-12PM)',
      afternoon: 'Afternoon (12PM-5PM)',
      evening: 'Evening (5PM-8PM)',
      any: 'Any Time',
    };
    return labels[timeOfDay || 'any'] || 'Any Time';
  };

  const notifyPatient = async (entryId: string) => {
    console.log('Notifying patient for waitlist entry:', entryId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading waitlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Waitlist Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {waitlist.length} patient{waitlist.length !== 1 ? 's' : ''} waiting for appointments
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('high-priority')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'high-priority'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            High Priority
          </button>
        </div>
      </div>

      {filteredWaitlist.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No patients in waitlist
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'high-priority'
              ? 'No high-priority waitlist entries at this time'
              : 'Your waitlist is currently empty'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredWaitlist.map(entry => (
            <div
              key={entry.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {((entry as any).patients?.user_profiles?.full_name || 'U')[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {(entry as any).patients?.user_profiles?.full_name || 'Unknown Patient'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Added {new Date((entry as any).created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {getPriorityBadge(entry.priority_score)}
              </div>

              <div className="space-y-3 mb-4">
                {entry.preferred_date_start && entry.preferred_date_end && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      {new Date(entry.preferred_date_start).toLocaleDateString()} -{' '}
                      {new Date(entry.preferred_date_end).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {entry.preferred_time_of_day && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{getTimeOfDayLabel(entry.preferred_time_of_day)}</span>
                  </div>
                )}

                {entry.preferred_days && entry.preferred_days.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {entry.preferred_days.map(day => (
                        <span key={day} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                          {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {entry.priority_score >= 50 && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                    <Star className="w-4 h-4" />
                    <span className="font-medium">Priority Score: {entry.priority_score}</span>
                  </div>
                )}
              </div>

              {entry.reason_for_visit && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Reason:</span> {entry.reason_for_visit}
                  </p>
                </div>
              )}

              {entry.notes && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Notes:</span> {entry.notes}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => notifyPatient(entry.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Bell className="w-4 h-4" />
                  Notify
                </button>
                <button className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm">
                  Match to Slot
                </button>
                <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
