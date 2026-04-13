import { useEffect, useState } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { Appointment } from '../../../../../services/appointmentService';
import { enhancedAppointmentService } from '../../../../../services/enhancedAppointmentService';
import { providerService } from '../../../../../services/providerService';
import { Clock, User, Video, CheckCircle, AlertCircle, MapPin, Calendar } from 'lucide-react';

export default function AppointmentQueue() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<any>(null);
  const [queueAppointments, setQueueAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviderData();
  }, [user]);

  useEffect(() => {
    if (provider) {
      loadQueue();
      const interval = setInterval(loadQueue, 30000);
      return () => clearInterval(interval);
    }
  }, [provider]);

  const loadProviderData = async () => {
    if (!user) return;

    try {
      const providerData = await providerService.getProviderByUserId(user.id);
      setProvider(providerData);
    } catch (error) {
      console.error('Error loading provider:', error);
    }
  };

  const loadQueue = async () => {
    if (!provider) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const data = await enhancedAppointmentService.getAppointments(provider.id, {
        dateRange: { start: today, end: today },
        status: ['scheduled', 'confirmed', 'in-progress'],
      });

      const sortedData = data.sort((a, b) => {
        if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
        if (a.status !== 'in-progress' && b.status === 'in-progress') return 1;
        return a.start_time.localeCompare(b.start_time);
      });

      setQueueAppointments(sortedData);
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (appointmentId: string, examRoom?: string) => {
    try {
      await enhancedAppointmentService.checkInPatient(appointmentId, examRoom);
      await loadQueue();
    } catch (error) {
      console.error('Error checking in patient:', error);
    }
  };

  const handleStartConsultation = async (appointment: Appointment) => {
    try {
      await enhancedAppointmentService.updateAppointmentStatus(appointment.id, 'in-progress');
      await loadQueue();
    } catch (error) {
      console.error('Error starting consultation:', error);
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      await enhancedAppointmentService.checkOutPatient(appointmentId);
      await loadQueue();
    } catch (error) {
      console.error('Error completing appointment:', error);
    }
  };

  const getStatusBadge = (status: Appointment['status']) => {
    const styles = {
      scheduled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[status as keyof typeof styles] || styles.scheduled}`}>
        {status.replace('-', ' ').toUpperCase()}
      </span>
    );
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getCurrentAppointments = () => {
    return queueAppointments.filter(apt => apt.status === 'in-progress');
  };

  const getWaitingAppointments = () => {
    return queueAppointments.filter(apt => apt.status === 'confirmed');
  };

  const getScheduledAppointments = () => {
    return queueAppointments.filter(apt => apt.status === 'scheduled');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Appointment Queue
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Today's appointments - {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {getCurrentAppointments().length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Waiting</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {getWaitingAppointments().length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Scheduled</div>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {getScheduledAppointments().length}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 p-4">
            <h2 className="text-lg font-bold text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              In Progress ({getCurrentAppointments().length})
            </h2>
          </div>
          <div className="p-4 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
            {getCurrentAppointments().length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No appointments in progress
              </div>
            ) : (
              getCurrentAppointments().map(appointment => (
                <div
                  key={appointment.id}
                  className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {((appointment as any).patients?.user_profiles?.full_name || 'U')[0]}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {(appointment as any).patients?.user_profiles?.full_name || 'Unknown Patient'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
                        </div>
                      </div>
                    </div>
                    {appointment.appointment_type === 'virtual' ? (
                      <Video className="w-5 h-5 text-blue-500" />
                    ) : (
                      <User className="w-5 h-5 text-green-500" />
                    )}
                  </div>

                  {(appointment as any).exam_room && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>Room: {(appointment as any).exam_room}</span>
                    </div>
                  )}

                  {appointment.reason_for_visit && (
                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 p-2 bg-white dark:bg-gray-700 rounded">
                      {appointment.reason_for_visit}
                    </div>
                  )}

                  <button
                    onClick={() => handleCompleteAppointment(appointment.id)}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Complete Visit
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 p-4">
            <h2 className="text-lg font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Waiting Room ({getWaitingAppointments().length})
            </h2>
          </div>
          <div className="p-4 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
            {getWaitingAppointments().length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No patients waiting
              </div>
            ) : (
              getWaitingAppointments().map(appointment => (
                <div
                  key={appointment.id}
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {((appointment as any).patients?.user_profiles?.full_name || 'U')[0]}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {(appointment as any).patients?.user_profiles?.full_name || 'Unknown Patient'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(appointment.start_time)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {appointment.reason_for_visit && (
                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      {appointment.reason_for_visit}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {appointment.appointment_type === 'in-person' ? (
                      <button
                        onClick={() => handleCheckIn(appointment.id)}
                        className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
                      >
                        Check In
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartConsultation(appointment)}
                        className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
                      >
                        Start Video
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Scheduled ({getScheduledAppointments().length})
            </h2>
          </div>
          <div className="p-4 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
            {getScheduledAppointments().length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No scheduled appointments
              </div>
            ) : (
              getScheduledAppointments().map(appointment => (
                <div
                  key={appointment.id}
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                        {((appointment as any).patients?.user_profiles?.full_name || 'U')[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {(appointment as any).patients?.user_profiles?.full_name || 'Unknown Patient'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(appointment.start_time)}</span>
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>

                  {appointment.reason_for_visit && (
                    <div className="text-sm text-gray-700 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      {appointment.reason_for_visit}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
