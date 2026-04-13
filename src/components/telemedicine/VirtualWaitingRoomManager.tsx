import { useState, useEffect } from 'react';
import { advancedTelemedicineService, VirtualWaitingRoomEntry } from '../../services/advancedTelemedicineService';
import { Clock, User, CheckCircle, AlertCircle, MessageSquare, ArrowUp, Video } from 'lucide-react';

interface VirtualWaitingRoomManagerProps {
  providerId: string;
  onAdmitPatient: (entry: VirtualWaitingRoomEntry) => void;
}

export default function VirtualWaitingRoomManager({
  providerId,
  onAdmitPatient,
}: VirtualWaitingRoomManagerProps) {
  const [waitingRoom, setWaitingRoom] = useState<VirtualWaitingRoomEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWaitingRoom();
    const interval = setInterval(loadWaitingRoom, 10000);
    return () => clearInterval(interval);
  }, [providerId]);

  const loadWaitingRoom = async () => {
    try {
      setLoading(true);
      const data = await advancedTelemedicineService.getWaitingRoom(providerId);
      setWaitingRoom(data);
    } catch (error) {
      console.error('Error loading waiting room:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdmit = async (entry: VirtualWaitingRoomEntry) => {
    try {
      await advancedTelemedicineService.admitPatient(entry.id);
      onAdmitPatient(entry);
      await loadWaitingRoom();
    } catch (error) {
      console.error('Error admitting patient:', error);
    }
  };

  const handlePriorityChange = async (entryId: string, currentPriority: number) => {
    try {
      await advancedTelemedicineService.updatePriority(entryId, currentPriority + 10);
      await loadWaitingRoom();
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const handleSendMessage = async (entryId: string) => {
    const message = prompt('Enter message for patient:');
    if (message) {
      try {
        await advancedTelemedicineService.sendWaitingRoomMessage(entryId, message);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const getWaitTime = (joinedAt: string) => {
    const joined = new Date(joinedAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - joined.getTime()) / 60000);
    return diff;
  };

  if (loading && waitingRoom.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading waiting room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Virtual Waiting Room
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {waitingRoom.length} patient{waitingRoom.length !== 1 ? 's' : ''} waiting
          </p>
        </div>
      </div>

      {waitingRoom.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No patients waiting
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Patients will appear here when they join the waiting room
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {waitingRoom.map((entry) => {
            const waitTime = getWaitTime(entry.joined_at);

            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                        {entry.queue_position}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {(entry as any).patients?.user_profiles?.full_name || 'Unknown Patient'}
                        </h3>
                        {entry.priority_level > 0 && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded text-xs font-semibold">
                            PRIORITY
                          </span>
                        )}
                        {entry.patient_ready && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>Waiting: {waitTime} min</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          {entry.connection_tested ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                          )}
                          <span>
                            {entry.connection_tested ? 'Connection Tested' : 'Not Tested'}
                          </span>
                        </div>

                        {entry.estimated_wait_minutes && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>Est. wait: {entry.estimated_wait_minutes} min</span>
                          </div>
                        )}

                        {(entry as any).appointments?.appointment_type && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Video className="w-4 h-4" />
                            <span className="capitalize">
                              {(entry as any).appointments.appointment_type}
                            </span>
                          </div>
                        )}
                      </div>

                      {entry.notes && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{entry.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleAdmit(entry)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold whitespace-nowrap"
                    >
                      Admit Patient
                    </button>

                    <button
                      onClick={() => handlePriorityChange(entry.id, entry.priority_level)}
                      className="px-4 py-2 border border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <ArrowUp className="w-4 h-4" />
                      Priority
                    </button>

                    <button
                      onClick={() => handleSendMessage(entry.id)}
                      className="px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
