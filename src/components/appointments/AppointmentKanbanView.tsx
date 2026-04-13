import { Appointment } from '../../services/appointmentService';
import { Calendar, Clock, User, Video } from 'lucide-react';

interface AppointmentKanbanViewProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onStatusChange: (appointmentId: string, newStatus: Appointment['status']) => void;
}

const COLUMNS: { status: Appointment['status']; title: string; color: string }[] = [
  { status: 'scheduled', title: 'Scheduled', color: 'bg-gray-500' },
  { status: 'confirmed', title: 'Confirmed', color: 'bg-green-500' },
  { status: 'in-progress', title: 'In Progress', color: 'bg-yellow-500' },
  { status: 'completed', title: 'Completed', color: 'bg-blue-500' },
  { status: 'cancelled', title: 'Cancelled', color: 'bg-red-500' },
];

export default function AppointmentKanbanView({
  appointments,
  onAppointmentClick,
  onStatusChange,
}: AppointmentKanbanViewProps) {
  const getAppointmentsByStatus = (status: Appointment['status']) => {
    return appointments.filter(apt => apt.status === status);
  };

  const handleDragStart = (e: React.DragEvent, appointmentId: string) => {
    e.dataTransfer.setData('appointmentId', appointmentId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: Appointment['status']) => {
    e.preventDefault();
    const appointmentId = e.dataTransfer.getData('appointmentId');
    if (appointmentId) {
      onStatusChange(appointmentId, newStatus);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto p-4">
      {COLUMNS.map(column => {
        const columnAppointments = getAppointmentsByStatus(column.status);

        return (
          <div
            key={column.status}
            className="flex-shrink-0 w-80 bg-gray-50 dark:bg-gray-900 rounded-lg"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${column.color}`} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {column.title}
                  </h3>
                </div>
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold px-2 py-1 rounded-full">
                  {columnAppointments.length}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
              {columnAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  No appointments
                </div>
              ) : (
                columnAppointments.map(appointment => (
                  <div
                    key={appointment.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, appointment.id)}
                    onClick={() => onAppointmentClick(appointment)}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-move hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {((appointment as any).patients?.user_profiles?.full_name || 'U')[0]}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {(appointment as any).patients?.user_profiles?.full_name || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {appointment.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                      {appointment.appointment_type === 'virtual' ? (
                        <Video className="w-4 h-4 text-blue-500" />
                      ) : (
                        <User className="w-4 h-4 text-green-500" />
                      )}
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                        </span>
                      </div>
                    </div>

                    {(appointment.reason_for_visit || appointment.chief_complaint) && (
                      <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 bg-gray-50 dark:bg-gray-700 rounded p-2">
                        {appointment.reason_for_visit || appointment.chief_complaint}
                      </div>
                    )}

                    {(appointment as any).exam_room && (
                      <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                        Room: {(appointment as any).exam_room}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
