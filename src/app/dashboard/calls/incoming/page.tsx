import { useState } from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { PhoneIncoming, Phone, X, User } from 'lucide-react';

interface IncomingCall {
  id: string;
  caller_name: string;
  caller_role: string;
  call_type: 'voice' | 'video';
  time: string;
}

export default function IncomingCallsPage() {
  const { currentColors } = useTheme();
  const [incomingCalls, setIncomingCalls] = useState<IncomingCall[]>([
    {
      id: '1',
      caller_name: 'Dr. Sarah Johnson',
      caller_role: 'Cardiologist',
      call_type: 'video',
      time: '2 minutes ago',
    },
    {
      id: '2',
      caller_name: 'John Smith',
      caller_role: 'Patient',
      call_type: 'voice',
      time: '5 minutes ago',
    },
  ]);

  const acceptCall = (id: string) => {
    setIncomingCalls(incomingCalls.filter((call) => call.id !== id));
  };

  const declineCall = (id: string) => {
    setIncomingCalls(incomingCalls.filter((call) => call.id !== id));
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: currentColors.text }}>
          Incoming Calls
        </h1>

        {incomingCalls.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <PhoneIncoming className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2" style={{ color: currentColors.text }}>
                No Incoming Calls
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You will see incoming call requests here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {incomingCalls.map((call) => (
              <div
                key={call.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse-border"
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
                        {call.caller_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{call.caller_role}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {call.call_type === 'video' ? 'Video Call' : 'Voice Call'} • {call.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => declineCall(call.id)}
                      className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition"
                    >
                      <X className="w-6 h-6 text-white" />
                    </button>
                    <button
                      onClick={() => acceptCall(call.id)}
                      className="p-4 rounded-full bg-green-500 hover:bg-green-600 transition"
                    >
                      <Phone className="w-6 h-6 text-white" />
                    </button>
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
