import { useState } from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { PhoneOutgoing, Clock, CheckCircle, XCircle, User } from 'lucide-react';

interface OutgoingCall {
  id: string;
  recipient_name: string;
  recipient_role: string;
  call_type: 'voice' | 'video';
  status: 'pending' | 'connected' | 'declined';
  time: string;
  duration?: string;
}

export default function OutgoingCallsPage() {
  const { currentColors } = useTheme();
  const [outgoingCalls] = useState<OutgoingCall[]>([
    {
      id: '1',
      recipient_name: 'Dr. Michael Chen',
      recipient_role: 'Neurologist',
      call_type: 'video',
      status: 'connected',
      time: '10 minutes ago',
      duration: '15:30',
    },
    {
      id: '2',
      recipient_name: 'Jane Doe',
      recipient_role: 'Patient',
      call_type: 'voice',
      status: 'pending',
      time: 'Just now',
    },
    {
      id: '3',
      recipient_name: 'Dr. Emily Watson',
      recipient_role: 'Pediatrician',
      call_type: 'video',
      status: 'declined',
      time: '1 hour ago',
    },
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'declined':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'declined':
        return 'Declined';
      case 'pending':
        return 'Ringing...';
      default:
        return status;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: currentColors.text }}>
          Outgoing Calls
        </h1>

        {outgoingCalls.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <PhoneOutgoing className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2" style={{ color: currentColors.text }}>
                No Outgoing Calls
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your outgoing calls will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {outgoingCalls.map((call) => (
              <div
                key={call.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: currentColors.primary }}
                    >
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold" style={{ color: currentColors.text }}>
                        {call.recipient_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{call.recipient_role}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500">
                          {call.call_type === 'video' ? 'Video Call' : 'Voice Call'}
                        </p>
                        <span className="text-gray-400">•</span>
                        <p className="text-sm text-gray-500">{call.time}</p>
                        {call.duration && (
                          <>
                            <span className="text-gray-400">•</span>
                            <p className="text-sm text-gray-500">{call.duration}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(call.status)}
                    <span
                      className={`text-sm font-medium ${
                        call.status === 'connected'
                          ? 'text-green-600'
                          : call.status === 'declined'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`}
                    >
                      {getStatusText(call.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
