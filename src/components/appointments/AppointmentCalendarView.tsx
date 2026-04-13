import { useState } from 'react';
import { Appointment } from '../../services/appointmentService';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface AppointmentCalendarViewProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onDateClick?: (date: Date) => void;
  view: 'day' | 'week' | 'month';
}

export default function AppointmentCalendarView({
  appointments,
  onAppointmentClick,
  onDateClick,
  view,
}: AppointmentCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());

    const days: Date[] = [];
    const current = new Date(startDate);

    while (days.length < 42) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.appointment_date === dateStr);
  };

  const getAppointmentColor = (appointment: Appointment) => {
    const colors = {
      scheduled: 'bg-gray-500',
      confirmed: 'bg-green-500',
      'in-progress': 'bg-yellow-500',
      completed: 'bg-blue-500',
      cancelled: 'bg-red-500',
      'no-show': 'bg-orange-500',
    };
    return colors[appointment.status] || 'bg-gray-500';
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          {hours.map(hour => {
            const hourStr = hour.toString().padStart(2, '0');
            const hourAppointments = dayAppointments.filter(apt =>
              apt.start_time.startsWith(hourStr)
            );

            return (
              <div key={hour} className="flex border-b border-gray-200 dark:border-gray-700">
                <div className="w-20 flex-shrink-0 p-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                <div className="flex-1 p-2 min-h-[60px] relative">
                  {hourAppointments.map(apt => (
                    <div
                      key={apt.id}
                      onClick={() => onAppointmentClick(apt)}
                      className={`mb-1 p-2 rounded cursor-pointer ${getAppointmentColor(apt)} bg-opacity-80 text-white text-sm hover:bg-opacity-100 transition-all`}
                    >
                      <div className="font-semibold">
                        {formatTime(apt.start_time)} - {(apt as any).patients?.user_profiles?.full_name || 'Unknown'}
                      </div>
                      <div className="text-xs opacity-90">
                        {apt.reason_for_visit || apt.chief_complaint}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <div className="w-20 flex-shrink-0" />
            {weekDays.map(day => (
              <div
                key={day.toISOString()}
                className="flex-1 p-2 text-center border-l border-gray-200 dark:border-gray-700"
              >
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-semibold ${
                  day.toDateString() === new Date().toDateString()
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>
          {hours.map(hour => (
            <div key={hour} className="flex border-b border-gray-200 dark:border-gray-700">
              <div className="w-20 flex-shrink-0 p-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              {weekDays.map(day => {
                const dayAppointments = getAppointmentsForDate(day);
                const hourStr = hour.toString().padStart(2, '0');
                const hourAppointments = dayAppointments.filter(apt =>
                  apt.start_time.startsWith(hourStr)
                );

                return (
                  <div
                    key={day.toISOString()}
                    className="flex-1 p-1 border-l border-gray-200 dark:border-gray-700 min-h-[60px]"
                  >
                    {hourAppointments.map(apt => (
                      <div
                        key={apt.id}
                        onClick={() => onAppointmentClick(apt)}
                        className={`mb-1 p-1 rounded cursor-pointer ${getAppointmentColor(apt)} bg-opacity-80 text-white text-xs hover:bg-opacity-100 transition-all truncate`}
                        title={(apt as any).patients?.user_profiles?.full_name}
                      >
                        {formatTime(apt.start_time)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDays = getMonthDays();
    const weeks = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      weeks.push(monthDays.slice(i, i + 7));
    }

    return (
      <div className="flex-1">
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-50 dark:bg-gray-800 p-2 text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
              {day}
            </div>
          ))}
          {monthDays.map(day => {
            const dayAppointments = getAppointmentsForDate(day);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div
                key={day.toISOString()}
                onClick={() => onDateClick?.(day)}
                className={`bg-white dark:bg-gray-800 p-2 min-h-[100px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  !isCurrentMonth ? 'opacity-50' : ''
                }`}
              >
                <div className={`text-sm font-semibold mb-1 ${
                  isToday
                    ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map(apt => (
                    <div
                      key={apt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick(apt);
                      }}
                      className={`text-xs p-1 rounded ${getAppointmentColor(apt)} bg-opacity-80 text-white truncate hover:bg-opacity-100`}
                      title={`${formatTime(apt.start_time)} - ${(apt as any).patients?.user_profiles?.full_name}`}
                    >
                      {formatTime(apt.start_time)}
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      +{dayAppointments.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getHeaderTitle = () => {
    if (view === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } else if (view === 'week') {
      const weekDays = getWeekDays();
      return `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {getHeaderTitle()}
          </h2>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('prev')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('next')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {view === 'day' && renderDayView()}
      {view === 'week' && renderWeekView()}
      {view === 'month' && renderMonthView()}
    </div>
  );
}
