import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { attendanceService, StaffAttendance } from '../../services/attendanceService';

interface AttendanceCalendarProps {
  userId?: string;
  month: number;
  year: number;
  onDateSelect?: (date: string) => void;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  userId,
  month,
  year,
  onDateSelect,
}) => {
  const [attendance, setAttendance] = useState<StaffAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    loadAttendance();
  }, [userId, month, year]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const data = await attendanceService.getAttendanceByDateRange(
        startDate,
        endDate,
        userId
      );
      setAttendance(data);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    return new Date(year, month - 1, 1).getDay();
  };

  const getAttendanceForDate = (day: number) => {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendance.find(a => a.date === date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'half_day':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'late':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'on_leave':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'holiday':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
      case 'late':
        return <CheckCircle className="w-3 h-3" />;
      case 'absent':
        return <XCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const handleDateClick = (day: number) => {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const daysInMonth = getDaysInMonth();
  const firstDay = getFirstDayOfMonth();
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-24" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const record = getAttendanceForDate(day);
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = selectedDate === date;
    const isToday = new Date().toISOString().split('T')[0] === date;

    days.push(
      <div
        key={day}
        onClick={() => handleDateClick(day)}
        className={`h-24 border rounded-lg p-2 cursor-pointer transition-all ${
          record ? getStatusColor(record.status) : 'bg-white border-gray-200 hover:border-gray-300'
        } ${isSelected ? 'ring-2 ring-blue-500' : ''} ${
          isToday ? 'ring-1 ring-blue-400' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
            {day}
          </span>
          {record && getStatusIcon(record.status)}
        </div>

        {record && (
          <div className="text-xs space-y-0.5">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {record.check_in && (
                <span>{new Date(record.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
            {record.work_hours > 0 && (
              <div className="font-medium">
                {record.work_hours.toFixed(1)}h
              </div>
            )}
            <div className="text-xs capitalize truncate">
              {record.status.replace('_', ' ')}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span>Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span>Leave</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days}
        </div>
      </div>
    </div>
  );
};
