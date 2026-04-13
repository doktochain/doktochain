import React, { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, MapPin, AlertCircle } from 'lucide-react';
import { attendanceService, StaffAttendance } from '../../services/attendanceService';
import { useAuth } from '../../contexts/AuthContext';

export const AttendanceCheckInOut: React.FC = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState<StaffAttendance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    loadTodayAttendance();
    getUserLocation();

    return () => clearInterval(timer);
  }, [user]);

  const loadTodayAttendance = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await attendanceService.getUserAttendanceByDate(user.id, today);
      setTodayAttendance(data);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const getUserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocation('Location unavailable');
        }
      );
    } else {
      setLocation('Location not supported');
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const ipAddress = await fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => data.ip)
        .catch(() => 'Unknown');

      await attendanceService.checkIn(user.id, location, ipAddress);
      await loadTodayAttendance();
    } catch (error: any) {
      setError(error.message || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      await attendanceService.checkOut(user.id);
      await loadTodayAttendance();
    } catch (error: any) {
      setError(error.message || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateWorkHours = () => {
    if (!todayAttendance?.check_in) return '0:00';

    const checkIn = new Date(todayAttendance.check_in);
    const checkOut = todayAttendance.check_out ? new Date(todayAttendance.check_out) : currentTime;
    const diff = checkOut.getTime() - checkIn.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}:${String(minutes).padStart(2, '0')}`;
  };

  const isLate = () => {
    if (!todayAttendance?.check_in) return false;
    const checkIn = new Date(todayAttendance.check_in);
    const workStart = new Date(checkIn);
    workStart.setHours(9, 0, 0, 0);
    return checkIn > workStart;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-900 mb-2">
            {formatTime(currentTime)}
          </div>
          <div className="text-sm text-blue-700">
            {formatDate(currentTime)}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {todayAttendance ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Check In</span>
                </div>
                <div className="text-lg font-bold text-blue-900">
                  {new Date(todayAttendance.check_in!).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {isLate() && (
                <div className="bg-orange-100 border border-orange-200 rounded p-2 text-xs text-orange-800">
                  Marked as late arrival
                </div>
              )}
            </div>

            {todayAttendance.check_out ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <LogOut className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Check Out</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {new Date(todayAttendance.check_out).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                <div className="bg-green-100 border border-green-200 rounded p-3 text-center">
                  <div className="text-xs text-green-700 mb-1">Total Work Hours</div>
                  <div className="text-2xl font-bold text-green-900">
                    {todayAttendance.work_hours.toFixed(2)}h
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Work Hours</span>
                    </div>
                    <div className="text-lg font-bold text-green-900">
                      {calculateWorkHours()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCheckOut}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  {loading ? 'Processing...' : 'Check Out'}
                </button>
              </>
            )}

            {location && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded p-3">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{location}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-1">You haven't checked in today</p>
              <p className="text-sm text-gray-500">Click the button below to start your day</p>
            </div>

            <button
              onClick={handleCheckIn}
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              {loading ? 'Processing...' : 'Check In'}
            </button>

            {location && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded p-3">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{location}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
