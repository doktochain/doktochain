import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { providerService } from '../../../../../services/providerService';
import { advancedTelemedicineService, TelemedicineSession } from '../../../../../services/advancedTelemedicineService';
import { Calendar, Clock, User, Video, CheckCircle, XCircle, FileText } from 'lucide-react';

export default function SessionHistoryPage() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<any>(null);
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<TelemedicineSession | null>(null);

  useEffect(() => {
    loadProviderData();
  }, [user]);

  useEffect(() => {
    if (provider?.id) {
      loadSessions(provider.id);
    }
  }, [provider]);

  const loadProviderData = async () => {
    if (!user) return;

    try {
      const providerData = await providerService.getProviderByUserId(user.id);
      setProvider(providerData);
      if (!providerData) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading provider:', error);
      setLoading(false);
    }
  };

  const loadSessions = async (providerId: string) => {
    setLoading(true);
    try {
      const data = await advancedTelemedicineService.getProviderSessions(providerId);
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: TelemedicineSession['status']) => {
    const styles = {
      waiting: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      active: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      failed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getStatusIcon = (status: TelemedicineSession['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading session history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Session History
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View past telemedicine consultations and recordings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{sessions.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {sessions.filter(s => s.status === 'completed').length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {sessions.length > 0
              ? Math.round(
                  sessions
                    .filter(s => s.duration_minutes)
                    .reduce((acc, s) => acc + (s.duration_minutes || 0), 0) / sessions.length
                )
              : 0}{' '}
            min
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Session History
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Completed telemedicine sessions will appear here
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Features Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {((session as any).patients?.user_profiles?.full_name || 'U')[0]}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {(session as any).patients?.user_profiles?.full_name || 'Unknown Patient'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {session.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        {session.started_at && (
                          <div className="text-sm text-gray-900 dark:text-white">
                            {new Date(session.started_at).toLocaleDateString()}
                          </div>
                        )}
                        {session.started_at && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(session.started_at).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {session.duration_minutes ? `${session.duration_minutes} min` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(session.status)}
                      {getStatusBadge(session.status)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {session.recording_enabled && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded text-xs">
                          Recorded
                        </span>
                      )}
                      {session.screen_sharing_used && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs">
                          Screen Share
                        </span>
                      )}
                      {session.ai_notes_generated && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs">
                          AI Notes
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedSession(session)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSession && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Session Details</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">ID: {selectedSession.id}</p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Patient</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {(selectedSession as any).patients?.user_profiles?.full_name || 'Unknown Patient'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <div>{getStatusBadge(selectedSession.status)}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Started</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedSession.started_at
                      ? new Date(selectedSession.started_at).toLocaleString()
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Ended</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {(selectedSession as any).ended_at
                      ? new Date((selectedSession as any).ended_at).toLocaleString()
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Duration</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedSession.duration_minutes ? `${selectedSession.duration_minutes} min` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Connection Quality</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {(selectedSession as any).connection_quality || '—'}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-xs text-gray-500 uppercase mb-2">Features Used</p>
                <div className="flex flex-wrap gap-2">
                  {selectedSession.recording_enabled && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Recorded</span>
                  )}
                  {selectedSession.screen_sharing_used && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Screen Share</span>
                  )}
                  {selectedSession.ai_notes_generated && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">AI Notes</span>
                  )}
                  {!selectedSession.recording_enabled &&
                    !selectedSession.screen_sharing_used &&
                    !selectedSession.ai_notes_generated && (
                      <span className="text-sm text-gray-500">No special features used.</span>
                    )}
                </div>
              </div>

              {(selectedSession as any).notes && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-xs text-gray-500 uppercase mb-2">Notes</p>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {(selectedSession as any).notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
